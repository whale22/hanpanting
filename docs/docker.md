# Windows 11에서 Docker로 실행하기

이 구성은 Docker Desktop의 Linux 컨테이너 모드를 기준으로 합니다.

- `app`: Ubuntu 24.04 기반 이미지에 Node.js 22, nginx, 애플리케이션을 포함합니다.
- `mongo`: 공식 MongoDB 8.0.30 Ubuntu Noble 이미지입니다.
- Windows의 `3000` 포트는 `app` 컨테이너의 nginx `3000` 포트에 연결됩니다.
- nginx는 같은 컨테이너의 Node.js 서버 `3001` 포트로 요청을 전달합니다.
- MongoDB는 외부 포트를 열지 않고 Docker 내부 네트워크에서만 접근합니다.
- MongoDB의 `/data/db`는 Windows 경로에 bind mount하므로 컨테이너를 다시 만들어도 데이터가 남습니다.

## 1. 준비

Windows 11에 Docker Desktop을 설치하고 Linux containers 모드로 실행합니다. PowerShell에서 프로젝트 루트로 이동한 다음 Docker용 환경 파일을 만듭니다.

```powershell
Copy-Item .env.docker.example .env.docker
```

`.env.docker`에서 다음 두 값을 반드시 확인합니다.

```dotenv
MONGODB_DATA_PATH=C:/docker-data/hanpanting/mongodb
BETTER_AUTH_SECRET=충분히-길고-예측하기-어려운-32자-이상-문자열
```

