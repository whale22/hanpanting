import { ObjectId } from "mongodb";

import { COLLECTIONS } from "./collections.js";
import {
  saveConversationSystemMessage,
  setConversationParticipantsOnline
} from "./conversation-lifecycle.js";
import { getDatabase } from "./mongodb.js";

const BLOCKED_CONVERSATION_MESSAGE =
  "참여자 한 명이 상대방을 차단해 대화가 종료되었습니다.";

export function getOtherParticipantUserId(conversation, userId) {
  const participant = conversation?.participants?.find(
    (candidate) => candidate.userId !== userId
  );

  return participant?.userId ?? null;
}

export function collectBlockedUserIds(userId, blockRelationships) {
  const blockedUserIds = new Set();

  for (const relationship of blockRelationships) {
    if (relationship.blockerUserId === userId) {
      blockedUserIds.add(relationship.blockedUserId);
    }

    if (relationship.blockedUserId === userId) {
      blockedUserIds.add(relationship.blockerUserId);
    }
  }

  blockedUserIds.delete(userId);
  blockedUserIds.delete(undefined);
  blockedUserIds.delete(null);

  return [...blockedUserIds];
}

function createBlockRelationshipFilter(firstUserId, secondUserId) {
  return {
    $or: [
      {
        blockerUserId: firstUserId,
        blockedUserId: secondUserId
      },
      {
        blockerUserId: secondUserId,
        blockedUserId: firstUserId
      }
    ]
  };
}

export async function hasBlockBetweenUsers(firstUserId, secondUserId) {
  if (
    !ObjectId.isValid(firstUserId)
    || !ObjectId.isValid(secondUserId)
    || firstUserId === secondUserId
  ) {
    return false;
  }

  const blockRelationship = await getDatabase()
    .collection(COLLECTIONS.blocks)
    .findOne(
      createBlockRelationshipFilter(firstUserId, secondUserId),
      { projection: { _id: 1 } }
    );

  return Boolean(blockRelationship);
}

export async function getBlockedUserIdsForUser(userId) {
  if (!ObjectId.isValid(userId)) {
    return [];
  }

  const blockRelationships = await getDatabase()
    .collection(COLLECTIONS.blocks)
    .find({
      $or: [
        { blockerUserId: userId },
        { blockedUserId: userId }
      ]
    })
    .project({ blockerUserId: 1, blockedUserId: 1 })
    .toArray();

  return collectBlockedUserIds(userId, blockRelationships);
}

export async function blockUserFromConversation({
  conversationId,
  blockerUserId
}) {
  if (!ObjectId.isValid(conversationId)) {
    return { ok: false, message: "대화방을 찾을 수 없습니다." };
  }

  if (!ObjectId.isValid(blockerUserId)) {
    return { ok: false, message: "로그인한 사용자 정보를 확인할 수 없습니다." };
  }

  const database = getDatabase();
  const conversations = database.collection(COLLECTIONS.conversations);
  const conversationObjectId = new ObjectId(conversationId);
  const existingConversation = await conversations.findOne({
    _id: conversationObjectId,
    "participants.userId": blockerUserId
  });

  if (!existingConversation) {
    return {
      ok: false,
      message: "참여할 수 없는 대화방입니다."
    };
  }

  const blockedUserId = getOtherParticipantUserId(
    existingConversation,
    blockerUserId
  );

  if (!ObjectId.isValid(blockedUserId)) {
    return { ok: false, message: "차단할 대화 상대를 찾을 수 없습니다." };
  }

  const now = new Date();

  await database.collection(COLLECTIONS.blocks).updateOne(
    { blockerUserId, blockedUserId },
    {
      $set: { updatedAt: now },
      $setOnInsert: {
        blockerUserId,
        blockedUserId,
        conversationId: String(existingConversation._id),
        createdAt: now
      }
    },
    { upsert: true }
  );

  const endedConversation = await conversations.findOneAndUpdate(
    {
      _id: conversationObjectId,
      "participants.userId": blockerUserId,
      status: "ACTIVE"
    },
    {
      $set: {
        blockedUserId,
        endedAt: now,
        endedByUserId: blockerUserId,
        endReason: "BLOCKED",
        status: "ENDED",
        updatedAt: now
      }
    },
    { returnDocument: "after" }
  );

  if (!endedConversation) {
    return {
      ok: true,
      conversation: existingConversation,
      conversationEnded: false,
      systemMessage: null
    };
  }

  const systemMessage = await saveConversationSystemMessage(
    endedConversation,
    BLOCKED_CONVERSATION_MESSAGE,
    now
  );

  await setConversationParticipantsOnline(endedConversation);

  return {
    ok: true,
    conversation: endedConversation,
    conversationEnded: true,
    systemMessage
  };
}
