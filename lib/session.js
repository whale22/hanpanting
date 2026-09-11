import { fromNodeHeaders } from "better-auth/node";

import { getAuth } from "./auth.js";

export async function getSession(request) {
  return getAuth().api.getSession({
    headers: fromNodeHeaders(request.headers)
  });
}
