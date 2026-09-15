import { ObjectId } from "mongodb";

import { COLLECTIONS } from "./collections.js";
import { createConversationForMatchedUsers } from "./conversations.js";
import { getDatabase } from "./mongodb.js";

const TEMPORARY_QUEUE_ID = "temporary-same-agree-queue";

async function findActiveConversation(userId) {
  return getDatabase().collection(COLLECTIONS.conversations).findOne(
    {
      "participants.userId": userId,
      status: "ACTIVE"
    },
    { sort: { createdAt: -1 } }
  );
}

async function findFirstSeedTopic() {
  return getDatabase().collection(COLLECTIONS.topics).findOne(
    { status: "ACTIVE" },
    { sort: { _id: 1 } }
  );
}

async function findUser(userId) {
  if (!ObjectId.isValid(userId)) {
    return null;
  }

  return getDatabase().collection(COLLECTIONS.users).findOne({
    _id: new ObjectId(userId),
    status: { $ne: "SUSPENDED" }
  });
}

async function prepareQueue() {
  await getDatabase().collection(COLLECTIONS.matchRequests).updateOne(
    { _id: TEMPORARY_QUEUE_ID },
    {
      $setOnInsert: {
        status: "AVAILABLE",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    },
    { upsert: true }
  );
}

async function finishMatch(queue, secondUserId) {
  const database = getDatabase();
  const firstUser = await findUser(queue.userId);
  const secondUser = await findUser(secondUserId);

  if (!firstUser || !secondUser) {
    await database.collection(COLLECTIONS.matchRequests).updateOne(
      { _id: TEMPORARY_QUEUE_ID, status: "MATCHING" },
      {
        $set: { status: "AVAILABLE", updatedAt: new Date() },
        $unset: { secondUserId: "", topicId: "", userId: "" }
      }
    );
    throw new Error("임시 매칭에 사용할 사용자를 찾지 못했습니다.");
  }

  try {
    const conversation = await createConversationForMatchedUsers({
      topicId: queue.topicId,
      matchType: "SAME",
      firstUser,
      firstStance: "AGREE",
      secondUser,
      secondStance: "AGREE"
    });
    const conversationId = String(conversation._id);
    const now = new Date();

    await database.collection(COLLECTIONS.users).updateMany(
      { _id: { $in: [firstUser._id, secondUser._id] } },
      { $set: { status: "ACTIVE", updatedAt: now } }
    );
    await database.collection(COLLECTIONS.matchRequests).updateOne(
      { _id: TEMPORARY_QUEUE_ID, status: "MATCHING" },
      {
        $set: { status: "AVAILABLE", updatedAt: now },
        $unset: { secondUserId: "", topicId: "", userId: "" }
      }
    );

    return { status: "MATCHED", conversationId };
  } catch (error) {
    // 채팅방 생성이 실패하면 첫 번째 사용자가 다시 대기할 수 있게 복구합니다.
    await database.collection(COLLECTIONS.matchRequests).updateOne(
      {
        _id: TEMPORARY_QUEUE_ID,
        secondUserId,
        status: "MATCHING",
        userId: queue.userId
      },
      {
        $set: { status: "WAITING", updatedAt: new Date() },
        $unset: { secondUserId: "" }
      }
    );
    throw error;
  }
}

export async function startTemporaryMatch(userId) {
  const activeConversation = await findActiveConversation(userId);

  if (activeConversation) {
    return {
      status: "MATCHED",
      conversationId: String(activeConversation._id)
    };
  }

  const user = await findUser(userId);
  const topic = await findFirstSeedTopic();

  if (!user) {
    throw new Error("로그인한 사용자를 찾지 못했습니다.");
  }

  if (!topic) {
    throw new Error("첫 번째 Seed 주제를 찾지 못했습니다.");
  }

  await prepareQueue();

  const database = getDatabase();
  const now = new Date();
  const claimedQueue = await database.collection(COLLECTIONS.matchRequests)
    .findOneAndUpdate(
      {
        _id: TEMPORARY_QUEUE_ID,
        status: "WAITING",
        userId: { $ne: userId }
      },
      {
        $set: {
          secondUserId: userId,
          status: "MATCHING",
          updatedAt: now
        }
      },
      { returnDocument: "after" }
    );

  if (claimedQueue) {
    return finishMatch(claimedQueue, userId);
  }

  const waitingQueue = await database.collection(COLLECTIONS.matchRequests)
    .findOneAndUpdate(
      { _id: TEMPORARY_QUEUE_ID, status: "AVAILABLE" },
      {
        $set: {
          matchType: "SAME",
          stance: "AGREE",
          status: "WAITING",
          topicId: String(topic._id),
          updatedAt: now,
          userId
        }
      },
      { returnDocument: "after" }
    );

  if (waitingQueue) {
    await database.collection(COLLECTIONS.users).updateOne(
      { _id: user._id },
      { $set: { status: "MATCHING", updatedAt: now } }
    );
    return { status: "WAITING" };
  }

  const currentQueue = await database.collection(COLLECTIONS.matchRequests)
    .findOne({ _id: TEMPORARY_QUEUE_ID });

  if (
    currentQueue?.userId === userId
    || currentQueue?.secondUserId === userId
  ) {
    return { status: "WAITING" };
  }

  return { status: "BUSY" };
}

export async function getTemporaryMatchStatus(userId) {
  const activeConversation = await findActiveConversation(userId);

  if (activeConversation) {
    return {
      status: "MATCHED",
      conversationId: String(activeConversation._id)
    };
  }

  const queue = await getDatabase().collection(COLLECTIONS.matchRequests)
    .findOne({ _id: TEMPORARY_QUEUE_ID });

  if (queue?.userId === userId || queue?.secondUserId === userId) {
    return { status: "WAITING" };
  }

  return { status: "IDLE" };
}
