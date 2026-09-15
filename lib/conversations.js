import { ObjectId } from "mongodb";

import { COLLECTIONS } from "./collections.js";
import { getDatabase } from "./mongodb.js";

const RECENT_CONVERSATION_DAYS = 7;

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
  if (!ObjectId.isValid(conversationId)) {
    return null;
  }

  const database = getDatabase();
  const conversation = await database.collection(COLLECTIONS.conversations).findOne({
    _id: new ObjectId(conversationId),
    "participants.userId": userId
  });

  if (!conversation) {
    return null;
  }

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
