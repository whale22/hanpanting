param(
    [string]$BridgePath = ".docker/codex-bridge"
)

$ErrorActionPreference = "Stop"
$projectPath = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$bridgePathFromProject = if ([System.IO.Path]::IsPathRooted($BridgePath)) {
    $BridgePath
} else {
    Join-Path $projectPath $BridgePath
}
$resolvedBridgePath = [System.IO.Path]::GetFullPath($bridgePathFromProject)
$requestsPath = Join-Path $resolvedBridgePath "requests"
$processingPath = Join-Path $resolvedBridgePath "processing"
$responsesPath = Join-Path $resolvedBridgePath "responses"
$codexCommand = Get-Command codex -CommandType Application -ErrorAction Stop

New-Item -ItemType Directory -Force $requestsPath, $processingPath, $responsesPath | Out-Null

Write-Host "Codex 호스트 중계기를 시작했습니다."
Write-Host "프로젝트: $projectPath"
Write-Host "공유 경로: $resolvedBridgePath"
Write-Host "종료하려면 Ctrl+C를 누르세요."

while ($true) {
    $requestFiles = Get-ChildItem -LiteralPath $requestsPath -Filter "*.json" -File

    foreach ($requestFile in $requestFiles) {
        $processingFile = Join-Path $processingPath $requestFile.Name

        try {
            Move-Item -LiteralPath $requestFile.FullName -Destination $processingFile
        } catch {
            continue
        }

        $request = Get-Content -Raw -LiteralPath $processingFile | ConvertFrom-Json
        $responseFile = Join-Path $responsesPath $requestFile.Name
        $arguments = @($request.arguments)
        $supportedRequest =
            ($arguments.Count -gt 0 -and $arguments[0] -in @("exec", "e", "--version", "-V", "--help", "help", "doctor")) -or
            ($arguments.Count -eq 2 -and $arguments[0] -eq "login" -and $arguments[1] -eq "status")

        if (-not $supportedRequest) {
            $response = @{
                exitCode = 2
                standardOutput = ""
                standardError = "호스트 중계기는 비대화형 codex exec와 진단 명령만 허용합니다.`n"
            }
        } else {
            $stdoutFile = Join-Path $processingPath "$($request.id).stdout"
            $stderrFile = Join-Path $processingPath "$($request.id).stderr"
            $previousCodexCi = $env:CODEX_CI

            try {
                $env:CODEX_CI = "1"
                Push-Location $projectPath

                try {
                    if ([string]::IsNullOrEmpty($request.standardInput)) {
                        & $codexCommand.Source @arguments 1> $stdoutFile 2> $stderrFile
                    } else {
                        $request.standardInput | & $codexCommand.Source @arguments 1> $stdoutFile 2> $stderrFile
                    }
                    $exitCode = $LASTEXITCODE
                } finally {
                    Pop-Location
                }

                $response = @{
                    exitCode = $exitCode
                    standardOutput = if (Test-Path $stdoutFile) { Get-Content -Raw -LiteralPath $stdoutFile } else { "" }
                    standardError = if (Test-Path $stderrFile) { Get-Content -Raw -LiteralPath $stderrFile } else { "" }
                }
            } catch {
                $response = @{
                    exitCode = 1
                    standardOutput = ""
                    standardError = "$($_.Exception.Message)`n"
                }
            } finally {
                $env:CODEX_CI = $previousCodexCi
                Remove-Item -LiteralPath $stdoutFile, $stderrFile -Force -ErrorAction SilentlyContinue
            }
        }

        $temporaryResponseFile = "$responseFile.tmp"
        $response | ConvertTo-Json -Compress | Set-Content -LiteralPath $temporaryResponseFile -Encoding utf8
        Move-Item -LiteralPath $temporaryResponseFile -Destination $responseFile -Force
        Remove-Item -LiteralPath $processingFile -Force
    }

    Start-Sleep -Milliseconds 250
}
