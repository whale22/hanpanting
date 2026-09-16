export default function MessagePage({ heading, message }) {
  return (
    <section className="message-page">
      <h1>{heading}</h1>
      <p>{message}</p>
      <a href="/" className="button-link">홈으로 돌아가기</a>
    </section>
  );
}
