export default function MatchingPage() {
  return (
    <section className="matching-page" data-matching-page>
      <p className="eyebrow">임시 채팅 매칭</p>
      <h1>대화 상대를 기다리고 있습니다</h1>
      <p>
        다른 사용자가 채팅하기 버튼을 누르면 자동으로 대화방으로 이동합니다.
      </p>
      <div className="matching-indicator" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="matching-condition">
        첫 번째 Seed 주제 · 찬성 · 같은 의견
      </p>
      <a href="/" className="button-link secondary">홈으로 돌아가기</a>
      <script defer src="/assets/matching.js" />
    </section>
  );
}
