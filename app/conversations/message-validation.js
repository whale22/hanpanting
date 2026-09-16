import { bannedWords } from "../../lib/filters/banned-words.js";

const MAX_MESSAGE_LENGTH = 2000;
const BANNED_WORD_MAX_GAPS = Object.freeze({
  normal: 0,
  obfuscated: 1,
  strict: 5,
  critical: 10
});
const URL_PATTERN = /(?:^|[^a-z0-9])(?:https?:\/\/|www\.)[^\s]+/iu;
const DOMAIN_LABEL = "[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?";
const DOMAIN_PATTERN = new RegExp(
  `(?:^|[^a-z0-9-])(?:${DOMAIN_LABEL}\\.)+`
    + "(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})(?=$|[^a-z0-9-])",
  "iu"
);
const IPV4_CANDIDATE_PATTERN = /(?:^|[^\d.])((?:\d{1,3}\.){3}\d{1,3})(?=$|[^\d.])/gu;

function normalizeForWordMatching(content) {
  return content
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function normalizeForLinkCheck(content) {
  return content
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/gu, "")
    .replace(/\[\s*(?:\.|dot|점)\s*\]/giu, ".")
    .replace(/\(\s*(?:\.|dot|점)\s*\)/giu, ".")
    .replace(/(?<=[a-z0-9-])\s*(?:dot|점)\s*(?=[a-z0-9-])/giu, ".")
    .replace(/\s*\.\s*/gu, ".")
    .replace(/\s+/gu, "")
    .replace(/hxxp(s?):\/\//giu, "http$1://")
    .replace(/(https?)\[:\]\/\//giu, "$1://");
}

function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function createGapPattern(word, maxGap) {
  if (maxGap === 0) {
    return null;
  }

  const gapPattern = `[\\p{L}\\p{N}]{0,${maxGap}}`;
  const characters = Array.from(word, escapeRegularExpression);

  return new RegExp(characters.join(gapPattern), "u");
}

export function prepareBannedWordEntries(entries) {
  if (!Array.isArray(entries)) {
    throw new TypeError("금칙어 목록은 배열이어야 합니다.");
  }

  return entries.map((entry, index) => {
    if (!entry || typeof entry.word !== "string" || !entry.word.trim()) {
      throw new TypeError(`${index + 1}번째 금칙어의 word가 비어 있습니다.`);
    }

    if (!Object.hasOwn(BANNED_WORD_MAX_GAPS, entry.level)) {
      throw new TypeError(`${index + 1}번째 금칙어의 level이 올바르지 않습니다.`);
    }

    const word = normalizeForWordMatching(entry.word);

    if (!word) {
      throw new TypeError(`${index + 1}번째 금칙어에 검사할 문자가 없습니다.`);
    }

    return {
      ...entry,
      normalizedWord: word,
      gapPattern: createGapPattern(word, BANNED_WORD_MAX_GAPS[entry.level])
    };
  });
}

const preparedBannedWords = prepareBannedWordEntries(bannedWords);

function containsIPv4Address(content) {
  const candidates = content.matchAll(IPV4_CANDIDATE_PATTERN);

  for (const candidate of candidates) {
    const octets = candidate[1].split(".").map(Number);

    if (octets.every((octet) => octet >= 0 && octet <= 255)) {
      return true;
    }
  }

  return false;
}

export function containsLink(content) {
  if (typeof content !== "string") {
    return false;
  }

  const normalized = normalizeForLinkCheck(content);

  return URL_PATTERN.test(normalized)
    || DOMAIN_PATTERN.test(normalized)
    || containsIPv4Address(normalized);
}

export function containsBannedWord(content) {
  if (typeof content !== "string") {
    return false;
  }

  const normalizedContent = normalizeForWordMatching(content);

  for (const entry of preparedBannedWords) {
    if (normalizedContent.includes(entry.normalizedWord)) {
      return true;
    }

    if (entry.gapPattern?.test(normalizedContent)) {
      return true;
    }
  }

  return false;
}

function countMessageCharacters(content) {
  return Array.from(content).length;
}

export function validateConversationMessage(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return { ok: false, message: "메시지를 입력해 주세요." };
  }

  const content = value.trim();

  if (countMessageCharacters(content) > MAX_MESSAGE_LENGTH) {
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
      message: "채팅에서는 외부 링크를 전송할 수 없습니다."
    };
  }

  return { ok: true, content };
}
