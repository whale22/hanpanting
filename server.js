import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

import { toNodeHandler } from "better-auth/node";

import { signIn, signOut, signUp } from "./app/auth-actions.js";
import { createMatchRequest } from "./app/match-request-actions.js";
import {
  endConversation,
  sendConversationMessage
} from "./app/conversations/conversation-actions.js";
import { beginTemporaryMatch } from "./app/temporary-match-actions.js";
import { getAuth } from "./lib/auth.js";
import { openConversationEventStream } from "./lib/conversation-events.js";
import {
  processConversationLifecycleForConversation,
  startConversationLifecycleChecks,
  stopConversationLifecycleChecks
} from "./lib/conversation-lifecycle.js";
import {
  findConversationDetailForUser,
  findConversationForUser,
  findRecentConversationsForUser
} from "./lib/conversations.js";
import { getHomePageData } from "./lib/home-page-data.js";
import { redirect } from "./lib/http.js";
import { closeMongoClient, getDatabase } from "./lib/mongodb.js";
import { getMissingConfiguration } from "./lib/runtime-config.js";
import { getSession } from "./lib/session.js";
import { getTemporaryMatchStatus } from "./lib/temporary-matching.js";
import { closeUiRenderer, renderDocument } from "./lib/ui-renderer.js";

const port = Number(process.env.PORT ?? 3000);
const assets = new Map([
  [
    "/assets/simple.css",
    {
      path: new URL("./node_modules/simpledotcss/simple.min.css", import.meta.url),
      contentType: "text/css; charset=utf-8"
    }
  ],
  [
    "/assets/app.css",
    {
      path: new URL("./public/app.css", import.meta.url),
      contentType: "text/css; charset=utf-8"
    }
  ],
  [
    "/assets/chat.js",
    {
      path: new URL("./public/chat.js", import.meta.url),
      contentType: "text/javascript; charset=utf-8"
    }
  ],
  [
    "/assets/matching.js",
    {
      path: new URL("./public/matching.js", import.meta.url),
      contentType: "text/javascript; charset=utf-8"
    }
  ],
  [
    "/favicon.svg",
    {
      path: new URL("./public/favicon.svg", import.meta.url),
      contentType: "image/svg+xml"
    }
  ]
]);

let authHandler;

function setSecurityHeaders(response) {
  response.setHeader("x-content-type-options", "nosniff");
  response.setHeader("referrer-policy", "same-origin");
  response.setHeader("x-frame-options", "DENY");
  response.setHeader(
    "content-security-policy",
    "default-src 'self'; style-src 'self'; img-src 'self'; form-action 'self'; frame-ancestors 'none'"
  );
}

async function respondWithDocument(
  response,
  page,
  pageProperties,
  options = {}
) {
  const { session = null, statusCode = 200, title = "한판팅" } = options;
  const html = await renderDocument({ page, pageProperties, session, title });

  setSecurityHeaders(response);
  response.writeHead(statusCode, { "content-type": "text/html; charset=utf-8" });
  response.end(html);
}

async function serveAsset(pathname, response) {
  const asset = assets.get(pathname);

  if (!asset) {
    return false;
  }

  const content = await readFile(asset.path);
  setSecurityHeaders(response);
  response.writeHead(200, {
    "cache-control": "public, max-age=0, must-revalidate",
    "content-type": asset.contentType
  });
  response.end(content);
  return true;
}

async function readSessionOrNull(request) {
  if (getMissingConfiguration().length > 0) {
    return null;
  }

  try {
    return await getSession(request);
  } catch (_error) {
    return null;
  }
}

async function respondToHealthCheck(response) {
  const missingConfiguration = getMissingConfiguration();

  if (missingConfiguration.length > 0) {
    response.writeHead(503, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ status: "needs_configuration" }));
    return;
  }

  try {
    await getDatabase().command({ ping: 1 });
    response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ status: "ok" }));
  } catch (_error) {
    response.writeHead(503, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ status: "database_unavailable" }));
  }
}

