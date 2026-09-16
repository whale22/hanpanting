import { hasSameOrigin, redirect } from "../lib/http.js";
import { getRuntimeConfig } from "../lib/runtime-config.js";
import { startTemporaryMatch } from "../lib/temporary-matching.js";

export async function beginTemporaryMatch(request, response, session) {
  const { authUrl } = getRuntimeConfig();

  if (!hasSameOrigin(request, new URL(authUrl).origin)) {
    response.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
    response.end("허용되지 않은 요청입니다.");
    return;
  }

  const result = await startTemporaryMatch(String(session.user.id));

  if (result.status === "MATCHED") {
    redirect(response, `/conversations/${result.conversationId}`);
    return;
  }

  redirect(response, "/matching");
}
