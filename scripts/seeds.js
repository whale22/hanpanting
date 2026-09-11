import { getAuth } from "../lib/auth.js";
import { COLLECTIONS } from "../lib/collections.js";
import { closeMongoClient, getDatabase } from "../lib/mongodb.js";
import { isSafeSeedDatabaseName } from "./seed-safety.js";

const topics = [
  {
    title: "공공장소의 안면인식 기술 도입을 확대해야 할까요?",
    options: [
      { code: "AGREE", label: "확대에 찬성" },
      { code: "DISAGREE", label: "확대에 반대" }
    ],
    status: "ACTIVE"
  },
  {
    title: "생성형 AI 결과물에 별도 표시를 의무화해야 할까요?",
    options: [
      { code: "AGREE", label: "의무화에 찬성" },
      { code: "DISAGREE", label: "의무화에 반대" }
    ],
    status: "ACTIVE"
  },
  {
    title: "도심 혼잡 구간에 혼잡통행료를 도입해야 할까요?",
    options: [
      { code: "AGREE", label: "도입에 찬성" },
      { code: "DISAGREE", label: "도입에 반대" }
    ],
    status: "ACTIVE"
  },
  {
    title: "청소년의 소셜미디어 이용 시간을 법으로 제한해야 할까요?",
    options: [
      { code: "AGREE", label: "도입에 찬성" },
      { code: "DISAGREE", label: "도입에 반대" }
    ],
    status: "ACTIVE"
  }
];

async function clearSeedCollections(database) {
  const collectionNames = Object.values(COLLECTIONS);

  for (const collectionName of collectionNames) {
    await database.collection(collectionName).deleteMany({});
  }
}

async function createIndexes(database) {
  await database.collection(COLLECTIONS.users).createIndex(
    { email: 1 },
    { unique: true }
  );
  await database.collection(COLLECTIONS.sessions).createIndexes([
    { key: { token: 1 }, unique: true },
    { key: { userId: 1, expiresAt: 1 } }
  ]);
  await database.collection(COLLECTIONS.accounts).createIndexes([
    { key: { userId: 1 } },
    { key: { providerId: 1, accountId: 1 }, unique: true }
  ]);
  await database.collection(COLLECTIONS.verifications).createIndex({
    identifier: 1,
    expiresAt: 1
  });
  await database.collection(COLLECTIONS.topics).createIndexes([
    { key: { status: 1, startsAt: -1, expiresAt: 1 } },
    { key: { title: 1 }, unique: true }
  ]);
  await database.collection(COLLECTIONS.matchRequests).createIndexes([
    {
      key: { userId: 1 },
      name: "one_waiting_match_per_user",
      unique: true,
      partialFilterExpression: { status: "WAITING" }
    },
    { key: { userId: 1, status: 1 } },
    { key: { topicId: 1, matchingMode: 1, stance: 1, status: 1, createdAt: 1 } }
  ]);
  await database.collection(COLLECTIONS.conversations).createIndexes([
    { key: { "participants.userId": 1, updatedAt: -1 } },
    { key: { topicId: 1, status: 1 } }
  ]);
  await database.collection(COLLECTIONS.messages).createIndexes([
    { key: { conversationId: 1, createdAt: 1 } },
    { key: { senderUserId: 1, createdAt: -1 } }
  ]);
}

async function createSeedUsers(database) {
  const password = process.env.SEED_PASSWORD ?? "Seed1234!";
  const auth = getAuth();

  for (let index = 1; index <= 5; index += 1) {
    const paddedIndex = String(index).padStart(2, "0");

    await auth.api.signUpEmail({
      body: {
        email: `user${paddedIndex}@seed.local`,
        name: `개발 사용자 ${paddedIndex}`,
        password
      }
    });
  }

  await auth.api.signUpEmail({
    body: {
      email: "admin01@seed.local",
      name: "개발 관리자",
      password
    }
  });

  await database.collection(COLLECTIONS.users).updateOne(
    { email: "admin01@seed.local" },
    { $set: { role: "ADMIN" } }
  );
}

async function seed() {
  const database = getDatabase();
  const databaseName = database.databaseName;

  if (!isSafeSeedDatabaseName(databaseName)) {
    throw new Error(
      `안전을 위해 개발용 이름의 DB에서만 Seed를 실행할 수 있습니다: ${databaseName}`
    );
  }

  await database.command({ ping: 1 });
  await clearSeedCollections(database);
  await createIndexes(database);

  const now = new Date();
  await database.collection(COLLECTIONS.topics).insertMany(
    topics.map((topic) => ({
      ...topic,
      startsAt: now,
      createdAt: now,
      updatedAt: now
    }))
  );
  await createSeedUsers(database);

  console.log(`${databaseName}에 개발용 주제와 계정을 준비했습니다.`);
}

seed()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(closeMongoClient);
