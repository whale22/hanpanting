import { ObjectId } from "mongodb";

import { COLLECTIONS } from "./collections.js";
import { createConversationForMatchedUsers } from "./conversations.js";
import { getDatabase } from "./mongodb.js";

// 입력 검증
// 사용자 WAITING 상태 선점
// 조건에 맞는 상대 요청 검색
// conversations 생성
// 두 matchRequest에 conversationId 저장
// 사용자 상태를 ACTIVE로 변경
// 매칭 결과와 waitingUserId 반환

const ALLOWED_STANCES = new Set([
  "AGREE",
  "DISAGREE"
]);

const ALLOWED_MATCH_TYPES = new Set([
  "SAME",
  "OPPOSITE"
]);

// 상대방 입장 찾기
function getPartnerStance(stance, matchType) {
  if (matchType === "SAME") {
    return stance;
  }

  return stance === "AGREE" ? "DISAGREE" : "AGREE";
}

// 매칭 상대 없을때 웨이팅 시키기
async function insertWaitingRequest({
  database,
  userId,
  topicId,
  stance,
  matchType,
  now
}) {
  const result = await database
    .collection(COLLECTIONS.matchRequests)
    .insertOne({
      userId,
      topicId,
      stance,
      matchType,
      status: "WAITING",
      createdAt: now,
      updatedAt: now
    });

  return {
    ok: true,
    status: "WAITING",
    matchRequestId: String(result.insertedId)
  };
}


