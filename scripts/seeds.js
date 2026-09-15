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

const seedUsers = [
  ...Array.from({ length: 5 }, (_, index) => {
    const paddedIndex = String(index + 1).padStart(2, "0");

    return {
      email: `user${paddedIndex}@seed.local`,
      name: `개발 사용자 ${paddedIndex}`,
      role: "USER"
    };
  }),
  {
    email: "admin01@seed.local",
    name: "개발 관리자",
    role: "ADMIN"
  }
];

async function clearSeedCollections(database) {
  const collectionNames = Object.values(COLLECTIONS);

  for (const collectionName of collectionNames) {
    await database.collection(collectionName).deleteMany({});
  }
}

async function dropIndexIfExists(collection, indexName) {
  try {
    await collection.dropIndex(indexName);
  } catch (error) {
    if (error.codeName !== "IndexNotFound") {
      throw error;
    }
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
    { key: { topicId: 1, matchType: 1, stance: 1, status: 1, createdAt: 1 } }
  ]);
  const conversationsCollection = database.collection(COLLECTIONS.conversations);
  await conversationsCollection.createIndexes([
    { key: { "participants.userId": 1, createdAt: -1 } },
    { key: { topicId: 1, status: 1 } }
  ]);
  await dropIndexIfExists(
    conversationsCollection,
    "participants.userId_1_updatedAt_-1"
  );

  const messagesCollection = database.collection(COLLECTIONS.messages);
  await messagesCollection.createIndexes([
    { key: { conversationId: 1, createdAt: -1 } },
    { key: { senderUserId: 1, createdAt: -1 } }
  ]);
  await dropIndexIfExists(messagesCollection, "conversationId_1_createdAt_1");
}

async function createSeedUsers(database) {
  const password = process.env.SEED_PASSWORD ?? "Seed1234!";
  const auth = getAuth();

  for (const user of seedUsers) {
    await auth.api.signUpEmail({
      body: {
        email: user.email,
        name: user.name,
        password
      }
    });
  }

  const adminUpdateResult = await database.collection(COLLECTIONS.users).updateOne(
    { email: "admin01@seed.local" },
    { $set: { role: "ADMIN" } }
  );

  if (adminUpdateResult.matchedCount !== 1) {
    throw new Error("Seed 관리자 계정을 찾지 못했습니다.");
  }

  const userEmails = seedUsers.map((user) => user.email);
  const createdUsers = await database.collection(COLLECTIONS.users)
    .find({ email: { $in: userEmails } })
    .toArray();

  if (createdUsers.length !== seedUsers.length) {
    throw new Error(
      `Seed 사용자 수가 올바르지 않습니다: ${createdUsers.length}/${seedUsers.length}`
    );
  }

  const createdUsersByEmail = new Map(
    createdUsers.map((user) => [user.email, user])
  );

  for (const expectedUser of seedUsers) {
    const createdUser = createdUsersByEmail.get(expectedUser.email);

    if (
      createdUser?.name !== expectedUser.name
      || createdUser?.role !== expectedUser.role
      || createdUser?.status !== "ONLINE"
    ) {
      throw new Error(`Seed 사용자 정보가 올바르지 않습니다: ${expectedUser.email}`);
    }
  }

  const credentialAccounts = await database.collection(COLLECTIONS.accounts)
    .find({
      providerId: "credential",
      userId: { $in: createdUsers.map((user) => user._id) }
    })
    .toArray();

  if (credentialAccounts.length !== seedUsers.length) {
    throw new Error(
      `Seed 인증 계정 수가 올바르지 않습니다: ${credentialAccounts.length}/${seedUsers.length}`
    );
  }

  const credentialUserIds = new Set(
    credentialAccounts.map((account) => account.userId.toString())
  );

  for (const createdUser of createdUsers) {
    if (!credentialUserIds.has(createdUser._id.toString())) {
      throw new Error(`Seed 인증 계정이 없습니다: ${createdUser.email}`);
    }
  }

  const hasInvalidPasswordHash = credentialAccounts.some((account) => (
    typeof account.password !== "string"
    || account.password.length === 0
    || account.password === password
  ));

  if (hasInvalidPasswordHash) {
    throw new Error("Seed 인증 계정의 비밀번호 해시가 올바르지 않습니다.");
  }

  return createdUsers.length;
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
  const seedUserCount = await createSeedUsers(database);

  console.log(
    `${databaseName}에 개발용 주제 ${topics.length}개와 계정 ${seedUserCount}개를 준비했습니다.`
  );
}

seed()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(closeMongoClient);
