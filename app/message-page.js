import React from "react";

export default function MessagePage({ heading, message }) {
  return React.createElement(
    "section",
    { className: "message-page" },
    React.createElement("h1", null, heading),
    React.createElement("p", null, message),
    React.createElement("a", { href: "/", className: "button-link" }, "홈으로 돌아가기")
  );
}
