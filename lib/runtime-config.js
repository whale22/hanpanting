const REQUIRED_CONFIGURATION = [
  "MONGODB_URI",
  "BETTER_AUTH_URL",
  "BETTER_AUTH_SECRET"
];

export function getMissingConfiguration() {
  return REQUIRED_CONFIGURATION.filter((name) => !process.env[name]);
}

export function parseTrustedOrigins(authUrl, configuredOrigins = "") {
  const originValues = [
    authUrl,
    ...configuredOrigins.split(",")
  ];
  const trustedOrigins = new Set();

  for (const value of originValues) {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      continue;
    }

    const url = new URL(trimmedValue);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error(`허용 출처는 HTTP 주소여야 합니다: ${trimmedValue}`);
    }

    trustedOrigins.add(url.origin);
  }

  return [...trustedOrigins];
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

  const authUrl = process.env.BETTER_AUTH_URL;

  return {
    authSecret: process.env.BETTER_AUTH_SECRET,
    authUrl,
    mongoUri: process.env.MONGODB_URI,
    trustedOrigins: parseTrustedOrigins(
      authUrl,
      process.env.BETTER_AUTH_TRUSTED_ORIGINS
    )
  };
}
