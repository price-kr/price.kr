import type { Env } from "./index";

export async function writeEvent(
  db: D1Database,
  type: string,
  keyword: string,
  value?: string
): Promise<void> {
  await db
    .prepare("INSERT INTO events (type, keyword, value) VALUES (?, ?, ?)")
    .bind(type, keyword, value ?? null)
    .run();
}

function stripControlChars(str: string): string {
  return str.replace(/[\x00-\x1f\x7f]/g, "");
}

function isValidOrigin(origin: string | null, env: Env): boolean {
  if (!origin) return false;
  try {
    const hostname = new URL(origin).hostname;
    return hostname === env.MAIN_DOMAIN;
  } catch {
    return false;
  }
}

export async function handleTrack(
  request: Request,
  env: Env
): Promise<Response> {
  const origin = request.headers.get("Origin");
  if (!isValidOrigin(origin, env)) {
    return new Response(null, { status: 403 });
  }

  const contentLength = request.headers.get("Content-Length");
  if (contentLength && parseInt(contentLength, 10) > 1024) {
    return new Response(null, { status: 400 });
  }

  let body: string;
  try {
    body = await request.text();
  } catch {
    return new Response(null, { status: 400 });
  }

  if (body.length > 1024) {
    return new Response(null, { status: 400 });
  }

  let data: { type?: string; keyword?: string; value?: string };
  try {
    data = JSON.parse(body);
  } catch {
    return new Response(null, { status: 400 });
  }

  if (data.type !== "pageview" && data.type !== "search") {
    return new Response(null, { status: 400 });
  }

  if (typeof data.keyword !== "string" || data.keyword.length === 0 || data.keyword.length > 100) {
    return new Response(null, { status: 400 });
  }

  if (data.value !== undefined && data.value !== null) {
    if (typeof data.value !== "string" || data.value.length > 100) {
      return new Response(null, { status: 400 });
    }
  }

  const keyword = stripControlChars(data.keyword);
  const value = data.value ? stripControlChars(data.value) : undefined;

  try {
    await writeEvent(env.TRACKING, data.type, keyword, value);
  } catch (e) {
    console.error("D1 write failed:", e);
  }

  return new Response(null, {
    status: 204,
    headers: corsHeaders(env.WEB_APP_ORIGIN),
  });
}

export function corsHeaders(origin: string): Headers {
  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", "POST");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Access-Control-Max-Age", "86400");
  return headers;
}
