export const COLLECTIONS = Object.freeze({
  accounts: "account",
  blocks: "blocks",
  conversations: "conversations",
  matchRequests: "matchRequests",
  messages: "messages",
  sessions: "session",
  topics: "topics",
  users: "user",
  verifications: "verification"
});

export const USER_STATUSES = Object.freeze([
  "ONLINE",
  "WAITING",
  "ACTIVE",
  "SUSPENDED"
]);

export const TOPIC_STATUSES = Object.freeze(["ACTIVE", "CLOSED"]);
