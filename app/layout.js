import React from "react";

function AccountNavigation({ session }) {
  if (!session) {
    return React.createElement(
      "nav",
      { "aria-label": "계정 메뉴" },
      React.createElement("a", { href: "/login" }, "로그인"),
      React.createElement("a", { href: "/signup", className: "button-link" }, "가입하기")
    );
  }

  return React.createElement(
    "nav",
    { "aria-label": "계정 메뉴" },
    React.createElement("a", { href: "/conversations" }, "내 대화방"),
    React.createElement(
      "span",
      { className: "account-name" },
      `${session.user.name} 님`
    ),
    React.createElement(
      "form",
      { action: "/auth/logout", method: "post", className: "inline-form" },
      React.createElement("button", { type: "submit", className: "secondary" }, "로그아웃")
    )
  );
}

export function Layout({ children, session, title = "한판팅" }) {
  const pageTitle = title === "한판팅" ? title : `${title} | 한판팅`;

  return React.createElement(
    "html",
    { lang: "ko" },
    React.createElement(
      "head",
      null,
      React.createElement("meta", { charSet: "utf-8" }),
      React.createElement("meta", {
        name: "viewport",
        content: "width=device-width, initial-scale=1"
      }),
      React.createElement(
        "meta",
        {
          name: "description",
          content: "사회·정치 주제에 관해 익명으로 마주 앉는 1:1 대화 서비스"
        }
      ),
      React.createElement("title", null, pageTitle),
      React.createElement("link", { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" }),
      React.createElement("link", { rel: "stylesheet", href: "/assets/simple.css" }),
      React.createElement("link", { rel: "stylesheet", href: "/assets/app.css?v=2" })
    ),
    React.createElement(
      "body",
      null,
      React.createElement(
        "header",
        { className: "site-header" },
        React.createElement(
          "a",
          { href: "/", className: "brand", "aria-label": "한판팅 홈" },
          React.createElement("span", { className: "brand-mark", "aria-hidden": "true" }, "한"),
          React.createElement("span", null, "한판팅")
        ),
        React.createElement(AccountNavigation, { session })
      ),
      React.createElement("main", null, children),
      React.createElement(
        "footer",
        null,
        React.createElement("p", null, "대화 상대에게는 이메일과 실명이 공개되지 않습니다.")
      )
    )
  );
}
