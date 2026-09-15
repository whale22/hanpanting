import { randomInt } from "node:crypto";

import { ObjectId } from "mongodb";

import { COLLECTIONS } from "./collections.js";
import { getDatabase } from "./mongodb.js";

const RECENT_CONVERSATION_DAYS = 7;
const MAX_MESSAGE_LENGTH = 2000;
const MATCH_TYPES = new Set(["SAME", "OPPOSITE"]);
const ANONYMOUS_NAMES = [
  "차분한 고래",
  "용감한 수달",
  "다정한 여우",
  "생각하는 부엉이",
  "느긋한 판다",
  "반짝이는 돌고래"
];
const AVATAR_CODES = [
  "blue-whale",
  "green-otter",
  "orange-fox",
  "purple-owl",
  "red-panda",
  "yellow-dolphin"
];

function getRecentConversationStartDate() {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return new Date(Date.now() - RECENT_CONVERSATION_DAYS * millisecondsPerDay);
}

function getTopicObjectIds(conversations) {
  const topicIds = new Set(conversations.map((conversation) => conversation.topicId));

  return [...topicIds]
    .filter((topicId) => ObjectId.isValid(topicId))
    .map((topicId) => new ObjectId(topicId));
}

function pickTwoDifferentValues(values) {
  const firstIndex = randomInt(values.length);
  let secondIndex = randomInt(values.length - 1);

  if (secondIndex >= firstIndex) {
    secondIndex += 1;
  }

  return [values[firstIndex], values[secondIndex]];
}

function getUserId(user) {
  const userId = user?.id ?? user?._id;
  return userId ? String(userId) : "";
}

function createParticipant(user, stance, anonymousName, avatarCode, joinedAt) {
  return {
    userId: getUserId(user),
    stance,
    anonymousName,
    avatarCode,
    joinedAt
  };
}

export function validateMessageContent(value) {
  if (typeof value !== "string") {
    return { ok: false, message: "메시지를 입력해 주세요." };
  }

  const content = value.trim();

  if (content.length === 0) {
    return { ok: false, message: "메시지를 입력해 주세요." };
  }

  if (content.length > MAX_MESSAGE_LENGTH) {
    return {
      ok: false,
      message: `메시지는 ${MAX_MESSAGE_LENGTH}자 이하로 입력해 주세요.`
    };
  }

  return { ok: true, content };
}

export async function createConversationForMatchedUsers({
  topicId,
  matchType,
  firstUser,
  firstStance,
  secondUser,
  secondStance
}) {
  const firstUserId = getUserId(firstUser);
  const secondUserId = getUserId(secondUser);

  if (!ObjectId.isValid(topicId)) {
    throw new Error("올바른 주제 ID가 필요합니다.");
  }

  if (!MATCH_TYPES.has(matchType)) {
    throw new Error("올바른 매칭 유형이 필요합니다.");
  }

  if (!firstUserId || !secondUserId || firstUserId === secondUserId) {
    throw new Error("서로 다른 두 사용자가 필요합니다.");
  }

  if (!firstStance || !secondStance) {
    throw new Error("두 사용자의 입장이 필요합니다.");
  }

  const database = getDatabase();
  const topicExists = await database.collection(COLLECTIONS.topics).findOne(
    { _id: new ObjectId(topicId), status: "ACTIVE" },
    { projection: { _id: 1 } }
  );

  if (!topicExists) {
    throw new Error("활성 상태인 주제를 찾지 못했습니다.");
  }

  const [firstAnonymousName, secondAnonymousName] = pickTwoDifferentValues(
    ANONYMOUS_NAMES
  );
  const [firstAvatarCode, secondAvatarCode] = pickTwoDifferentValues(
    AVATAR_CODES
  );
  const now = new Date();
  const conversation = {
    topicId: String(topicId),
    matchType,
    participants: [
      createParticipant(
        firstUser,
        firstStance,
        firstAnonymousName,
        firstAvatarCode,
        now
      ),
      createParticipant(
        secondUser,
        secondStance,
        secondAnonymousName,
        secondAvatarCode,
        now
      )
    ],
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now
  };
  const result = await database.collection(COLLECTIONS.conversations).insertOne(
    conversation
  );

  return {
    ...conversation,
    _id: result.insertedId
  };
}

export async function findRecentConversationsForUser(userId) {
  const database = getDatabase();
  const conversations = await database.collection(COLLECTIONS.conversations)
    .find({
      "participants.userId": userId,
      createdAt: { $gte: getRecentConversationStartDate() }
    })
    .sort({ lastMessageAt: -1, createdAt: -1 })
    .toArray();

  const topicObjectIds = getTopicObjectIds(conversations);
  const topics = topicObjectIds.length === 0
    ? []
    : await database.collection(COLLECTIONS.topics)
        .find({ _id: { $in: topicObjectIds } })
        .project({ title: 1 })
        .toArray();
  const topicsById = new Map(
    topics.map((topic) => [String(topic._id), topic.title])
  );

  return { conversations, topicsById };
}

export async function findConversationDetailForUser(conversationId, userId) {
  const conversation = await findConversationForUser(conversationId, userId);

  if (!conversation) {
    return null;
  }

  const database = getDatabase();
  const messages = await database.collection(COLLECTIONS.messages)
    .find({ conversationId: String(conversation._id) })
    .sort({ createdAt: 1 })
    .toArray();
  const topic = ObjectId.isValid(conversation.topicId)
    ? await database.collection(COLLECTIONS.topics).findOne(
        { _id: new ObjectId(conversation.topicId) },
        { projection: { title: 1 } }
      )
    : null;

  return {
    conversation,
    messages,
    topicTitle: topic?.title ?? null
  };
}

export async function findConversationForUser(conversationId, userId) {
  if (!ObjectId.isValid(conversationId)) {
    return null;
  }

  const database = getDatabase();
  return database.collection(COLLECTIONS.conversations).findOne({
    _id: new ObjectId(conversationId),
    "participants.userId": userId
  });
}

export async function createMessageForConversation({
  content,
  conversationId,
  userId
}) {
  const validation = validateMessageContent(content);

  if (!validation.ok) {
    return validation;
  }

  if (!ObjectId.isValid(conversationId)) {
    return { ok: false, message: "대화방을 찾을 수 없습니다." };
  }

  const database = getDatabase();
  const now = new Date();
  const conversation = await database.collection(COLLECTIONS.conversations)
    .findOneAndUpdate(
      {
        _id: new ObjectId(conversationId),
        "participants.userId": userId,
        status: "ACTIVE"
      },
      {
        $set: {
          lastMessageAt: now,
          updatedAt: now
        }
      },
      { returnDocument: "after" }
    );

  if (!conversation) {
    return {
      ok: false,
      message: "활성 상태인 대화방을 찾을 수 없습니다."
    };
  }

  const message = {
    conversationId: String(conversation._id),
    senderUserId: userId,
    content: validation.content,
    createdAt: now
  };
  const result = await database.collection(COLLECTIONS.messages).insertOne(message);

  return {
    ok: true,
    conversation,
    message: {
      ...message,
      _id: result.insertedId
    }
  };
}
