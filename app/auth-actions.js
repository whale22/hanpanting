import { fromNodeHeaders } from "better-auth/node";

import { getAuth } from "../lib/auth.js";
import {
  validateLoginInput,
  validateSignupInput
} from "../lib/auth-validation.js";
import {
  copySetCookieHeaders,
  hasSameOrigin,
  readForm,
  redirect
} from "../lib/http.js";
import { getRuntimeConfig } from "../lib/runtime-config.js";

function readCredentials(form) {
  return {
    email: form.get("email"),
    name: form.get("name"),
    password: form.get("password")
  };
}

function rejectCrossSiteRequest(request, response) {
  const { authUrl } = getRuntimeConfig();
  const expectedOrigin = new URL(authUrl).origin;

  if (hasSameOrigin(request, expectedOrigin)) {
    return false;
  }

  response.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
  response.end("허용되지 않은 요청입니다.");
  return true;
}

async function finishAuthentication(
  authResponse,
  response,
  { failureLocation, successLocation }
) {
  if (!authResponse.ok) {
    redirect(response, failureLocation);
    return;
  }

  copySetCookieHeaders(authResponse.headers, response);
  redirect(response, successLocation);
}

export async function signIn(request, response) {
  if (rejectCrossSiteRequest(request, response)) {
    return;
  }

  const form = await readForm(request);
  const validation = validateLoginInput(readCredentials(form));

  if (!validation.ok) {
    redirect(response, `/login?error=${validation.errorCode}`);
    return;
  }

  const authResponse = await getAuth().api.signInEmail({
    body: validation.value,
    headers: fromNodeHeaders(request.headers),
    asResponse: true
  });

  await finishAuthentication(authResponse, response, {
    failureLocation: "/login?error=LOGIN_FAILED",
    successLocation: "/"
  });
}

export async function signUp(request, response) {
  if (rejectCrossSiteRequest(request, response)) {
    return;
  }

  const form = await readForm(request);
  const validation = validateSignupInput(readCredentials(form));

  if (!validation.ok) {
    redirect(response, `/signup?error=${validation.errorCode}`);
    return;
  }

  const authResponse = await getAuth().api.signUpEmail({
    body: validation.value,
    headers: fromNodeHeaders(request.headers),
    asResponse: true
  });

  await finishAuthentication(authResponse, response, {
    failureLocation: "/signup?error=SIGNUP_FAILED",
    successLocation: "/login?created=1"
  });
}

export async function signOut(request, response) {
  if (rejectCrossSiteRequest(request, response)) {
    return;
  }

  const authResponse = await getAuth().api.signOut({
    headers: fromNodeHeaders(request.headers),
    asResponse: true
  });

  copySetCookieHeaders(authResponse.headers, response);
  redirect(response, "/");
}
