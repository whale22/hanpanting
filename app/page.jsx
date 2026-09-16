import { MatchRequestForm } from "./match-request-form.jsx";

export default function Page({
  databaseError,
  matchHistoryCounts = {
    sameMatchCount: 0,
    oppositeMatchCount: 0
  },
  needsConfiguration,
  topics,
  waitingMatchRequest
}) {
  return (
    <>
      <section className="intro">
        <p className="eyebrow">익명 1:1 대화</p>
        <h1>생각이 달라도, 대화는 시작할 수 있으니까.</h1>
        <p>
          주제와 입장을 고르고 같은 편 또는 반대편 한 사람과 이야기합니다.
          대화방에서는 매번 새로운 익명 이름을 사용합니다.
        </p>
        <p className="signed-in">로그인되었습니다. 한판 시작해보세요.</p>
      </section>

      <section>
        <h2>나의 한판 이력</h2>

        <article className="history-box">
          <div>
            <strong>같은 입장끼리 한판</strong>
            <p>{matchHistoryCounts.sameMatchCount}회</p>
          </div>

          <div>
            <strong>다른 입장끼리 한판</strong>
            <p>{matchHistoryCounts.oppositeMatchCount}회</p>
          </div>
        </article>
      </section>

      {needsConfiguration && (
        <aside className="setup-notice" role="status">
          <strong>로컬 설정이 필요합니다.</strong>
          <span>
            {" .env.example을 복사해 .env.local을 만든 뒤 MongoDB 정보를 입력해 주세요."}
          </span>
        </aside>
      )}

      {databaseError && (
        <aside className="setup-notice" role="status">
          <strong>MongoDB에 연결하지 못했습니다.</strong>
          <span> 연결 주소와 실행 상태를 확인해 주세요.</span>
        </aside>
      )}

      <MatchRequestForm topics={topics} waitingMatchRequest={waitingMatchRequest}/>
    </>
  );
}
