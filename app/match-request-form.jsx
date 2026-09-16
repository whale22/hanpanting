export function MatchRequestForm({ topics, waitingMatchRequest }) {
  if (waitingMatchRequest) {
    return (
      <section
        aria-labelledby="match-application-title"
        data-match-waiting="true"
      >
        <h2 id="match-application-title">
          한판 신청하기
        </h2>

        <article>
          <p>매칭 상대를 기다리고 있습니다.</p>

          <form
            action="/match-requests/cancel"
            method="post"
          >
            <button type="submit">
              취소하기
            </button>
          </form>
        </article>
      </section>
    );
  }

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
    <section aria-labelledby="match-application-title">
      <h2 id="match-application-title">한판 신청하기</h2>

      <article>
        <form action="/match-requests" method="post" className="matching-form">
          <label htmlFor="topicId">주제</label>
          <select
            id="topicId"
            name="topicId"
            defaultValue={String(topics[0]._id)}
            required
          >
            {topics.map((topic) => (
              <option
                key={String(topic._id)}
                value={String(topic._id)}
              >
                {topic.title}
              </option>
            ))}
          </select>

          <fieldset>
            <legend>내 입장</legend>
            <label>
              <input type="radio" name="stance" value="AGREE" defaultChecked />
              찬성
            </label>
            <label>
              <input type="radio" name="stance" value="DISAGREE" />
              반대
            </label>
          </fieldset>

          <fieldset>
            <legend>매치 타입</legend>
            <label>
              <input type="radio" name="matchType" value="SAME" defaultChecked />
              같은 편
            </label>
            <label>
              <input type="radio" name="matchType" value="OPPOSITE" />
              다른 편
            </label>
          </fieldset>

          <button
            type="submit"
          >
            한판 하기
          </button>
        </form>
      </article>
    </section>
  );
}
