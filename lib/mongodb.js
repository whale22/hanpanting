import { MongoClient } from "mongodb";

import { getRuntimeConfig } from "./runtime-config.js";

let mongoClient;

export function getMongoClient() {
  if (!mongoClient) {
    const { mongoUri } = getRuntimeConfig();

    mongoClient = new MongoClient(mongoUri, {
      serverSelectionTimeoutMS: 3000
    });
  }

  return mongoClient;
}

export function getDatabase() {
  return getMongoClient().db();
}

export async function closeMongoClient() {
  if (!mongoClient) {
    return;
  }

  await mongoClient.close();
  mongoClient = undefined;
}
