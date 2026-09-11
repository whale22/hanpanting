import { COLLECTIONS } from "./collections.js";
import { getDatabase } from "./mongodb.js";

export async function findActiveTopics(now = new Date()) {
  return getDatabase()
    .collection(COLLECTIONS.topics)
    .find({
      status: "ACTIVE",
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
    })
    .sort({ startsAt: -1, createdAt: -1 })
    .limit(12)
    .toArray();
}
