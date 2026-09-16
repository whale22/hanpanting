import {
  findConversationCountsForUser
} from "./conversations.js";
import { findWaitingMatchRequest } from "./match-requests.js";
import { getMissingConfiguration } from "./runtime-config.js";
import { findActiveTopics } from "./topics.js";

export async function getHomePageData({ userId } = {}) {
  const missingConfiguration = getMissingConfiguration();
  let topics = [];
  let waitingMatchRequest = null;
  let matchHistoryCounts = {
    sameMatchCount: 0,
    oppositeMatchCount: 0
  };
  let databaseError = false;

  if (missingConfiguration.length === 0) {
    try {
      topics = await findActiveTopics();

  if (userId) {
    [
      waitingMatchRequest,
      matchHistoryCounts
    ] = await Promise.all([
      findWaitingMatchRequest(userId),
      findConversationCountsForUser(userId)
    ]);
  }
    } catch (_error) {
      databaseError = true;
    }
  }

  return {
    databaseError,
    matchHistoryCounts,
    needsConfiguration: missingConfiguration.length > 0,
    topics,
    waitingMatchRequest
  };
}
