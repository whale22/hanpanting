import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const bridgeDirectory = process.env.CODEX_BRIDGE_DIR ?? "/var/run/codex-bridge";
const timeoutMilliseconds = Number(process.env.CODEX_BRIDGE_TIMEOUT_MS ?? 3_600_000);
const requestId = randomUUID();
const requestsDirectory = path.join(bridgeDirectory, "requests");
const responsesDirectory = path.join(bridgeDirectory, "responses");
const temporaryRequestPath = path.join(bridgeDirectory, `${requestId}.tmp`);
const requestPath = path.join(requestsDirectory, `${requestId}.json`);
const responsePath = path.join(responsesDirectory, `${requestId}.json`);

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function readStandardInput() {
  if (process.stdin.isTTY) {
    return "";
  }

  const chunks = [];

  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

async function waitForResponse() {
  const deadline = Date.now() + timeoutMilliseconds;

  while (Date.now() < deadline) {
    try {
      return JSON.parse(await readFile(responsePath, "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }

    await sleep(250);
  }

  throw new Error(
    "Windows Codex 중계기의 응답 시간이 초과되었습니다. 호스트에서 scripts/codex-host-bridge.ps1을 실행했는지 확인하세요."
  );
}

await mkdir(requestsDirectory, { recursive: true });
await mkdir(responsesDirectory, { recursive: true });

const request = {
  version: 1,
  id: requestId,
  arguments: process.argv.slice(2),
  standardInput: await readStandardInput(),
  createdAt: new Date().toISOString()
};

await writeFile(temporaryRequestPath, JSON.stringify(request), { mode: 0o600 });
await rename(temporaryRequestPath, requestPath);

try {
  const response = await waitForResponse();

  if (response.standardOutput) {
    process.stdout.write(response.standardOutput);
  }

  if (response.standardError) {
    process.stderr.write(response.standardError);
  }

  process.exitCode = Number.isInteger(response.exitCode) ? response.exitCode : 1;
} finally {
  await rm(requestPath, { force: true });
  await rm(responsePath, { force: true });
}
