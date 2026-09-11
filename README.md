# 한판팅 (HanpanTing)

한판팅은 사회·정치 이슈에 대해 같은 입장 또는 다른 입장의 사용자와
익명으로 대화하는 1:1 서비스입니다. 현재 저장소에는 매칭·실시간 채팅을
구현하기 전 단계의 실행 가능한 토대가 들어 있습니다.

## 사용 기술

- Node.js 20.19 이상
- React 19
- Simple.css
- MongoDB
- Better Auth

Next.js, Express, Redis, 별도 프런트엔드 빌드 도구는 사용하지 않습니다.
Node.js 기본 HTTP 서버가 요청마다 React 화면을 서버에서 렌더링합니다.

## 현재 준비된 기능

- 이메일·비밀번호 가입, 로그인, 로그아웃
- MongoDB 연결 및 활성 토론 주제 조회
- 같은 편·반대편 선택을 포함한 매칭 화면 토대
- 대화방마다 익명 이름과 아바타를 사용하기 위한 데이터 계약
- 개발용 주제와 계정을 만드는 안전한 Seed
- 기본 입력 검증, 보안 헤더, 동일 출처 폼 검사

매칭 로직, 실시간 메시지 전송, 10분 유휴 종료, 최근 7일 대화 이력은 아직
구현하지 않았습니다. 상세 데이터 구조와 구현 경계는 `docs/README.md`를
확인하세요.

## 실행 준비

패키지를 설치합니다.

```bash
npm install
```

`.env.example`을 복사해 프로젝트 루트에 `.env.local`을 만들고 값을 설정합니다.

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/hanpanting_dev
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=32자-이상의-예측하기-어려운-문자열
SEED_PASSWORD=Seed1234!
PORT=3000
```

`.env.local`은 저장소에 커밋되지 않습니다. 운영 환경에서는 충분히 긴 인증
비밀값과 제한된 MongoDB 네트워크 접근 범위를 사용하세요.

## Seed 데이터 준비

로컬 MongoDB를 실행한 뒤 다음 명령으로 개발 데이터를 만듭니다.

```bash
npm run seed
```

Seed는 DB 이름에 `dev`, `test`, `local`, `seed` 중 하나가 포함된 경우에만
실행됩니다. 대상 개발 DB의 기존 한판팅 컬렉션을 비우고 다음 데이터를 만듭니다.

- 일반 사용자: `user01@seed.local` ~ `user05@seed.local`
- 관리자: `admin01@seed.local`
- 찬성·반대 선택이 있는 예시 토론 주제 3개

비밀번호는 `.env.local`의 `SEED_PASSWORD` 값입니다.

## 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다. 환경 변수가
아직 없더라도 서버와 화면은 열리며 필요한 설정을 안내합니다. 상태 확인 주소는
`/health`입니다. DB를 변경하지 않고 매칭 화면 예시만 확인하려면
`http://localhost:3000/?preview=1`을 사용합니다.

## 주요 명령

```bash
npm run dev     # 파일 변경을 감지하는 개발 서버
npm start       # 일반 서버 실행
npm test        # 기본 단위 테스트
npm run lint    # 코드 검사
npm run build   # 모든 JavaScript 파일 문법 검사
npm run seed    # 개발 DB 초기 데이터 재생성
```

## 프로젝트 구조

```text
app/             React 페이지와 폼 처리
lib/             인증, MongoDB, 조회, 입력 검증
public/          Simple.css를 보완하는 최소 CSS와 파비콘
scripts/         Seed와 소스 검사
test/            Node.js 기본 테스트
server.js        HTTP 경로 분기와 React 서버 렌더링 진입점
```

인증용 컬렉션은 Better Auth가 관리합니다. 서비스 데이터의 `_id`는 MongoDB
ObjectId를 사용하고, 컬렉션 사이의 Foreign Key는 문자열로 저장합니다.
