import { getDatabase, closeMongoClient } from "../lib/mongodb.js";
import { createConversationForMatchedUsers } from "../lib/conversations.js";
import { COLLECTIONS } from "../lib/collections.js";

async function main() {
  const db = getDatabase();

  const firstUser = await db
  .collection(COLLECTIONS.users)
  .findOne({ email: "user01@seed.local" });

  const secondUser = await db
  .collection(COLLECTIONS.users)
  .findOne({ email: "user02@seed.local" }); 

  const topic = await db
    .collection(COLLECTIONS.topics)
    .findOne({ status: "ACTIVE" });

  if (!topic) {
    throw new Error("ACTIVE 상태의 테스트 주제가 필요합니다.");
  }

  const conversation =
    await createConversationForMatchedUsers({
      topicId: String(topic._id),
      matchType: "OPPOSITE",
      firstUser: firstUser,
      firstStance: "찬성",
      secondUser: secondUser,
      secondStance: "반대"
    });

  console.log("테스트 대화방 생성 완료");
  console.log("conversationId:", String(conversation._id));
  console.log("user1:", firstUser.email);
  console.log("user2:", secondUser.email);
}

main()
  .catch(console.error)
  .finally(closeMongoClient);