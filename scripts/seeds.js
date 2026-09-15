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

const anonymousNames = [
  "차분한 고래",
  "용감한 수달",
  "다정한 여우",
  "생각하는 부엉이",
  "느긋한 판다",
  "반짝이는 돌고래"
];

const avatarCodes = [
  "blue-whale",
  "green-otter",
  "orange-fox",
  "purple-owl",
  "red-panda",
  "yellow-dolphin"
];

const exampleMessages = [
  "안면인식 기술이 실종자 수색이나 범죄 예방에 도움이 된다고 생각해요.",
  "효과는 이해하지만 시민의 얼굴 정보가 상시 수집되는 점이 걱정돼요.",
  "사용 장소와 보관 기간을 엄격하게 제한하면 위험을 줄일 수 있지 않을까요?",
  "한번 수집된 정보가 다른 목적으로 쓰이지 않도록 감시할 방법도 필요해 보여요.",
  "독립적인 기관이 사용 기록을 검사하고 위반 시 처벌하도록 하면 좋겠네요.",
  "그런 장치가 실제로 작동한다면 제한적인 도입은 검토할 수 있을 것 같아요.",
  "모든 장소가 아니라 위험이 큰 곳부터 시험하는 방식은 어떨까요?",
  "시범 운영 결과와 오류율을 시민에게 공개한다는 조건이라면 동의해요.",
  "기술 도입만큼 투명한 운영 원칙이 중요하다는 점은 같은 생각이에요.",
  "네, 안전과 개인정보 보호를 함께 확인하면서 판단해야겠네요."
];

function pickTwoDifferentValues(values) {
  const firstIndex = Math.floor(Math.random() * values.length);
  let secondIndex = Math.floor(Math.random() * (values.length - 1));

  if (secondIndex >= firstIndex) {
    secondIndex += 1;
  }

  return [values[firstIndex], values[secondIndex]];
}

function getYesterdayAtTenPMInSeoul() {
  const seoulDateParts = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "numeric",
    timeZone: "Asia/Seoul",
    year: "numeric"
  }).formatToParts(new Date());
  const datePartValues = Object.fromEntries(
    seoulDateParts.map((part) => [part.type, part.value])
  );
  const year = Number(datePartValues.year);
  const month = Number(datePartValues.month);
  const day = Number(datePartValues.day);

  // 한국시간 22시는 UTC 13시입니다. Date.UTC가 월과 연도 경계도 처리합니다.
  return new Date(Date.UTC(year, month - 1, day - 1, 13, 0, 0));
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

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

  return createdUsers;
}

async function createExampleConversation(
  database,
  createdUsers,
  topicId,
  conversationStartedAt
) {
  const usersByEmail = new Map(
    createdUsers.map((user) => [user.email, user])
  );
  const firstUser = usersByEmail.get("user01@seed.local");
  const secondUser = usersByEmail.get("user02@seed.local");

  if (!firstUser || !secondUser) {
    throw new Error("예시 대화에 사용할 Seed 사용자를 찾지 못했습니다.");
  }

  const [firstAnonymousName, secondAnonymousName] = pickTwoDifferentValues(anonymousNames);
  const [firstAvatarCode, secondAvatarCode] = pickTwoDifferentValues(avatarCodes);
  const lastMessageAt = addMinutes(
    conversationStartedAt,
    exampleMessages.length - 1
  );
  const conversationEndedAt = addMinutes(lastMessageAt, 10);
  const firstUserId = String(firstUser._id);
  const secondUserId = String(secondUser._id);

  const conversationResult = await database
    .collection(COLLECTIONS.conversations)
    .insertOne({
      topicId: String(topicId),
      matchType: "OPPOSITE",
      participants: [
        {
          userId: firstUserId,
          stance: "AGREE",
          anonymousName: firstAnonymousName,
          avatarCode: firstAvatarCode,
          joinedAt: conversationStartedAt,
          leftAt: conversationEndedAt
        },
        {
          userId: secondUserId,
          stance: "DISAGREE",
          anonymousName: secondAnonymousName,
          avatarCode: secondAvatarCode,
          joinedAt: conversationStartedAt,
          leftAt: conversationEndedAt
        }
      ],
      status: "ENDED",
      lastMessageAt,
      endedAt: conversationEndedAt,
      endReason: "IDLE",
      createdAt: conversationStartedAt,
      updatedAt: conversationEndedAt
    });
  const conversationId = String(conversationResult.insertedId);
  const messages = exampleMessages.map((content, index) => ({
    conversationId,
    senderUserId: index % 2 === 0 ? firstUserId : secondUserId,
    content,
    createdAt: addMinutes(conversationStartedAt, index)
  }));

  await database.collection(COLLECTIONS.messages).insertMany(messages);
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
  const exampleConversationStartedAt = getYesterdayAtTenPMInSeoul();
  const topicInsertResult = await database.collection(COLLECTIONS.topics).insertMany(
    topics.map((topic) => ({
      ...topic,
      startsAt: exampleConversationStartedAt,
      createdAt: now,
      updatedAt: now
    }))
  );
  const createdUsers = await createSeedUsers(database);
  await createExampleConversation(
    database,
    createdUsers,
    topicInsertResult.insertedIds[0],
    exampleConversationStartedAt
  );

  console.log(
    `${databaseName}에 개발용 주제 ${topics.length}개, 계정 ${createdUsers.length}개, 예시 대화 1개를 준비했습니다.`
  );
}

seed()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(closeMongoClient);
