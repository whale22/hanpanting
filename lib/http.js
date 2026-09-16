const MAX_FORM_BYTES = 10 * 1024;

export async function readForm(request) {
  const contentType = request.headers["content-type"] ?? "";

  if (!contentType.startsWith("application/x-www-form-urlencoded")) {
    throw new Error("지원하지 않는 폼 형식입니다.");
  }

  const chunks = [];
  let receivedBytes = 0;

  for await (const chunk of request) {
    receivedBytes += chunk.length;

    if (receivedBytes > MAX_FORM_BYTES) {
      throw new Error("폼 데이터가 너무 큽니다.");
    }

    chunks.push(chunk);
  }

  return new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
}

export function hasSameOrigin(request, allowedOrigins) {
  const origin = request.headers.origin;
  const fetchSite = request.headers["sec-fetch-site"];
  const trustedOrigins = Array.isArray(allowedOrigins)
    ? allowedOrigins
    : [allowedOrigins];

  if (!origin || !trustedOrigins.includes(origin)) {
    return false;
  }

  return !fetchSite || fetchSite === "same-origin";
}

export function copySetCookieHeaders(sourceHeaders, response) {
  if (typeof sourceHeaders.getSetCookie === "function") {
    const cookies = sourceHeaders.getSetCookie();

    if (cookies.length > 0) {
      response.setHeader("set-cookie", cookies);
    }

    return;
  }

  const cookie = sourceHeaders.get("set-cookie");

  if (cookie) {
    response.setHeader("set-cookie", cookie);
  }
}

export function redirect(response, location) {
  response.writeHead(303, { location });
  response.end();
}
