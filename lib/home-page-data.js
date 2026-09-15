import { getMissingConfiguration } from "./runtime-config.js";
import { findActiveTopics } from "./topics.js";

export async function getHomePageData() {
  const missingConfiguration = getMissingConfiguration();
  let topics = [];
  let databaseError = false;

  if (missingConfiguration.length === 0) {
    try {
      topics = await findActiveTopics();
    } catch (_error) {
      databaseError = true;
    }
  }

  return {
    databaseError,
    needsConfiguration: missingConfiguration.length > 0,
    topics
  };
}