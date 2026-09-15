import { clearInterval, setInterval } from "node:timers";

import { ObjectId } from "mongodb";

import { COLLECTIONS } from "./collections.js";
import {
  publishConversationEnded,
  publishConversationMessage
} from "./conversation-events.js";
import { getDatabase } from "./mongodb.js";

export const REPLY_WARNING_MINUTES = 5;
export const REPLY_TIMEOUT_MINUTES = 10;

const LIFECYCLE_CHECK_INTERVAL_MS = 10 * 1000;
const SYSTEM_SENDER_NAME = "시스템";
const WARNING_MESSAGE = "현재 메시지에 5분 동안 답변이 없어, 5분 뒤 대화가 자동으로 종료됩니다.";
const TIMEOUT_MESSAGE = "10분 동안 답변이 없어 대화가 자동으로 종료되었습니다.";

let lifecycleInterval;
let isLifecycleCheckRunning = false;

function subtractMinutes(date, minutes) {
  return new Date(date.getTime() - minutes * 60 * 1000);
}

function createSystemMessage(conversationId, content, createdAt) {
  return {
    conversationId: String(conversationId),
    type: "SYSTEM",
    senderName: SYSTEM_SENDER_NAME,
    content,
    createdAt
  };
}

export async function saveConversationSystemMessage(
  conversation,
  content,
  createdAt = new Date()
) {
  const database = getDatabase();
  const message = createSystemMessage(conversation._id, content, createdAt);
  const result = await database.collection(COLLECTIONS.messages).insertOne(message);

  return { ...message, _id: result.insertedId };
}

async function saveAndPublishSystemMessage(conversation, content, createdAt) {
  const savedMessage = await saveConversationSystemMessage(
    conversation,
    content,
    createdAt
  );

  publishConversationMessage(conversation, savedMessage);
  return savedMessage;
}

export async function setConversationParticipantsOnline(conversation) {
  const participantIds = conversation.participants
    .map((participant) => participant.userId)
    .filter((userId) => ObjectId.isValid(userId))
    .map((userId) => new ObjectId(userId));

  if (participantIds.length === 0) {
    return;
  }

  await getDatabase().collection(COLLECTIONS.users).updateMany(
    { _id: { $in: participantIds }, status: "ACTIVE" },
    { $set: { status: "ONLINE", updatedAt: new Date() } }
  );
}

async function endExpiredConversation(conversationId, now) {
  if (!ObjectId.isValid(conversationId)) {
    return null;
  }

  const database = getDatabase();
  const timeoutCutoff = subtractMinutes(now, REPLY_TIMEOUT_MINUTES);
  const conversation = await database.collection(COLLECTIONS.conversations)
    .findOneAndUpdate(
      {
        _id: new ObjectId(conversationId),
        status: "ACTIVE",
        unansweredSince: { $lte: timeoutCutoff }
      },
      {
        $set: {
          endedAt: now,
          endReason: "IDLE",
          status: "ENDED",
          updatedAt: now
        }
      },
      { returnDocument: "after" }
    );

  if (!conversation) {
    return null;
  }

  await saveAndPublishSystemMessage(conversation, TIMEOUT_MESSAGE, now);
  await setConversationParticipantsOnline(conversation);
  publishConversationEnded(conversation);
  return conversation;
}

async function addReplyWarning(conversationId, now) {
  if (!ObjectId.isValid(conversationId)) {
    return null;
  }

  const database = getDatabase();
  const warningCutoff = subtractMinutes(now, REPLY_WARNING_MINUTES);
  const timeoutCutoff = subtractMinutes(now, REPLY_TIMEOUT_MINUTES);
  const conversation = await database.collection(COLLECTIONS.conversations)
    .findOneAndUpdate(
      {
        _id: new ObjectId(conversationId),
        inactivityWarningSentAt: { $exists: false },
        status: "ACTIVE",
        unansweredSince: {
          $gt: timeoutCutoff,
          $lte: warningCutoff
        }
      },
      {
        $set: {
          inactivityWarningSentAt: now,
          updatedAt: now
        }
      },
      { returnDocument: "after" }
    );

  if (!conversation) {
    return null;
  }

  await saveAndPublishSystemMessage(conversation, WARNING_MESSAGE, now);
  return conversation;
}

export async function processConversationLifecycleForConversation(
  conversationId,
  now = new Date()
) {
  const endedConversation = await endExpiredConversation(conversationId, now);

  if (endedConversation) {
    return { status: "ENDED", conversation: endedConversation };
  }

  const warnedConversation = await addReplyWarning(conversationId, now);

  return warnedConversation
    ? { status: "WARNING_SENT", conversation: warnedConversation }
    : { status: "UNCHANGED" };
}

export async function processAllConversationLifecycles(now = new Date()) {
  if (isLifecycleCheckRunning) {
    return;
  }

  isLifecycleCheckRunning = true;

  try {
    const database = getDatabase();
    const warningCutoff = subtractMinutes(now, REPLY_WARNING_MINUTES);
    const conversations = await database.collection(COLLECTIONS.conversations)
      .find({
        status: "ACTIVE",
        unansweredSince: { $lte: warningCutoff }
      })
      .project({ _id: 1 })
      .limit(100)
      .toArray();

    for (const conversation of conversations) {
      await processConversationLifecycleForConversation(
        String(conversation._id),
        now
      );
    }
  } finally {
    isLifecycleCheckRunning = false;
  }
}

export function startConversationLifecycleChecks() {
  if (lifecycleInterval) {
    return;
  }

  lifecycleInterval = setInterval(() => {
    processAllConversationLifecycles().catch((error) => {
      console.error("대화방 자동 종료 확인 중 오류가 발생했습니다.", error);
    });
  }, LIFECYCLE_CHECK_INTERVAL_MS);
  lifecycleInterval.unref();
}

export function stopConversationLifecycleChecks() {
  if (!lifecycleInterval) {
    return;
  }

  clearInterval(lifecycleInterval);
  lifecycleInterval = undefined;
}
