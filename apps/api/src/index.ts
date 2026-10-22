// Worker de archivos. Dos buckets de R2:
//  PRIVATE: originales (o/<id>) y versiones ligeras (p/<id>). Solo se leen con un enlace firmado.
//  PUBLIC:  copias ligeras de las fotos elegidas para la web (p/<id>) y recursos públicos (a/<id>);
//           se sirven directo desde el dominio del bucket, sin pasar por este Worker.
// Quién puede qué lo decide Supabase (funciones is_admin y readable_keys, con la sesión de quien pide).
export interface Env {
  PRIVATE: R2Bucket;
  PUBLIC: R2Bucket;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SIGNING_SECRET: string;
  ALLOWED_ORIGINS: string;
  CAP_BYTES: string;
}

const ID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const KEY = new RegExp(`^(o|p|a)/(${ID})$`);
const SIGN_TTL = 2 * 3600; // segundos; el cliente renueva antes
const MAX_BODY = 95_000_000; // el plan gratis de Workers rechaza cuerpos de más de 100 MB
const OVERHEAD = 1.1; // las versiones ligeras y copias públicas no se miden: margen sobre el total

const text = (s: string, status: number, h: HeadersInit = {}) => new Response(s, { status, headers: h });

export default { fetch: (req: Request, env: Env) => handle(req, env) };

export async function handle(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const origin = req.headers.get("origin");
  const allowed = origin && env.ALLOWED_ORIGINS.split(",").includes(origin);
  const cors: Record<string, string> = allowed
    ? { "access-control-allow-origin": origin, vary: "origin" }
    : { vary: "origin" };
  const reply = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        ...cors,
        "access-control-allow-methods": "GET,PUT,POST,DELETE,OPTIONS",
        "access-control-allow-headers": "authorization,content-type",
        "access-control-max-age": "86400",
      },
    });
  }

  // Lectura con enlace firmado: quien tiene el enlace lo abre (img, video, descarga).
  const file = url.pathname.match(new RegExp(`^/f/(o|p)/(${ID})$`));
  if (file && (req.method === "GET" || req.method === "HEAD")) return serve(req, env, url, `${file[1]}/${file[2]}`);

  try {
    const token = req.headers.get("authorization")?.replace(/^Bearer /i, "");
    if (!token) return reply({ error: "Inicia sesión." }, 401);

    if (req.method === "POST" && url.pathname === "/sign") {
      const { keys } = (await req.json()) as { keys?: unknown };
      if (!Array.isArray(keys) || keys.length > 500 || !keys.every((k) => typeof k === "string" && /^(o|p)\//.test(k) && KEY.test(k)))
        return reply({ error: "Llaves no válidas." }, 400);
      const ok = (await rpc<string[]>(env, "readable_keys", token, { p_keys: keys })) ?? [];
      const exp = Math.floor(Date.now() / 1000) + SIGN_TTL;
      const urls: Record<string, string> = {};
      for (const k of ok) urls[k] = `${url.origin}/f/${k}?e=${exp}&s=${await sign(env, k, exp)}`;
      return reply({ urls });
    }

    // todo lo demás es solo del admin
    if (!(await rpc<boolean>(env, "is_admin", token, {}))) return reply({ error: "Solo el administrador." }, 403);

    const m = url.pathname.match(new RegExp(`^/(u/o|u/p|u/a|m|pub)/(${ID})(/done)?$`));
    if (url.pathname === "/rm" && req.method === "POST") {
      const { keys } = (await req.json()) as { keys?: string[] };
      for (const k of (keys ?? []).slice(0, 500)) {
        const [, kind, id] = k.match(KEY) ?? []; // las llaves antiguas (assets/...) no son de R2
        if (kind === "a") await env.PUBLIC.delete(`a/${id}`);
        else if (kind) {
          await env.PRIVATE.delete([`o/${id}`, `p/${id}`]);
          await env.PUBLIC.delete(`p/${id}`);
        }
      }
      return reply({ ok: true });
    }
    if (!m) return reply({ error: "No existe." }, 404);
    const [, route, id, done] = m;
    const type = req.headers.get("content-type") ?? "application/octet-stream";
    const size = Number(req.headers.get("content-length") ?? url.searchParams.get("size") ?? 0);

    if (route.startsWith("u/") && req.method === "PUT") {
      if (!req.body || size > MAX_BODY) return reply({ error: "Archivo demasiado grande para una sola subida." }, 413);
      if (route !== "u/a" && !(await hasRoom(env, token, size))) return reply({ error: "Se llegó al tope de almacenamiento." }, 507);
      const pub = route === "u/a";
      const key = `${route === "u/o" ? "o" : route === "u/p" ? "p" : "a"}/${id}`;
      await (pub ? env.PUBLIC : env.PRIVATE).put(key, req.body, {
        httpMetadata: { contentType: type, cacheControl: "public, max-age=31536000, immutable" },
      });
      return reply({ key });
    }

    if (route === "m") {
      const key = `o/${id}`;
      const uploadId = url.searchParams.get("u") ?? "";
      if (req.method === "POST" && !done) {
        if (!(await hasRoom(env, token, size))) return reply({ error: "Se llegó al tope de almacenamiento." }, 507);
        const up = await env.PRIVATE.createMultipartUpload(key, { httpMetadata: { contentType: type } });
        return reply({ uploadId: up.uploadId });
      }
      const up = env.PRIVATE.resumeMultipartUpload(key, uploadId);
      if (req.method === "PUT" && req.body) {
        if (size > MAX_BODY) return reply({ error: "Parte demasiado grande." }, 413);
        const part = await up.uploadPart(Number(url.searchParams.get("n")), req.body);
        return reply({ etag: part.etag });
      }
      if (req.method === "POST" && done) {
        const { parts } = (await req.json()) as { parts: R2UploadedPart[] };
        await up.complete(parts);
        return reply({ key });
      }
      if (req.method === "DELETE") {
        await up.abort();
        return reply({ ok: true });
      }
    }

    if (route === "pub") {
      if (req.method === "POST") {
        const src = await env.PRIVATE.get(`p/${id}`);
        if (!src) return reply({ error: "No hay versión ligera." }, 404);
        await env.PUBLIC.put(`p/${id}`, src.body, {
          httpMetadata: { contentType: src.httpMetadata?.contentType, cacheControl: "public, max-age=31536000, immutable" },
        });
        return reply({ ok: true });
      }
      if (req.method === "DELETE") {
        await env.PUBLIC.delete(`p/${id}`);
        return reply({ ok: true });
      }
    }
    return reply({ error: "No existe." }, 404);
  } catch (e) {
    return reply({ error: e instanceof Error ? e.message : "Error." }, e instanceof HttpError ? e.status : 500);
  }
}

class HttpError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/** Llama a una función de Supabase con la sesión de quien pide; Supabase valida el token. */
async function rpc<T>(env: Env, fn: string, token: string, args: object): Promise<T | null> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: env.SUPABASE_ANON_KEY, authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(args),
  });
  if (res.status === 401 || res.status === 403) throw new HttpError("Sesión no válida.", 401);
  if (!res.ok) throw new HttpError("No se pudo consultar permisos.", 502);
  return (await res.json()) as T;
}

