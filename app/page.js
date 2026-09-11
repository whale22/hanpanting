import React from "react";

import { getMissingConfiguration } from "../lib/runtime-config.js";
import { findActiveTopics } from "../lib/topics.js";
import { TopicList } from "./topic-list.js";

const previewTopics = [
  {
    _id: "preview-topic",
    title: "생성형 AI 결과물에 별도 표시를 의무화해야 할까요?",
    options: [
      { code: "AGREE", label: "의무화에 찬성" },
      { code: "DISAGREE", label: "의무화에 반대" }
    ]
  }
];

export default async function Page({ session, showPreview = false }) {
  const missingConfiguration = getMissingConfiguration();
  let topics = showPreview ? previewTopics : [];
  let databaseError = false;

  if (!showPreview && missingConfiguration.length === 0) {
    try {
      topics = await findActiveTopics();
    } catch (_error) {
      databaseError = true;
    }
  }

  const setupNotice = missingConfiguration.length > 0
    ? React.createElement(
        "aside",
        { className: "setup-notice", role: "status" },
        React.createElement("strong", null, "로컬 설정이 필요합니다."),
        React.createElement(
          "span",
          null,
          " .env.example을 복사해 .env.local을 만든 뒤 MongoDB 정보를 입력해 주세요."
        )
      )
    : null;

  const databaseNotice = databaseError
    ? React.createElement(
        "aside",
        { className: "setup-notice", role: "status" },
        React.createElement("strong", null, "MongoDB에 연결하지 못했습니다."),
        React.createElement("span", null, " 연결 주소와 실행 상태를 확인해 주세요.")
      )
    : null;

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      "section",
      { className: "intro" },
      React.createElement("p", { className: "eyebrow" }, "익명 1:1 대화"),
      React.createElement("h1", null, "생각이 달라도, 대화는 시작할 수 있으니까."),
      React.createElement(
        "p",
        null,
        "주제와 입장을 고르고 같은 편 또는 반대편 한 사람과 이야기합니다. 대화방에서는 매번 새로운 익명 이름을 사용합니다."
      ),
      session
        ? React.createElement("p", { className: "signed-in" }, "로그인되었습니다. 주제를 골라 보세요.")
        : React.createElement(
            "p",
            null,
            React.createElement("a", { href: "/login" }, "로그인"),
            "하면 매칭 준비를 시작할 수 있습니다."
          )
    ),
    setupNotice,
    databaseNotice,
    React.createElement(TopicList, {
      isPreview: showPreview,
      topics
    }),
    React.createElement(
      "aside",
      { className: "scope-note" },
      React.createElement("h2", null, "이번 기초 구성의 범위"),
      React.createElement(
        "p",
        null,
        "회원 인증, MongoDB 연결, 주제 조회, 화면 구조까지 준비되어 있습니다. 매칭 처리와 실시간 채팅은 연결 지점만 남겨 두었습니다."
      )
    )
  );
}
