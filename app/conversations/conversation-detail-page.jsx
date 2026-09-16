const messageTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Seoul"
});

function isValidDate(date) {
  return date instanceof Date && !Number.isNaN(date.getTime());
}

function formatMessageTime(createdAt) {
  return isValidDate(createdAt)
    ? messageTimeFormatter.format(createdAt)
    : "시간 정보 없음";
}

function getMessageDateTime(createdAt) {
  return isValidDate(createdAt) ? createdAt.toISOString() : undefined;
}

function findParticipant(conversation, userId) {
  return conversation.participants.find(
    (participant) => participant.userId === userId
  );
}

function MessageItem({ conversation, message, userId }) {
  if (message.type === "SYSTEM") {
    return (
      <li
        className="message-item system-message"
        data-message-id={String(message._id)}
      >
        <div className="message-body">
          <p className="message-meta">
            <strong>{message.senderName ?? "시스템"}</strong>
            <time dateTime={getMessageDateTime(message.createdAt)}>
              {formatMessageTime(message.createdAt)}
            </time>
          </p>
          <p className="message-content">{message.content}</p>
        </div>
      </li>
    );
  }

  const sender = findParticipant(conversation, message.senderUserId);
  const isMyMessage = message.senderUserId === userId;
  const senderName = isMyMessage
    ? "나"
    : sender?.anonymousName ?? "익명 사용자";

  return (
    <li
      className={isMyMessage ? "message-item my-message" : "message-item"}
      data-message-id={String(message._id)}
    >
      <div
        className="message-avatar"
        title={sender?.avatarCode ?? "기본 프로필"}
      >
        {senderName.slice(0, 1)}
      </div>
      <div className="message-body">
        <p className="message-meta">
          <strong>{senderName}</strong>
          <time dateTime={getMessageDateTime(message.createdAt)}>
            {formatMessageTime(message.createdAt)}
          </time>
        </p>
        <p className="message-content">{message.content}</p>
      </div>
    </li>
  );
}

export function ConversationTranscript({ conversation, messages, topicTitle, userId }) {
  const otherParticipant = conversation.participants.find(
    (participant) => participant.userId !== userId
  );
  const matchTypeLabel = conversation.matchType === "SAME"
    ? "같은 입장"
    : "다른 입장";
  const statusLabel = conversation.status === "ACTIVE"
    ? "대화 중"
    : "종료된 대화";
  const isActive = conversation.status === "ACTIVE";

  return (
    <section
      className="conversation-detail-page"
      data-conversation-id={String(conversation._id)}
      data-realtime-chat={isActive ? "true" : undefined}
    >
      <a href="/conversations" className="back-link">← 대화방 목록</a>
      <p className="eyebrow" data-conversation-status>{statusLabel}</p>
      <h1>{topicTitle ?? "종료된 주제"}</h1>
      <p className="conversation-summary">
        {otherParticipant?.anonymousName ?? "익명 사용자"} · {matchTypeLabel}
      </p>

      {isActive ? (
        <form
          action={`/conversations/${String(conversation._id)}/end`}
          className="chat-end-form"
          data-end-chat-form
          method="post"
        >
          <button type="submit" className="secondary">채팅 종료하기</button>
        </form>
      ) : null}

      {messages.length === 0 ? (
        <p className="empty-message" data-empty-message>
          아직 메시지가 없습니다. 먼저 인사를 건네 보세요.
        </p>
      ) : (
        <ol
          className="message-list"
          aria-label="저장된 대화 내용"
          data-message-list
        >
          {messages.map((message) => (
            <MessageItem
              conversation={conversation}
              key={String(message._id)}
              message={message}
              userId={userId}
            />
          ))}
        </ol>
      )}

      {isActive ? (
        <p
          aria-live="polite"
          className="typing-indicator"
          data-typing-indicator
          hidden
        >
          상대방이 입력 중입니다…
        </p>
      ) : null}

      {isActive ? (
        <form
          action={`/conversations/${String(conversation._id)}/messages`}
          className="chat-form"
          data-chat-form
          method="post"
        >
          <label htmlFor="chat-content">메시지</label>
          <textarea
            aria-describedby="chat-shortcut-hint"
            id="chat-content"
            maxLength="2000"
            name="content"
            placeholder="상대방을 존중하는 대화를 나눠 주세요."
            required
            rows="3"
          />
          <small className="chat-shortcut-hint" id="chat-shortcut-hint">
            Enter로 줄바꿈 · Shift + Enter로 전송
          </small>
          <p className="chat-error" data-chat-error hidden role="alert" />
          <button type="submit">보내기</button>
        </form>
      ) : null}

      {isActive ? <script defer src="/assets/chat.js" /> : null}
    </section>
  );
}

export default function ConversationDetailPage(properties) {
  return <ConversationTranscript {...properties} />;
}
