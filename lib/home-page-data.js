import { findWaitingMatchRequest } from "./match-requests.js";
import { getMissingConfiguration } from "./runtime-config.js";
import { findActiveTopics } from "./topics.js";

export async function getHomePageData({ userId } = {}) {
  const missingConfiguration = getMissingConfiguration();
  let topics = [];
  let waitingMatchRequest = null;
  let databaseError = false;

  if (missingConfiguration.length === 0) {
    try {
      topics = await findActiveTopics();

      if (userId) {
        waitingMatchRequest = await findWaitingMatchRequest(userId);
      }
    } catch (_error) {
      databaseError = true;
    }
  }

  return {
    databaseError,
    needsConfiguration: missingConfiguration.length > 0,
    topics,
    waitingMatchRequest
  };
}