async function hasRoom(env: Env, token: string, incoming: number) {
  const used = Number(await rpc<number>(env, "storage_used_bytes", token, {})) || 0;
  return used * OVERHEAD + incoming <= Number(env.CAP_BYTES);
}

// ---- enlaces firmados: HMAC(llave + expiración) con un secreto que solo conoce el Worker ----
const hmacKey = (env: Env, usage: "sign" | "verify") =>
  crypto.subtle.importKey("raw", new TextEncoder().encode(env.SIGNING_SECRET), { name: "HMAC", hash: "SHA-256" }, false, [usage]);
const b64 = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

async function sign(env: Env, key: string, exp: number) {
  return b64(await crypto.subtle.sign("HMAC", await hmacKey(env, "sign"), new TextEncoder().encode(`${key}\n${exp}`)));
}

async function serve(req: Request, env: Env, url: URL, key: string): Promise<Response> {
  const exp = Number(url.searchParams.get("e"));
  const sig = url.searchParams.get("s") ?? "";
  let valid = false;
  try {
    valid =
      exp > Date.now() / 1000 &&
      (await crypto.subtle.verify("HMAC", await hmacKey(env, "verify"), unb64(sig), new TextEncoder().encode(`${key}\n${exp}`)));
  } catch {
    // firma mal formada
  }
  if (!valid) return text("Enlace vencido o no válido.", 403);

  const obj = await env.PRIVATE.get(key, { range: req.headers, onlyIf: req.headers });
  if (!obj) return text("No existe.", 404);
  const h = new Headers({ "access-control-allow-origin": "*", "accept-ranges": "bytes", "cache-control": "private, max-age=3600" });
  obj.writeHttpMetadata(h);
  h.set("etag", obj.httpEtag);
  const name = url.searchParams.get("n");
  if (name) h.set("content-disposition", `attachment; filename*=UTF-8''${encodeURIComponent(name)}`);
  if (!("body" in obj) || !obj.body) return new Response(null, { status: 304, headers: h });
  let length = obj.size;
  if (obj.range) {
    const r = obj.range as { offset?: number; length?: number; suffix?: number };
    const offset = r.suffix !== undefined ? Math.max(0, obj.size - r.suffix) : (r.offset ?? 0);
    length = r.suffix !== undefined ? obj.size - offset : (r.length ?? obj.size - offset);
    h.set("content-range", `bytes ${offset}-${offset + length - 1}/${obj.size}`);
  }
  h.set("content-length", String(length));
  return new Response(req.method === "HEAD" ? null : obj.body, { status: req.headers.has("range") ? 206 : 200, headers: h });
}
