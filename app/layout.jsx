function AccountNavigation({ session }) {
  if (!session) {
    return (
      <nav aria-label="계정 메뉴">
        <a href="/login">로그인</a>
        <a href="/signup" className="button-link">가입하기</a>
      </nav>
    );
  }

  return (
    <nav aria-label="계정 메뉴">
      <a href="/conversations">내 대화방</a>
      <span className="account-name">{session.user.name} 님</span>
      <form action="/auth/logout" method="post" className="inline-form">
        <button type="submit" className="secondary">로그아웃</button>
      </form>
    </nav>
  );
}

export function Layout({ children, session, title = "한판팅" }) {
  const pageTitle = title === "한판팅" ? title : `${title} | 한판팅`;

  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="사회·정치 주제에 관해 익명으로 마주 앉는 1:1 대화 서비스"
        />
        <title>{pageTitle}</title>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="stylesheet" href="/assets/simple.css" />
        <link rel="stylesheet" href="/assets/app.css?v=2" />
      </head>
      <body>
        <header className="site-header">
          <a href="/" className="brand" aria-label="한판팅 홈">
            <span className="brand-mark" aria-hidden="true">한</span>
            <span>한판팅</span>
          </a>
          <AccountNavigation session={session} />
        </header>
        <main>{children}</main>
        <footer>
          <p>대화 상대에게는 이메일과 실명이 공개되지 않습니다.</p>
        </footer>
      </body>
    </html>
  );
}
