function TopicCard({ isPreview, topic }) {
  const topicId = String(topic._id);
  const options = Array.isArray(topic.options) ? topic.options : [];

  return (
    <article className="topic-card">
      <p className="eyebrow">{isPreview ? "화면 예시" : "오늘의 주제"}</p>
      <h2>{topic.title}</h2>
      <form className="matching-form">
        <input type="hidden" name="topicId" value={topicId} />
        <fieldset>
          <legend>내 입장</legend>
          {options.map((option, index) => (
            <label key={option.code}>
              <input
                type="radio"
                name="stance"
                value={option.code}
                defaultChecked={index === 0}
              />
              {option.label}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>누구와 이야기할까요?</legend>
          <label>
            <input
              type="radio"
              name="matchType"
              value="SAME"
              defaultChecked
            />
            <strong>같은 편</strong>
            <small>생각이 비슷한 사람과 공감하기</small>
          </label>
          <label>
            <input type="radio" name="matchType" value="OPPOSITE" />
            <strong>반대편</strong>
            <small>다른 관점을 가진 사람과 대화하기</small>
          </label>
        </fieldset>
        <button
          type="button"
          disabled
          title="매칭 기능을 연결하면 활성화됩니다."
        >
          매칭 기능 연결 전
        </button>
      </form>
    </article>
  );
}

export function TopicList({ isPreview = false, topics }) {
  if (topics.length === 0) {
    return (
      <section className="empty-state">
        <h2>아직 공개된 주제가 없습니다</h2>
        <p>개발 DB에 Seed를 실행하면 예시 토론 주제가 표시됩니다.</p>
        <code>npm run seed</code>
      </section>
    );
  }

  return (
    <section className="topic-grid" aria-label="토론 주제">
      {topics.map((topic) => (
        <TopicCard
          isPreview={isPreview}
          key={String(topic._id)}
          topic={topic}
        />
      ))}
    </section>
  );
}
