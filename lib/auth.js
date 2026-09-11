import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { betterAuth } from "better-auth/minimal";

import { getMongoClient, getDatabase } from "./mongodb.js";
import { getRuntimeConfig } from "./runtime-config.js";

let authInstance;

export function getAuth() {
  if (authInstance) {
    return authInstance;
  }

  const { authSecret, authUrl } = getRuntimeConfig();
  const client = getMongoClient();

  authInstance = betterAuth({
    appName: "한판팅",
    baseURL: authUrl,
    secret: authSecret,
    database: mongodbAdapter(getDatabase(), { client }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      autoSignIn: false
    },
    user: {
      additionalFields: {
        role: {
          type: ["USER", "ADMIN"],
          required: false,
          defaultValue: "USER",
          input: false
        },
        status: {
          type: ["ONLINE", "MATCHING", "ACTIVE", "SUSPENDED"],
          required: false,
          defaultValue: "ONLINE",
          input: false
        },
        lastLoginAt: {
          type: "date",
          required: false,
          input: false
        }
      }
    },
    advanced: {
      database: {
        joins: true
      }
    }
  });

  return authInstance;
}
