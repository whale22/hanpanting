const REQUIRED_CONFIGURATION = [
  "MONGODB_URI",
  "BETTER_AUTH_URL",
  "BETTER_AUTH_SECRET"
];

export function getMissingConfiguration() {
  return REQUIRED_CONFIGURATION.filter((name) => !process.env[name]);
}

export function getRuntimeConfig() {
  const missingConfiguration = getMissingConfiguration();

  if (missingConfiguration.length > 0) {
    throw new Error(
      `필수 환경 변수가 없습니다: ${missingConfiguration.join(", ")}`
    );
  }

  if (process.env.BETTER_AUTH_SECRET.length < 32) {
    throw new Error("BETTER_AUTH_SECRET은 32자 이상이어야 합니다.");
  }

  return {
    authSecret: process.env.BETTER_AUTH_SECRET,
    authUrl: process.env.BETTER_AUTH_URL,
    mongoUri: process.env.MONGODB_URI
  };
}
