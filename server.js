import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { toNodeHandler } from "better-auth/node";

import { signIn, signOut, signUp } from "./app/auth-actions.js";
import { Layout } from "./app/layout.js";
import LoginPage from "./app/login/page.js";
import MessagePage from "./app/message-page.js";
import Page from "./app/page.js";
import SignupPage from "./app/signup/page.js";
import { getAuth } from "./lib/auth.js";
import { closeMongoClient, getDatabase } from "./lib/mongodb.js";
import { getMissingConfiguration } from "./lib/runtime-config.js";
import { getSession } from "./lib/session.js";

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

function respondWithDocument(response, content, options = {}) {
  const { session = null, statusCode = 200, title = "한판팅" } = options;
  const document = React.createElement(Layout, { session, title }, content);
  const html = `<!doctype html>${renderToStaticMarkup(document)}`;

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
    const showPreview = requestUrl.searchParams.get("preview") === "1";
    respondWithDocument(response, await Page({ session, showPreview }), { session });
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/login") {
    const content = await LoginPage({
      accountCreated: requestUrl.searchParams.get("created") === "1",
      errorCode: requestUrl.searchParams.get("error")
    });
    respondWithDocument(response, content, { session, title: "로그인" });
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/signup") {
    const content = await SignupPage({ errorCode: requestUrl.searchParams.get("error") });
    respondWithDocument(response, content, { session, title: "가입하기" });
    return;
  }

  const notFoundPage = React.createElement(MessagePage, {
    heading: "페이지를 찾을 수 없습니다",
    message: "주소를 다시 확인해 주세요."
  });
  respondWithDocument(response, notFoundPage, {
    session,
    statusCode: 404,
    title: "페이지 없음"
  });
}

const server = createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    console.error(error);

    if (response.headersSent) {
      response.end();
      return;
    }

    const errorPage = React.createElement(MessagePage, {
      heading: "요청을 처리하지 못했습니다",
      message: "잠시 후 다시 시도해 주세요."
    });
    respondWithDocument(response, errorPage, {
      statusCode: 500,
      title: "오류"
    });
  });
});

server.listen(port, () => {
  console.log(`한판팅 개발 서버: http://localhost:${port}`);
});

async function shutdown() {
  server.close();
  await closeMongoClient();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