async function handleRequest(request, response) {
  const requestUrl = new URL(request.url, `http://${request.headers.host ?? "localhost"}`);

  if (request.method === "GET" && await serveAsset(requestUrl.pathname, response)) {
    return;
  }

  if (requestUrl.pathname.startsWith("/api/auth/")) {
    authHandler ??= toNodeHandler(getAuth());
    await authHandler(request, response);
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/health") {
    await respondToHealthCheck(response);
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/auth/login") {
    await signIn(request, response);
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/auth/signup") {
    await signUp(request, response);
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/auth/logout") {
    await signOut(request, response);
    return;
  }

  const session = await readSessionOrNull(request);

  if (request.method === "GET" && requestUrl.pathname === "/") {
    if (!session) {
      redirect(response, "/login");
      return;
    }

    const showPreview = requestUrl.searchParams.get("preview") === "1";
    const pageProperties = await getHomePageData({ showPreview });
    await respondWithDocument(response, "home", pageProperties, { session });
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/conversations") {
    if (!session) {
      redirect(response, "/login");
      return;
    }

    const userId = String(session.user.id);
    const { conversations, topicsById } = await findRecentConversationsForUser(userId);
    await respondWithDocument(
      response,
      "conversationList",
      { conversations, topicsById, userId },
      { session, title: "내 대화방" }
    );
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/match-requests") {
    if (!session) {
      redirect(response, "/login");
      return;
    }

    await createMatchRequest(
      request,
      response,
      session
    );
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/temporary-match") {
    if (!session) {
      redirect(response, "/login");
      return;
    }

    await beginTemporaryMatch(request, response, session);
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/temporary-match/status") {
    if (!session) {
      response.writeHead(401, { "content-type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ status: "UNAUTHORIZED" }));
      return;
    }

    const result = await getTemporaryMatchStatus(String(session.user.id));
    response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify(result));
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/matching") {
    if (!session) {
      redirect(response, "/login");
      return;
    }

    const result = await getTemporaryMatchStatus(String(session.user.id));

    if (result.status === "MATCHED") {
      redirect(response, `/conversations/${result.conversationId}`);
      return;
    }

    if (result.status === "IDLE") {
      redirect(response, "/");
      return;
    }

    await respondWithDocument(response, "matching", {}, {
      session,
      title: "상대방 기다리는 중"
    });
    return;
  }

  const conversationMessagePathMatch = requestUrl.pathname.match(
    /^\/conversations\/([^/]+)\/messages$/
  );

  if (request.method === "POST" && conversationMessagePathMatch) {
    if (!session) {
      response.writeHead(401, { "content-type": "text/plain; charset=utf-8" });
      response.end("로그인이 필요합니다.");
      return;
    }

    await sendConversationMessage(request, response, {
      conversationId: conversationMessagePathMatch[1],
      session
    });
    return;
  }

  const conversationEndPathMatch = requestUrl.pathname.match(
    /^\/conversations\/([^/]+)\/end$/
  );

  if (request.method === "POST" && conversationEndPathMatch) {
    if (!session) {
      response.writeHead(401, { "content-type": "text/plain; charset=utf-8" });
      response.end("로그인이 필요합니다.");
      return;
    }

    await endConversation(request, response, {
      conversationId: conversationEndPathMatch[1],
      session
    });
    return;
  }

  const conversationEventPathMatch = requestUrl.pathname.match(
    /^\/conversations\/([^/]+)\/events$/
  );

  if (request.method === "GET" && conversationEventPathMatch) {
    if (!session) {
      response.writeHead(401, { "content-type": "text/plain; charset=utf-8" });
      response.end("로그인이 필요합니다.");
      return;
    }

    const conversationId = conversationEventPathMatch[1];
    const userId = String(session.user.id);

    await processConversationLifecycleForConversation(conversationId);

    const conversation = await findConversationForUser(conversationId, userId);

    if (!conversation || conversation.status !== "ACTIVE") {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("활성 상태인 대화방을 찾을 수 없습니다.");
      return;
    }

    setSecurityHeaders(response);
    openConversationEventStream(request, response, { conversationId, userId });
    return;
  }

  const conversationPathMatch = requestUrl.pathname.match(
    /^\/conversations\/([^/]+)$/
  );

  if (request.method === "GET" && conversationPathMatch) {
    if (!session) {
      redirect(response, "/login");
      return;
    }

    const userId = String(session.user.id);

    await processConversationLifecycleForConversation(
      conversationPathMatch[1]
    );

    const detail = await findConversationDetailForUser(
      conversationPathMatch[1],
      userId
    );

    if (!detail) {
      await respondWithDocument(
        response,
        "message",
        {
          heading: "대화방을 찾을 수 없습니다",
          message: "대화방 주소를 확인하거나 내 대화방 목록으로 돌아가 주세요."
        },
        { session, statusCode: 404, title: "대화방 없음" }
      );
      return;
    }

    await respondWithDocument(
      response,
      "conversationDetail",
      { ...detail, userId },
      { session, title: "대화 내용" }
    );
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/login") {
    await respondWithDocument(
      response,
      "login",
      {
        accountCreated: requestUrl.searchParams.get("created") === "1",
        errorCode: requestUrl.searchParams.get("error")
      },
      { session, title: "로그인" }
    );
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/signup") {
    await respondWithDocument(
      response,
      "signup",
      { errorCode: requestUrl.searchParams.get("error") },
      { session, title: "가입하기" }
    );
    return;
  }

  await respondWithDocument(
    response,
    "message",
    {
      heading: "페이지를 찾을 수 없습니다",
      message: "주소를 다시 확인해 주세요."
    },
    { session, statusCode: 404, title: "페이지 없음" }
  );
}

const server = createServer((request, response) => {
  handleRequest(request, response).catch(async (error) => {
    console.error(error);

    if (response.headersSent) {
      response.end();
      return;
    }

    try {
      await respondWithDocument(
        response,
        "message",
        {
          heading: "요청을 처리하지 못했습니다",
          message: "잠시 후 다시 시도해 주세요."
        },
        { statusCode: 500, title: "오류" }
      );
    } catch (renderError) {
      console.error(renderError);
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end("요청을 처리하지 못했습니다.");
    }
  });
});

server.listen(port, () => {
  console.log(`한판팅 개발 서버: http://localhost:${port}`);
});

if (getMissingConfiguration().length === 0) {
  startConversationLifecycleChecks();
}

async function shutdown() {
  stopConversationLifecycleChecks();
  server.close();
  await closeUiRenderer();
  await closeMongoClient();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
