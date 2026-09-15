# Docker Ubuntu 24.04 실행 안내

이 구성은 현재 프로젝트 소스를 이미지 안의 `/app`으로 복사하고 `npm ci`로
패키지를 설치합니다. 하나의 Ubuntu 24.04 컨테이너 안에서 다음 프로세스를
실행합니다.

```text
Windows 11의 http://localhost:3000
  → 컨테이너 nginx :3000
  → Node.js 앱 :3001
  → MongoDB :27017 (컨테이너 내부에서만 접근)
```

MongoDB 데이터 디렉터리 `/var/lib/mongodb`는 Windows 호스트 디렉터리에
연결합니다. 따라서 컨테이너를 삭제하거나 이미지를 다시 빌드해도 같은 호스트
디렉터리를 연결하면 데이터가 유지됩니다.

## 준비 사항

- Windows 11에 Docker Desktop 설치
- Docker Desktop에서 Linux containers 사용
- 아래 명령은 PowerShell에서 프로젝트 루트로 이동한 뒤 실행

```powershell
cd C:\Users\user\Desktop\dongbu\hanpanting
docker version
```

## 이미지 빌드

이미지 이름과 태그를 `hanpanting:ubuntu24.04`로 지정합니다.
Compose의 `up --build` 명령을 사용할 때는 이 단계를 별도로 실행하지 않아도
됩니다.

```powershell
docker build --pull --tag hanpanting:ubuntu24.04 .
```

소스 또는 `package-lock.json`, Docker 설정이 바뀌면 같은 명령으로 이미지를
다시 빌드합니다. 빌드 시 `.dockerignore`에 따라 로컬 `node_modules`, Git 정보,
로그, `.env.local` 등의 비밀 설정은 이미지에 복사되지 않습니다.

설치 버전을 확인하려면 다음 명령을 실행합니다.

```powershell
docker run --rm --entrypoint bash hanpanting:ubuntu24.04 -c "node --version && npm --version && mongod --version && nginx -v"
```

## 최초 실행 준비

아래 예시는 MongoDB 데이터를 `C:\docker-data\hanpanting\mongodb`에 저장합니다.
원하는 다른 Windows 절대 경로를 사용해도 됩니다.

```powershell
$mongoDataPath = "C:\docker-data\hanpanting\mongodb"
New-Item -ItemType Directory -Force -Path $mongoDataPath
```

MongoDB 경로와 인증 비밀값은 최초 한 번 프로젝트 루트의 `.env.docker`에
저장합니다. 이 파일은 기존 `.gitignore` 규칙에 의해 Git에 포함되지 않습니다.
컨테이너를 삭제한 뒤 다시 만들 때에도 같은 인증 비밀값을 사용해야 기존 로그인
세션을 유지할 수 있습니다. Compose에서 사용하는 Windows 경로는 아래처럼
슬래시(`/`)로 작성합니다.

```powershell
$authSecret = [guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")
@"
MONGODB_DATA_PATH=C:/docker-data/hanpanting/mongodb
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=$authSecret
"@ | Set-Content -Encoding ascii .env.docker
```

외부 도메인이나 포트로 서비스할 때는 `BETTER_AUTH_URL`을 사용자가 브라우저에서
접속하는 실제 주소로 바꿉니다.

## Docker Compose로 실행

프로젝트의 기본 실행 방법입니다. `docker-compose.yml`이 이미지 빌드, 포트,
환경 변수, MongoDB 데이터 연결 경로와 재시작 정책을 관리합니다.

먼저 환경 변수와 최종 Compose 구성이 올바른지 확인합니다.

```powershell
docker compose --env-file .env.docker config
```

```powershell
docker compose --env-file .env.docker up --detach --build
```

실행 상태와 로그를 확인합니다.

```powershell
docker compose --env-file .env.docker ps
docker compose --env-file .env.docker logs --follow
```

로그 보기를 끝내려면 `Ctrl+C`를 누릅니다. 이는 컨테이너를 중지하지 않습니다.

컨테이너를 중지했다가 다시 시작하거나 재시작합니다.

```powershell
docker compose --env-file .env.docker stop
docker compose --env-file .env.docker start
docker compose --env-file .env.docker restart
```

컨테이너를 삭제하려면 다음 명령을 사용합니다. 호스트에 직접 연결한 MongoDB
데이터 디렉터리는 삭제되지 않습니다.

```powershell
docker compose --env-file .env.docker down
```

소스 변경 후 이미지를 다시 빌드하고 컨테이너를 교체합니다.

```powershell
docker compose --env-file .env.docker up --detach --build
```

개발용 Seed는 실행 중인 Compose 서비스에서 다음과 같이 실행합니다.

```powershell
docker compose --env-file .env.docker exec --env "SEED_PASSWORD=Seed1234!" app npm run seed
```

## docker run으로 직접 실행

Compose를 사용하지 않을 때는 다음 명령으로 컨테이너를 직접 생성할 수 있습니다.

