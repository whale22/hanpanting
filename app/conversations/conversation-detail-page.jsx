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
  const sender = findParticipant(conversation, message.senderUserId);
  const isMyMessage = message.senderUserId === userId;
  const senderName = isMyMessage
    ? "나"
    : sender?.anonymousName ?? "익명 사용자";

  return (
    <li className={isMyMessage ? "message-item my-message" : "message-item"}>
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

  return (
    <section className="conversation-detail-page">
      <a href="/conversations" className="back-link">← 대화방 목록</a>
      <p className="eyebrow">{statusLabel}</p>
      <h1>{topicTitle ?? "종료된 주제"}</h1>
      <p className="conversation-summary">
        {otherParticipant?.anonymousName ?? "익명 사용자"} · {matchTypeLabel}
      </p>

      {messages.length === 0 ? (
        <p className="empty-message">저장된 메시지가 없습니다.</p>
      ) : (
        <ol className="message-list" aria-label="저장된 대화 내용">
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
    </section>
  );
}

export default function ConversationDetailPage(properties) {
  return <ConversationTranscript {...properties} />;
}
