const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short"
});

function formatConversationDate(conversation) {
  const date = conversation.lastMessageAt ?? conversation.createdAt;

  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "시간 정보 없음";
  }

  return dateFormatter.format(date);
}

function findOtherParticipant(conversation, userId) {
  const participants = Array.isArray(conversation.participants)
    ? conversation.participants
    : [];

  return participants.find((participant) => participant.userId !== userId);
}

function ConversationCard({ conversation, topicTitle, userId }) {
  const otherParticipant = findOtherParticipant(conversation, userId);
  const statusLabel = conversation.status === "ACTIVE" ? "대화 중" : "종료됨";
  const matchTypeLabel = conversation.matchType === "SAME"
    ? "같은 입장"
    : "다른 입장";

  return (
    <li>
      <article className="conversation-card">
        <p className="eyebrow">{statusLabel}</p>
        <h2>
          <a href={`/conversations/${String(conversation._id)}`}>
            {topicTitle ?? "종료된 주제"}
          </a>
        </h2>
        <p>
          {otherParticipant?.anonymousName ?? "익명 사용자"} · {matchTypeLabel}
        </p>
        <small className="conversation-time">
          최근 활동 {formatConversationDate(conversation)}
        </small>
      </article>
    </li>
  );
}

export function ConversationList({ conversations, topicsById, userId }) {
  if (conversations.length === 0) {
    return (
      <section className="empty-state">
        <h2>아직 참여한 대화가 없습니다</h2>
        <p>홈에서 주제와 입장을 선택하면 새로운 대화를 시작할 수 있습니다.</p>
        <a href="/" className="button-link">주제 보러 가기</a>
      </section>
    );
  }

  return (
    <ul className="conversation-list" aria-label="최근 대화방">
      {conversations.map((conversation) => (
        <ConversationCard
          conversation={conversation}
          key={String(conversation._id)}
          topicTitle={topicsById.get(conversation.topicId)}
          userId={userId}
        />
      ))}
    </ul>
  );
}

export default function ConversationPage({ conversations, topicsById, userId }) {
  return (
    <section className="conversation-list-page">
      <p className="eyebrow">최근 7일</p>
      <h1>내 대화방</h1>
      <p>최근에 참여한 익명 대화를 확인할 수 있습니다.</p>
      <ConversationList
        conversations={conversations}
        topicsById={topicsById}
        userId={userId}
      />
    </section>
  );
}
