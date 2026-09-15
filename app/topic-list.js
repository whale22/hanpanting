import React from "react";

function TopicCard({ isPreview, topic }) {
  const topicId = String(topic._id);
  const options = Array.isArray(topic.options) ? topic.options : [];

  return React.createElement(
    "article",
    { className: "topic-card" },
    React.createElement(
      "p",
      { className: "eyebrow" },
      isPreview ? "화면 예시" : "오늘의 주제"
    ),
    React.createElement("h2", null, topic.title),
    React.createElement(
      "form",
      { className: "matching-form" },
      React.createElement("input", { type: "hidden", name: "topicId", value: topicId }),
      React.createElement(
        "fieldset",
        null,
        React.createElement("legend", null, "내 입장"),
        ...options.map((option, index) =>
          React.createElement(
            "label",
            { key: option.code },
            React.createElement("input", {
              type: "radio",
              name: "stance",
              value: option.code,
              defaultChecked: index === 0
            }),
            option.label
          )
        )
      ),
      React.createElement(
        "fieldset",
        null,
        React.createElement("legend", null, "누구와 이야기할까요?"),
        React.createElement(
          "label",
          null,
          React.createElement("input", {
            type: "radio",
            name: "matchType",
            value: "SAME",
            defaultChecked: true
          }),
          React.createElement("strong", null, "같은 편"),
          React.createElement("small", null, "생각이 비슷한 사람과 공감하기")
        ),
        React.createElement(
          "label",
          null,
          React.createElement("input", {
            type: "radio",
            name: "matchType",
            value: "OPPOSITE"
          }),
          React.createElement("strong", null, "반대편"),
          React.createElement("small", null, "다른 관점을 가진 사람과 대화하기")
        )
      ),
      React.createElement(
        "button",
        {
          type: "button",
          disabled: true,
          title: "매칭 기능을 연결하면 활성화됩니다."
        },
        "매칭 기능 연결 전"
      )
    )
  );
}

export function TopicList({ isPreview = false, topics }) {
  if (topics.length === 0) {
    return React.createElement(
      "section",
      { className: "empty-state" },
      React.createElement("h2", null, "아직 공개된 주제가 없습니다"),
      React.createElement("p", null, "개발 DB에 Seed를 실행하면 예시 토론 주제가 표시됩니다."),
      React.createElement("code", null, "npm run seed")
    );
  }

  return React.createElement(
    "section",
    { className: "topic-grid", "aria-label": "토론 주제" },
    ...topics.map((topic) =>
      React.createElement(TopicCard, {
        isPreview,
        key: String(topic._id),
        topic
      })
    )
  );
}