export async function createOrMatchRequest({
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
  const users = database.collection(COLLECTIONS.users);

  // 동시에 여러 번 신청하더라도 한 요청만 처리되도록 사용자를 먼저 선점
  const userReservationResult = await users.updateOne(
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

  if (userReservationResult.modifiedCount !== 1) {
    return {
      ok: false,
      errorCode: "USER_NOT_AVAILABLE",
      message: "현재 한판을 신청할 수 없는 상태입니다."
    };
  }

  try {
    const partnerStance = getPartnerStance(stance, matchType);
    const partnerRequest = await matchRequests.findOneAndUpdate(
      {
        userId: { $ne: userId },
        topicId,
        stance: partnerStance,
        matchType,
        status: "WAITING"
      },
      {
        $set: {
          status: "MATCHED",
          matchedUserId: userId,
          updatedAt: now
        }
      },
      {
        sort: { createdAt: 1 },
        returnDocument: "after"
      }
    );

    if (!partnerRequest) {
      return await insertWaitingRequest({
        database,
        userId,
        topicId,
        stance,
        matchType,
        now
      });
    }

    // 잘못된 매칭 상태를 정리하고 내 요청을 대기 상태로 다시 등록하는 보상 트랜잭션
    if (!ObjectId.isValid(partnerRequest.userId)) {
      await matchRequests.updateOne(
        { _id: partnerRequest._id, status: "MATCHED" },
        {
          $set: { status: "EXPIRED", updatedAt: new Date() },
          $unset: { matchedUserId: "" }
        }
      );

      return await insertWaitingRequest({
        database,
        userId,
        topicId,
        stance,
        matchType,
        now
      });
    }

    const partnerUser = await users.findOne({
      _id: new ObjectId(partnerRequest.userId),
      status: "WAITING"
    });

    if (!partnerUser) {
      await matchRequests.updateOne(
        { _id: partnerRequest._id, status: "MATCHED" },
        {
          $set: { status: "EXPIRED", updatedAt: new Date() },
          $unset: { matchedUserId: "" }
        }
      );

      return await insertWaitingRequest({
        database,
        userId,
        topicId,
        stance,
        matchType,
        now
      });
    }

    // 매칭됐을때
    let conversation;
    let currentRequestId;
    let partnerUserActivated = false;
    let currentUserActivated = false;

    try {
      conversation = await createConversationForMatchedUsers({
        topicId,
        matchType,
        firstUser: partnerUser,
        firstStance: partnerRequest.stance,
        secondUser: user,
        secondStance: stance
      });

      const conversationId = String(conversation._id);
      const currentRequestResult = await matchRequests.insertOne({
        userId,
        topicId,
        stance,
        matchType,
        status: "MATCHED",
        matchedUserId: partnerRequest.userId,
        conversationId,
        createdAt: now,
        updatedAt: now
      });
      currentRequestId = currentRequestResult.insertedId;

      const partnerRequestUpdateResult = await matchRequests.updateOne(
        {
          _id: partnerRequest._id,
          status: "MATCHED",
          matchedUserId: userId
        },
        {
          $set: {
            conversationId,
            updatedAt: now
          }
        }
      );

      if (partnerRequestUpdateResult.modifiedCount !== 1) {
        throw new Error("상대방의 한판 신청 상태를 변경하지 못했습니다.");
      }

      const partnerUserUpdateResult = await users.updateOne(
        {
          _id: partnerUser._id,
          status: "WAITING"
        },
        {
          $set: {
            status: "ACTIVE",
            updatedAt: now
          }
        }
      );
      partnerUserActivated = partnerUserUpdateResult.modifiedCount === 1;

      if (!partnerUserActivated) {
        throw new Error("상대방의 사용자 상태를 변경하지 못했습니다.");
      }

      const currentUserUpdateResult = await users.updateOne(
        {
          _id: user._id,
          status: "WAITING"
        },
        {
          $set: {
            status: "ACTIVE",
            updatedAt: now
          }
        }
      );
      currentUserActivated = currentUserUpdateResult.modifiedCount === 1;

      if (!currentUserActivated) {
        throw new Error("신청자의 사용자 상태를 변경하지 못했습니다.");
      }

      return {
        ok: true,
        status: "MATCHED",
        matchRequestId: String(currentRequestId),
        conversationId,
        waitingUserId: partnerRequest.userId
      };
    } catch (error) {
      if (currentRequestId) {
        await matchRequests.deleteOne({ _id: currentRequestId });
      }

      if (conversation?._id) {
        await database
          .collection(COLLECTIONS.conversations)
          .deleteOne({ _id: conversation._id });
      }

      await matchRequests.updateOne(
        { _id: partnerRequest._id, status: "MATCHED" },
        {
          $set: { status: "WAITING", updatedAt: new Date() },
          $unset: { matchedUserId: "", conversationId: "" }
        }
      );

      if (partnerUserActivated) {
        await users.updateOne(
          { _id: partnerUser._id, status: "ACTIVE" },
          { $set: { status: "WAITING", updatedAt: new Date() } }
        );
      }

      if (currentUserActivated) {
        await users.updateOne(
          { _id: user._id, status: "ACTIVE" },
          { $set: { status: "ONLINE", updatedAt: new Date() } }
        );
      }

      throw error;
    }
  } catch (error) {
    await users.updateOne(
      { _id: user._id, status: "WAITING" },
      { $set: { status: "ONLINE", updatedAt: new Date() } }
    );

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

export async function findWaitingMatchRequest(userId) {
  if (typeof userId !== "string" || !ObjectId.isValid(userId)) {
    return null;
  }

  return getDatabase()
    .collection(COLLECTIONS.matchRequests)
    .findOne({
      userId,
      status: "WAITING"
    });
}


// 취소
export async function cancelWaitingMatchRequest(userId) {
  if (!ObjectId.isValid(userId)) {
    return {
      ok: false,
      errorCode: "INVALID_USER"
    };
  }

  const database = getDatabase();
  const now = new Date();

  const matchRequest = await database
    .collection(COLLECTIONS.matchRequests)
    .findOneAndUpdate(
      {
        userId,
        status: "WAITING"
      },
      {
        $set: {
          status: "CANCELLED",
          updatedAt: now
        }
      },
      {
        returnDocument: "after"
      }
    );

  if (!matchRequest) {
    return {
      ok: false,
      errorCode: "WAITING_REQUEST_NOT_FOUND"
    };
  }

  await database
    .collection(COLLECTIONS.users)
    .updateOne(
      {
        _id: new ObjectId(userId),
        status: "WAITING"
      },
      {
        $set: {
          status: "ONLINE",
          updatedAt: now
        }
      }
    );

  return {
    ok: true
  };
}