`MONGODB_DATA_PATH`는 Docker Desktop과 공유할 수 있는 Windows의 절대 경로여야 합니다. 경로에는 역슬래시(`\`) 대신 슬래시(`/`)를 쓰는 편이 안전합니다. 디렉터리를 미리 만들려면 다음 명령을 사용합니다.

```powershell
New-Item -ItemType Directory -Force C:\docker-data\hanpanting\mongodb
```

`.env.docker`는 Git에서 제외됩니다. 인증 비밀값을 이미지나 `compose.yaml`에 직접 적지 마세요.

## 2. 이미지 빌드와 실행

현재 디렉터리의 프로젝트가 이미지에 복사되고, 빌드 중 `npm ci`가 실행됩니다.

```powershell
docker compose --env-file .env.docker build
docker compose --env-file .env.docker up -d
```

상태와 로그를 확인합니다.

```powershell
docker compose --env-file .env.docker ps
docker compose --env-file .env.docker logs -f app
```

브라우저에서 `http://localhost:3000`을 엽니다. 상태 확인은 다음 명령으로 할 수 있습니다.

```powershell
Invoke-RestMethod http://localhost:3000/health
```

정상 응답은 `status` 값이 `ok`입니다.

## 3. 개발 Seed 실행

MongoDB와 앱이 실행 중일 때 다음 명령을 사용합니다.

```powershell
docker compose --env-file .env.docker exec app npm run seed
```

Seed 명령은 개발 DB의 기존 애플리케이션 데이터를 지우고 다시 만듭니다. 필요한 경우에만 실행하세요.

## 4. 중지, 재실행, 재빌드

컨테이너를 중지하거나 다시 시작합니다.

```powershell
docker compose --env-file .env.docker stop
docker compose --env-file .env.docker start
docker compose --env-file .env.docker restart
```

소스나 Docker 설정이 바뀌면 이미지를 다시 만들고 컨테이너를 교체합니다.

```powershell
docker compose --env-file .env.docker up -d --build
```

패키지 설치를 포함해 캐시 없이 완전히 다시 빌드하려면 다음을 사용합니다.

```powershell
docker compose --env-file .env.docker build --no-cache
docker compose --env-file .env.docker up -d --force-recreate
```

## 5. 컨테이너와 이미지 삭제

컨테이너와 Docker 내부 네트워크만 삭제합니다.

```powershell
docker compose --env-file .env.docker down
```

앱 이미지까지 삭제합니다.

```powershell
docker compose --env-file .env.docker down --rmi local
```

MongoDB 데이터는 Windows의 `MONGODB_DATA_PATH`에 있으므로 위 명령으로 삭제되지 않습니다. 데이터를 정말 초기화하려면 컨테이너를 먼저 내린 뒤 `.env.docker`에 지정한 정확한 디렉터리의 내용을 별도로 백업하거나 삭제해야 합니다. 데이터 경로 삭제는 되돌리기 어려우므로 이 문서에는 자동 삭제 명령을 두지 않습니다.

## 6. Windows 호스트의 Codex CLI 연결

Windows용 `codex.exe`는 Linux 컨테이너에서 직접 실행할 수 없습니다. 또한 Windows의 Codex 인증 폴더 전체를 컨테이너에 mount하면 토큰과 개인 설정이 노출됩니다. 이 저장소는 대신 네트워크 포트를 열지 않는 파일 기반 중계기를 제공합니다.

중계 동작은 다음과 같습니다.

1. 컨테이너의 `codex` 명령이 공유 폴더에 요청 파일을 만듭니다.
2. 사용자가 Windows에서 명시적으로 실행한 중계기가 호스트의 `codex.exe`를 프로젝트 루트에서 실행합니다.
3. 실행 결과를 공유 폴더로 돌려주면 컨테이너의 명령이 종료됩니다.

호스트 PowerShell에서 먼저 Codex 로그인 상태를 확인합니다.

```powershell
codex login status
```

새 PowerShell 창을 열어 프로젝트 루트에서 중계기를 실행하고 그 창을 계속 열어 둡니다.

```powershell
pwsh -File .\scripts\codex-host-bridge.ps1
```

다른 PowerShell 창에서 컨테이너를 실행한 뒤 연결을 확인합니다.

```powershell
docker compose --env-file .env.docker exec app codex --version
docker compose --env-file .env.docker exec app codex login status
```

CI 형태의 비대화형 작업은 `codex exec`를 사용합니다.

```powershell
docker compose --env-file .env.docker exec app codex exec "현재 프로젝트를 읽고 요약해 줘"
```

중요한 제약이 있습니다.

- 호스트 중계기는 실행 중인 동안에만 요청을 처리합니다.
- 대화형 Codex TUI와 컨테이너 안에서의 `codex login`은 지원하지 않습니다.
- 중계기는 `CODEX_CI=1`로 호스트 Codex를 실행합니다.
- Codex의 실제 작업 디렉터리는 Windows의 현재 저장소입니다. 이미지 안의 복사본을 직접 수정하지 않습니다.
- Codex가 호스트 파일을 바꾸면 `docker compose --env-file .env.docker up -d --build`로 이미지를 다시 만들어야 컨테이너에 반영됩니다.
- 컨테이너에 코드 실행 권한이 있는 사용자는 중계기가 켜진 동안 호스트 Codex에 비대화형 작업을 요청할 수 있습니다. 신뢰하는 로컬 개발 컨테이너에서만 사용하고, 사용 후 중계기 창에서 `Ctrl+C`로 종료하세요.
- 공유 폴더에는 프롬프트와 출력이 일시적으로 기록될 수 있습니다. `.docker/`는 Git에서 제외되며, 민감한 프롬프트는 사용하지 않는 것이 좋습니다.

[OpenAI 공식 Codex 인증 문서](https://learn.chatgpt.com/docs/auth)도 자동화에는 API 키 인증을 기본 권장 방식으로 안내합니다. 장기 실행 CI/CD라면 호스트 로그인 세션 중계보다 별도 제한된 API 키 또는 조직에서 제공하는 단기 자격 증명을 사용하는 편이 적합합니다. 이 프로젝트의 중계기는 Windows 로컬 개발에서 기존 호스트 로그인을 재사용하기 위한 선택적 도구입니다.

## 7. 문제 해결

### `docker` 명령을 찾을 수 없음

Docker Desktop 설치와 실행 상태를 확인한 뒤 PowerShell을 새로 엽니다.

### 앱이 `unhealthy` 상태임

두 서비스의 로그를 확인합니다.

```powershell
docker compose --env-file .env.docker logs app
docker compose --env-file .env.docker logs mongo
```

대부분은 `BETTER_AUTH_SECRET` 길이, Windows 데이터 경로 공유 권한, MongoDB 시작 지연 문제입니다.

### Codex 중계 응답 시간이 초과됨

호스트에서 `scripts/codex-host-bridge.ps1`이 실행 중인지, `.env.docker`의 `CODEX_BRIDGE_PATH`와 중계기의 공유 경로가 같은지 확인합니다. 기본값을 바꿨다면 중계기에도 같은 경로를 지정합니다.

```powershell
pwsh -File .\scripts\codex-host-bridge.ps1 -BridgePath "C:\docker-data\hanpanting\codex-bridge"
```
