import serverless from "serverless-http";
import { app, startup } from "../../server/index.js";

const handler = serverless(app);

const toServerlessEvent = async (request) => {
  if (!request || typeof request.text !== "function") return request;

  const method = String(request.method ?? "GET").toUpperCase();
  const url = new URL(String(request.url));
  const body = method === "GET" || method === "HEAD" ? null : await request.text();
  return {
    version: "2.0",
    routeKey: "$default",
    rawPath: url.pathname,
    rawQueryString: url.search.slice(1),
    headers: Object.fromEntries(request.headers),
    requestContext: {
      http: { method, path: url.pathname, protocol: "HTTP/1.1" },
    },
    body,
    isBase64Encoded: false,
  };
};

const toNetlifyResponse = (result) => {
  if (result instanceof Response) return result;

  const headers = new Headers(result?.headers ?? {});
  const body = result?.isBase64Encoded && result.body
    ? Uint8Array.from(atob(result.body), (character) => character.charCodeAt(0))
    : result?.body ?? null;
  return new Response(body, { status: result?.statusCode ?? 200, headers });
};

export default async (event, context) => {
  const databaseReady = await startup;
  if (!databaseReady) {
    return new Response(JSON.stringify({ error: "La API no está disponible. Revisa la conexión con PostgreSQL." }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
  return toNetlifyResponse(await handler(await toServerlessEvent(event), context));
};
