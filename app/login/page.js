import React from "react";

const ERROR_MESSAGES = {
  INVALID_EMAIL: "이메일 형식을 확인해 주세요.",
  INVALID_PASSWORD: "비밀번호는 8자 이상 128자 이하여야 합니다.",
  LOGIN_FAILED: "이메일 또는 비밀번호가 맞지 않습니다."
};

export default async function LoginPage({ accountCreated, errorCode }) {
  const errorMessage = ERROR_MESSAGES[errorCode];

  return React.createElement(
    "section",
    { className: "auth-panel" },
    React.createElement("p", { className: "eyebrow" }, "다시 만나기"),
    React.createElement("h1", null, "로그인"),
    React.createElement("p", null, "계정 정보는 상대방에게 공개되지 않습니다."),
    errorMessage
      ? React.createElement("p", { className: "form-error", role: "alert" }, errorMessage)
      : null,
    accountCreated
      ? React.createElement(
          "p",
          { className: "form-success", role: "status" },
          "계정을 만들었습니다. 이제 로그인해 주세요."
        )
      : null,
    React.createElement(
      "form",
      { action: "/auth/login", method: "post" },
      React.createElement(
        "label",
        { htmlFor: "email" },
        "이메일",
        React.createElement("input", {
          id: "email",
          name: "email",
          type: "email",
          autoComplete: "email",
          required: true
        })
      ),
      React.createElement(
        "label",
        { htmlFor: "password" },
        "비밀번호",
        React.createElement("input", {
          id: "password",
          name: "password",
          type: "password",
          autoComplete: "current-password",
          minLength: 8,
          maxLength: 128,
          required: true
        })
      ),
      React.createElement("button", { type: "submit" }, "로그인")
    ),
    React.createElement(
      "p",
      { className: "auth-switch" },
      "처음 오셨나요? ",
      React.createElement("a", { href: "/signup" }, "계정 만들기")
    )
  );
}
