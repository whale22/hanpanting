import { getMissingConfiguration } from "./runtime-config.js";
import { findActiveTopics } from "./topics.js";

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

export async function getHomePageData({ showPreview = false } = {}) {
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

  return {
    databaseError,
    needsConfiguration: missingConfiguration.length > 0,
    showPreview,
    topics
  };
}
