# 한판팅 기초 설계

이 문서는 현재 기초 프로젝트가 보장하는 범위와 이후 매칭·채팅 구현에서
지켜야 할 데이터 계약을 정리합니다. `DATABASE-SKELETON.md`의 필드 의도는
반영하되, 그 문서에서 잘린 `Conversation`과 `Message` 예시는 아래 계약으로
보완했습니다.

## 현재 구현 범위

- Node.js 기본 HTTP 서버와 요청 시점 React 서버 렌더링
- Vite를 통한 JSX 변환과 서버용 화면 번들 생성
- Simple.css와 최소한의 서비스 전용 레이아웃 CSS
- MongoDB 연결과 활성 토론 주제 조회
- Better Auth 이메일·비밀번호 가입, 로그인, 로그아웃
- 개발 DB에만 실행되는 Seed와 필수 인덱스
- 입력 검증, 동일 출처 폼 검사, 기본 보안 응답 헤더

매칭 요청 생성, 사용자 선점, 대화방 생성, 실시간 메시지 전송, 10분 유휴 종료,
최근 7일 이력 화면은 아직 구현하지 않았습니다. 첫 화면의 비활성화된 매칭
버튼이 이후 구현 지점입니다.

## 서버 흐름

```text
브라우저 폼 또는 페이지 요청
→ server.js 경로 분기
→ lib의 데이터 준비와 인증·조회 함수
→ Vite로 변환한 app의 JSX 페이지
→ MongoDB
```

프레임워크 전용 Server Component와 Server Action은 사용하지 않습니다.
대신 Node.js 서버가 요청 데이터를 준비한 뒤 JSX 페이지를 서버에서 HTML로
렌더링합니다. 입력 변경은 일반 HTML `<form>` POST 요청을 Node.js 서버에서
다시 검증합니다.

## 컬렉션 계약

### Better Auth 관리 컬렉션

`user`, `session`, `account`, `verification`은 Better Auth가 관리합니다. 비밀번호
해시는 `user.passwordHash`가 아니라 Better Auth의 `account` 문서에 저장됩니다.
`user`에는 애플리케이션이 소유하는 다음 추가 필드가 있습니다.

- `role`: `USER` 또는 `ADMIN`, 기본값 `USER`
- `status`: `ONLINE`, `WAITING`, `ACTIVE`, `SUSPENDED`
- `lastLoginAt`: 마지막 로그인 시각, 선택 값

이 필드는 가입 입력으로 변경할 수 없는 서버 소유 필드입니다.

### topics

```text
_id: ObjectId
title: string
options: [{ code: string, label: string }]
status: ACTIVE | CLOSED
startsAt?: Date
expiresAt?: Date
createdAt: Date
updatedAt: Date
```

### matchRequests — 이후 매칭 구현용

```text
_id: ObjectId
userId: string
topicId: string
stance: string
matchType: SAME | OPPOSITE
status: WAITING | MATCHED | CANCELLED | EXPIRED
conversationId?: string
createdAt: Date
updatedAt: Date
```

대기 요청 선점은 MongoDB의 조건부 `findOneAndUpdate` 한 번으로 처리해야 합니다.
사용자 상태와 대기 요청을 함께 바꿔야 하는 흐름에는 MongoDB 트랜잭션을
사용합니다.

### conversations — 이후 채팅 구현용

```text
_id: ObjectId
topicId: string
matchType: SAME | OPPOSITE
participants: [{
  userId: string,
  stance: string,
  anonymousName: string,
  avatarCode: string,
  joinedAt: Date,
  leftAt?: Date
}]
status: ACTIVE | ENDED
lastMessageAt?: Date
endedAt?: Date
endReason?: IDLE | LEFT | MODERATION | SYSTEM | BLOCKED
blockedUserId?: string
createdAt: Date
updatedAt: Date
```

### blocks

```text
_id: ObjectId
blockerUserId: string
blockedUserId: string
conversationId: string
createdAt: Date
updatedAt: Date
```

차단은 계정 전체 상태인 `SUSPENDED`와 분리해 관리합니다. 두 사용자 사이에 어느
방향으로든 차단 관계가 있으면 서로 매칭하지 않고 메시지와 입력 상태도 전달하지
않습니다.

### messages — 이후 채팅 구현용

```text
_id: ObjectId
conversationId: string
senderUserId: string
content: string (1~2000자, trim 적용)
createdAt: Date
```

MongoDB의 문서 `_id`는 ObjectId를 사용하지만, 컬렉션 사이의 Foreign Key 값은
Better Auth의 사용자 ID와 일관되게 문자열로 저장합니다. 클라이언트에 메시지를
보낼 때는 `senderUserId`를 제거하고 대화방 참여자의 익명 이름과 아바타만
노출해야 합니다.

## 이후 구현 시 지켜야 할 경계

- 자기 자신, 이미 같은 주제에서 만난 사용자, 다른 매칭·대화 중인 사용자를 제외
- `SAME`과 `OPPOSITE` 대기열 조건을 분리
- 한 사용자가 동시에 여러 대화방에 들어가지 않도록 원자적으로 선점
- 메시지는 텍스트만 허용하고 서버에서 길이·권한·대화방 참여 여부 재검증
- 마지막 메시지 이후 10분이 지나면 대화를 종료
- 사용자 화면의 대화 이력은 최근 7일만 조회
- 반복 매칭 요청과 메시지 도배에 서버 측 제한 적용
