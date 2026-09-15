import { TopicList } from "./topic-list.jsx";

export default function Page({
  databaseError,
  needsConfiguration,
  showPreview,
  topics
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
        <p className="signed-in">로그인되었습니다. 주제를 골라 보세요.</p>
        <form action="/temporary-match" method="post" className="temporary-chat-form">
          <button
            disabled={needsConfiguration || databaseError || showPreview || topics.length === 0}
            type="submit"
          >
            채팅하기
          </button>
          <small>첫 번째 주제에서 찬성 입장의 같은 의견 사용자를 기다립니다.</small>
        </form>
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

      <TopicList isPreview={showPreview} topics={topics} />

      <aside className="scope-note">
        <h2>이번 기초 구성의 범위</h2>
        <p>
          회원 인증, MongoDB 연결, 주제 조회, 화면 구조까지 준비되어 있습니다.
          매칭 처리와 실시간 채팅은 연결 지점만 남겨 두었습니다.
        </p>
      </aside>
    </>
  );
}
