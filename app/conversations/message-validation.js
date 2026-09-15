// lib/message-validation.js

import { bannedWords } from "../../lib/filters/banned-words.js";

const MAX_MESSAGE_LENGTH = 2000;
const URL_PATTERN =
  /\b(?:https?:\/\/|www\.)[^\s]+/i;

const DOMAIN_PATTERN =
  /\b[a-z0-9-]+(?:\.[a-z0-9-]+)+\b/i;
  
function normalizeBasic(content) {
  return content
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, "");
}

function normalizeForLinkCheck(content) {
  return content
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\[\.\]/g, ".")
    .replace(/\(\.\)/g, ".")
    .replace(/\s*\.\s*/g, ".")
    .replace(/hxxps?:\/\//g, "https://")
    .replace(/https?:\[:\]\/\//g, "https://");
}

export function containsLink(content) {
  const normalized =
    normalizeForLinkCheck(content);

  return URL_PATTERN.test(normalized) ||
    DOMAIN_PATTERN.test(normalized);
}

export function containsBannedWord(content) {
  const basic = normalizeBasic(content);

  for (const entry of bannedWords) {
    const word = normalizeBasic(entry.word);

    // 1차 검사
    if (basic.includes(word)) {
      return true;
    }

    // 위험도가 높은 단어만 2차 검사
    if (
      entry.level === "strict" &&
      containsBannedWordWithGap(basic, word, 5)
    ) {
      return true;
    }
  }

  return false;
}

function containsBannedWordWithGap(content, word, maxGap = 5) {
  let contentIndex = 0;

  for (const targetChar of word) {
    let found = false;
    let gap = 0;

    while (contentIndex < content.length) {
      if (content[contentIndex] === targetChar) {
        found = true;
        contentIndex += 1;
        break;
      }

      gap += 1;

      if (gap > maxGap) {
        return false;
      }

      contentIndex += 1;
    }

    if (!found) {
      return false;
    }
  }

  return true;
}

export function validateConversationMessage(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return { ok: false, message: "메시지를 입력해 주세요." };
  }

  const content = value.trim();

  if (content.length > MAX_MESSAGE_LENGTH) {
    return {
      ok: false,
      message: `메시지는 ${MAX_MESSAGE_LENGTH}자 이하로 입력해 주세요.`
    };
  }

  if (containsBannedWord(content)) {
    return {
      ok: false,
      message: "사용할 수 없는 표현이 포함되어 있습니다."
    };
  }

  if (containsLink(content)) {
    return {
      ok: false,
      message:
        "채팅에서는 외부 링크를 전송할 수 없습니다."
    };
  }
  return { ok: true, content };
}
