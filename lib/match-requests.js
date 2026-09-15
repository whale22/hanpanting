import { ObjectId } from "mongodb";

import { COLLECTIONS } from "./collections.js";
import { getDatabase } from "./mongodb.js";

const ALLOWED_STANCES = new Set([
  "AGREE",
  "DISAGREE"
]);

const ALLOWED_MATCH_TYPES = new Set([
  "SAME",
  "OPPOSITE"
]);

export async function createWaitingMatchRequest({
  userId,
  topicId,
  stance,
  matchType
}) {
  if (typeof userId !== "string" || !ObjectId.isValid(userId)) {
    return {
      ok: false,
      errorCode: "INVALID_USER",
      message: "로그인한 사용자 정보를 확인할 수 없습니다."
    };
  }

  if (typeof topicId !== "string" || !ObjectId.isValid(topicId)) {
    return {
      ok: false,
      errorCode: "INVALID_TOPIC",
      message: "올바른 주제를 선택해 주세요."
    };
  }

  if (!ALLOWED_STANCES.has(stance)) {
    return {
      ok: false,
      errorCode: "INVALID_STANCE",
      message: "찬성 또는 반대 입장을 선택해 주세요."
    };
  }

  if (!ALLOWED_MATCH_TYPES.has(matchType)) {
    return {
      ok: false,
      errorCode: "INVALID_MATCH_TYPE",
      message: "같은 편 또는 다른 편을 선택해 주세요."
    };
  }

  const database = getDatabase();

  const user = await database
    .collection(COLLECTIONS.users)
    .findOne({
      _id: new ObjectId(userId)
    });

  if (!user) {
    return {
      ok: false,
      errorCode: "USER_NOT_FOUND",
      message: "한판을 신청할 수 있는 사용자를 찾지 못했습니다."
    };
  }

  if (user.status === "WAITING") {
    return {
      ok: false,
      errorCode: "ALREADY_WAITING",
      message: "이미 기다리고 있는 한판 신청이 있습니다."
    };
  }

  if (user.status !== "ONLINE") {
    return {
      ok: false,
      errorCode: "USER_NOT_AVAILABLE",
      message: "현재 한판을 신청할 수 없는 상태입니다."
    };
  }

  const now = new Date();

  const topic = await database
    .collection(COLLECTIONS.topics)
    .findOne({
      _id: new ObjectId(topicId),
      status: "ACTIVE",
      "options.code": stance,
      $and: [
        {
          $or: [
            { startsAt: { $exists: false } },
            { startsAt: null },
            { startsAt: { $lte: now } }
          ]
        },
        {
          $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: null },
            { expiresAt: { $gt: now } }
          ]
        }
      ]
    });

  if (!topic) {
    return {
      ok: false,
      errorCode: "TOPIC_NOT_AVAILABLE",
      message: "현재 신청할 수 없는 주제입니다."
    };
  }

  const matchRequests = database.collection(COLLECTIONS.matchRequests);
  let insertedRequestId;

  try {
    const result = await matchRequests.insertOne({
      userId,
      topicId,
      stance,
      matchType,
      status: "WAITING",
      createdAt: now,
      updatedAt: now
    });
    insertedRequestId = result.insertedId;

    const userUpdateResult = await database
      .collection(COLLECTIONS.users)
      .updateOne(
        {
          _id: user._id,
          status: "ONLINE"
        },
        {
          $set: {
            status: "WAITING",
            updatedAt: now
          }
        }
      );

    if (userUpdateResult.modifiedCount !== 1) {
      await matchRequests.deleteOne({ _id: insertedRequestId });

      return {
        ok: false,
        errorCode: "USER_NOT_AVAILABLE",
        message: "현재 한판을 신청할 수 없는 상태입니다."
      };
    }

    return {
      ok: true,
      matchRequestId: String(insertedRequestId)
    };
  } catch (error) {
    if (insertedRequestId) {
      await matchRequests.deleteOne({ _id: insertedRequestId });
    }

    if (error?.code === 11000) {
      return {
        ok: false,
        errorCode: "ALREADY_WAITING",
        message: "이미 기다리고 있는 한판 신청이 있습니다."
      };
    }

    throw error;
  }
}
