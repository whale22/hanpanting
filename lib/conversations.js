import { randomInt } from "node:crypto";

import { ObjectId } from "mongodb";

import { COLLECTIONS } from "./collections.js";
import {
  processConversationLifecycleForConversation,
  REPLY_TIMEOUT_MINUTES,
  saveConversationSystemMessage,
  setConversationParticipantsOnline
} from "./conversation-lifecycle.js";
import { getDatabase } from "./mongodb.js";

const RECENT_CONVERSATION_DAYS = 7;
const MAX_MESSAGE_LENGTH = 2000;
const MESSAGE_FLOOD_LIMIT = 5;
const MESSAGE_FLOOD_WINDOW_SECONDS = 10;
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

export function getNextReplyTimerState(
  conversation,
  senderUserId,
  otherUserId,
  sentAt
) {
  const isFirstMessage = !conversation.unansweredSince;
  const isReply = conversation.awaitingReplyFromUserId === senderUserId;
  const startsNewReplyPeriod = isFirstMessage || isReply;

  return {
    awaitingReplyFromUserId: startsNewReplyPeriod
      ? otherUserId
      : conversation.awaitingReplyFromUserId,
    clearWarning: startsNewReplyPeriod,
    unansweredSince: startsNewReplyPeriod
      ? sentAt
      : conversation.unansweredSince
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

async function isMessageFlooding(database, conversationId, userId, now) {
  const windowStartedAt = new Date(
    now.getTime() - MESSAGE_FLOOD_WINDOW_SECONDS * 1000
  );
  const recentMessageCount = await database.collection(COLLECTIONS.messages)
    .countDocuments({
      conversationId,
      senderUserId: userId,
      type: { $ne: "SYSTEM" },
      createdAt: { $gte: windowStartedAt }
    }, { limit: MESSAGE_FLOOD_LIMIT });

  return recentMessageCount >= MESSAGE_FLOOD_LIMIT;
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
  const normalizedConversationId = String(new ObjectId(conversationId));

  await processConversationLifecycleForConversation(conversationId, now);

  const currentConversation = await database.collection(COLLECTIONS.conversations)
    .findOne({
      _id: new ObjectId(conversationId),
      "participants.userId": userId,
      status: "ACTIVE"
    });

  if (!currentConversation) {
    return {
      ok: false,
      message: "활성 상태인 대화방을 찾을 수 없습니다."
    };
  }

  if (await isMessageFlooding(database, normalizedConversationId, userId, now)) {
    return {
      ok: false,
      message: "메시지를 너무 빠르게 보내고 있습니다."
    };
  }

  const otherParticipant = currentConversation.participants.find(
    (participant) => participant.userId !== userId
  );

  if (!otherParticipant) {
    return { ok: false, message: "대화 상대를 찾을 수 없습니다." };
  }

  const timeoutCutoff = new Date(
    now.getTime() - REPLY_TIMEOUT_MINUTES * 60 * 1000
  );
  const replyTimerState = getNextReplyTimerState(
    currentConversation,
    userId,
    otherParticipant.userId,
    now
  );
  const timerVersionFilter = currentConversation.awaitingReplyFromUserId
    ? {
        awaitingReplyFromUserId: currentConversation.awaitingReplyFromUserId,
        unansweredSince: currentConversation.unansweredSince
      }
    : { awaitingReplyFromUserId: { $exists: false } };
  const conversationUpdate = {
    $set: {
      awaitingReplyFromUserId: replyTimerState.awaitingReplyFromUserId,
      lastMessageAt: now,
      unansweredSince: replyTimerState.unansweredSince,
      updatedAt: now
    }
  };

  if (replyTimerState.clearWarning) {
    conversationUpdate.$unset = { inactivityWarningSentAt: "" };
  }

  const conversation = await database.collection(COLLECTIONS.conversations)
    .findOneAndUpdate(
      {
        _id: new ObjectId(conversationId),
        "participants.userId": userId,
        status: "ACTIVE",
        ...timerVersionFilter,
        $or: [
          { unansweredSince: { $exists: false } },
          { unansweredSince: { $gt: timeoutCutoff } }
        ]
      },
      conversationUpdate,
      { returnDocument: "after" }
    );

  if (!conversation) {
    return {
      ok: false,
      message: "대화 상태가 바뀌었습니다. 화면을 새로고침한 뒤 다시 확인해 주세요."
    };
  }

  const message = {
    conversationId: normalizedConversationId,
    type: "USER",
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

export async function endConversationForUser({ conversationId, userId }) {
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
          endedAt: now,
          endedByUserId: userId,
          endReason: "LEFT",
          status: "ENDED",
          updatedAt: now
        }
      },
      { returnDocument: "after" }
    );

  if (!conversation) {
    return {
      ok: false,
      message: "이미 종료되었거나 참여할 수 없는 대화방입니다."
    };
  }

  const systemMessage = await saveConversationSystemMessage(
    conversation,
    "참여자 한 명이 대화를 종료했습니다.",
    now
  );

  await setConversationParticipantsOnline(conversation);

  return { ok: true, conversation, systemMessage };
}