PowerShell 창을 새로 열었다면 데이터 경로 변수를 먼저 다시 지정합니다.

```powershell
$mongoDataPath = "C:\docker-data\hanpanting\mongodb"

docker run --detach `
  --name hanpanting `
  --restart unless-stopped `
  --publish 3000:3000 `
  --mount "type=bind,source=$mongoDataPath,target=/var/lib/mongodb" `
  --env-file .env.docker `
  hanpanting:ubuntu24.04
```

`--publish 3000:3000`은 Windows 호스트 3000번 포트를 컨테이너의 nginx 3000번
포트에 연결합니다. MongoDB 포트는 따로 공개하지 않습니다.

실행 상태와 상태 확인 응답을 확인합니다.

```powershell
docker ps --filter "name=hanpanting"
docker inspect --format "{{.State.Health.Status}}" hanpanting
curl.exe http://localhost:3000/health
```

정상 응답은 `{"status":"ok"}`입니다. 첫 시작에는 MongoDB 초기화 때문에
상태가 잠시 `starting`일 수 있습니다. 애플리케이션은
[http://localhost:3000](http://localhost:3000)에서 확인합니다.

## 로그와 컨테이너 내부 상태 확인

```powershell
docker logs --follow hanpanting
docker exec hanpanting supervisorctl -c /etc/supervisor/conf.d/hanpanting.conf status
docker exec hanpanting mongosh mongodb://127.0.0.1:27017/hanpanting_dev --eval "db.runCommand({ ping: 1 })"
```

## 개발용 초기 데이터 생성

Seed는 `hanpanting_dev` 데이터베이스의 기존 서비스 데이터를 비운 뒤 다시
만드므로 필요한 경우에만 실행합니다.

```powershell
docker exec --env "SEED_PASSWORD=Seed1234!" hanpanting npm run seed
```

## 중지, 시작, 재시작

컨테이너를 중지해도 컨테이너와 MongoDB 호스트 데이터는 남아 있습니다.

```powershell
docker stop hanpanting
docker start hanpanting
docker restart hanpanting
```

## 컨테이너 삭제 후 재실행

실행 중인 컨테이너를 중지하고 삭제합니다. 이 명령은 연결된 Windows MongoDB
데이터 디렉터리를 삭제하지 않습니다.

```powershell
docker stop hanpanting
docker rm hanpanting
```

같은 데이터 경로와 `.env.docker`를 사용하여 다시 생성하면 기존 DB 데이터를
그대로 사용합니다.

```powershell
$mongoDataPath = "C:\docker-data\hanpanting\mongodb"

docker run --detach `
  --name hanpanting `
  --restart unless-stopped `
  --publish 3000:3000 `
  --mount "type=bind,source=$mongoDataPath,target=/var/lib/mongodb" `
  --env-file .env.docker `
  hanpanting:ubuntu24.04
```

## 소스 변경 후 이미지와 컨테이너 교체

현재 구성은 실행 중인 컨테이너에 Windows 소스를 실시간 연결하지 않습니다.
소스 변경분을 반영하려면 이미지를 다시 빌드하고 컨테이너만 교체합니다.

```powershell
docker build --pull --tag hanpanting:ubuntu24.04 .
docker stop hanpanting
docker rm hanpanting

$mongoDataPath = "C:\docker-data\hanpanting\mongodb"

docker run --detach `
  --name hanpanting `
  --restart unless-stopped `
  --publish 3000:3000 `
  --mount "type=bind,source=$mongoDataPath,target=/var/lib/mongodb" `
  --env-file .env.docker `
  hanpanting:ubuntu24.04
```

## 이미지 삭제

이미지를 삭제하기 전에 해당 이미지를 사용하는 컨테이너를 먼저 삭제해야
합니다. Windows 호스트의 MongoDB 데이터는 이미지와 별개이므로 유지됩니다.

```powershell
docker image rm hanpanting:ubuntu24.04
```

MongoDB 데이터까지 완전히 초기화하려면 컨테이너를 먼저 중지·삭제한 뒤
`C:\docker-data\hanpanting\mongodb`의 내용을 직접 삭제해야 합니다. 이 작업은
복구할 수 없으므로 백업 여부와 경로를 반드시 확인한 후 수행합니다.

## 주요 파일

```text
Dockerfile                 Ubuntu 및 서비스 설치, npm ci, Vite 빌드, 상태 확인
docker-compose.yml         빌드, 포트, 환경 변수, 데이터 경로와 재시작 정책
.dockerignore              이미지 빌드에서 제외할 로컬 파일
docker/entrypoint.sh       필수 환경 변수와 데이터 경로 준비
docker/mongod.conf         MongoDB 내부 전용 연결과 데이터 경로
docker/nginx.conf          호스트 요청을 Node.js로 전달
docker/supervisord.conf    MongoDB, Node.js, nginx 프로세스 시작 및 재시작
```
