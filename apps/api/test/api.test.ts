// Prueba el Worker con un R2 falso en memoria y un Supabase simulado (is_admin, readable_keys, storage_used_bytes).
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { handle, type Env } from "../src/index";

const ID = "11111111-1111-1111-1111-111111111111";
const ID2 = "22222222-2222-2222-2222-222222222222";
const ORIGIN = "https://admin.brosbeforefilm.com";

/** R2 mínimo en memoria: get con range, put, delete y subida por partes */
function fakeBucket() {
  const store = new Map<string, { data: Uint8Array; type?: string }>();
  const uploads = new Map<string, Map<number, Uint8Array>>();
  const bytes = async (v: any): Promise<Uint8Array> =>
    v instanceof Uint8Array ? v : new Uint8Array(await new Response(v).arrayBuffer());
  const b: any = {
    store,
    async put(key: string, value: any, o?: any) {
      store.set(key, { data: await bytes(value), type: o?.httpMetadata?.contentType });
    },
    async get(key: string, o?: any) {
      const e = store.get(key);
      if (!e) return null;
      const m = /bytes=(\d+)-(\d*)/.exec(o?.range?.get?.("range") ?? "");
      const [from, to] = m ? [Number(m[1]), m[2] ? Number(m[2]) : e.data.length - 1] : [0, e.data.length - 1];
      return {
        size: e.data.length,
        httpEtag: '"e"',
        range: m ? { offset: from, length: to - from + 1 } : undefined,
        body: new Response(e.data.slice(from, to + 1)).body,
        httpMetadata: { contentType: e.type },
        writeHttpMetadata: (h: Headers) => e.type && h.set("content-type", e.type),
      };
    },
    async delete(keys: string | string[]) {
      for (const k of [keys].flat()) store.delete(k);
    },
    async createMultipartUpload(key: string) {
      uploads.set(key, new Map());
      return { uploadId: "up1" };
    },
    resumeMultipartUpload(key: string) {
      return {
        uploadPart: async (n: number, body: any) => (uploads.get(key)!.set(n, await bytes(body)), { partNumber: n, etag: `e${n}` }),
        complete: async (parts: { partNumber: number }[]) => {
          const all = parts.map((p) => uploads.get(key)!.get(p.partNumber)!);
          await b.put(key, Uint8Array.from(all.flatMap((x) => [...x])));
        },
        abort: async () => void uploads.delete(key),
      };
    },
  };
  return b;
}

let env: Env & { PRIVATE: any; PUBLIC: any };
let readable: string[] = [];
let used = 0;

const realFetch = globalThis.fetch;
beforeEach(() => {
  env = {
    PRIVATE: fakeBucket(),
    PUBLIC: fakeBucket(),
    SUPABASE_URL: "https://sb.test",
    SUPABASE_ANON_KEY: "anon",
    SIGNING_SECRET: "secreto-de-prueba",
    ALLOWED_ORIGINS: ORIGIN,
    CAP_BYTES: "1000",
  } as any;
  readable = [];
  used = 0;
  // Supabase simulado: el token "admin" es admin, "pareja" solo lee `readable`, otro token es inválido
  globalThis.fetch = (async (input: any, init: any) => {
    const u = String(input);
    const token = String(init.headers.authorization).replace("Bearer ", "");
    if (!["admin", "pareja"].includes(token)) return new Response("{}", { status: 401 });
    const fn = u.split("/rpc/")[1];
    if (fn === "is_admin") return Response.json(token === "admin");
    if (fn === "storage_used_bytes") return Response.json(token === "admin" ? used : 0);
    if (fn === "readable_keys") {
      const asked: string[] = JSON.parse(init.body).p_keys;
      return Response.json(token === "admin" ? asked : asked.filter((k) => readable.includes(k)));
    }
    return new Response("{}", { status: 404 });
  }) as any;
});
import { afterEach } from "node:test";
afterEach(() => void (globalThis.fetch = realFetch));

const call = (method: string, path: string, token?: string, body?: BodyInit, headers: Record<string, string> = {}) =>
  handle(
    new Request(`https://api.test${path}`, {
      method,
      body,
      headers: { origin: ORIGIN, ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
    }),
    env
  );
const put = (path: string, token: string | undefined, data: string, type = "image/jpeg") =>
  call("PUT", path, token, data, { "content-type": type, "content-length": String(data.length) });

test("sin sesión o con sesión inválida no se sube nada", async () => {
  assert.equal((await put(`/u/o/${ID}`, undefined, "x")).status, 401);
  assert.equal((await put(`/u/o/${ID}`, "falso", "x")).status, 401);
  assert.equal(env.PRIVATE.store.size, 0);
});

test("una pareja no puede subir ni borrar", async () => {
  assert.equal((await put(`/u/o/${ID}`, "pareja", "x")).status, 403);
  assert.equal((await call("POST", "/rm", "pareja", JSON.stringify({ keys: [`o/${ID}`] }))).status, 403);
});

test("el admin sube original y versión ligera al bucket privado, y un recurso al público", async () => {
  assert.equal((await put(`/u/o/${ID}`, "admin", "ORIGINAL")).status, 200);
  assert.equal((await put(`/u/p/${ID}`, "admin", "lig", "image/webp")).status, 200);
  assert.equal((await put(`/u/a/${ID2}`, "admin", "banner")).status, 200);
  assert.deepEqual([...env.PRIVATE.store.keys()].sort(), [`o/${ID}`, `p/${ID}`]);
  assert.deepEqual([...env.PUBLIC.store.keys()], [`a/${ID2}`]);
});

test("rechaza ids que no son uuid (no se puede escribir en otra ruta)", async () => {
  assert.equal((await put(`/u/o/..%2Fx`, "admin", "x")).status, 404);
  assert.equal((await put(`/u/o/abc`, "admin", "x")).status, 404);
});

test("el tope de almacenamiento frena la subida", async () => {
  used = 950; // 950 * 1.1 > 1000
  assert.equal((await put(`/u/o/${ID}`, "admin", "x")).status, 507);
  assert.equal((await call("POST", `/m/${ID}?size=500`, "admin")).status, 507);
  used = 0;
  assert.equal((await put(`/u/o/${ID}`, "admin", "x")).status, 200);
});

test("subida por partes: crea, sube, completa y el archivo queda entero", async () => {
  const { uploadId } = await (await call("POST", `/m/${ID}?size=6`, "admin", undefined, { "content-type": "video/mp4" })).json() as any;
  await call("PUT", `/m/${ID}?u=${uploadId}&n=1`, "admin", "abc", { "content-length": "3" });
  await call("PUT", `/m/${ID}?u=${uploadId}&n=2`, "admin", "def", { "content-length": "3" });
  const done = await call("POST", `/m/${ID}/done?u=${uploadId}`, "admin", JSON.stringify({ parts: [{ partNumber: 1, etag: "e1" }, { partNumber: 2, etag: "e2" }] }));
  assert.equal(done.status, 200);
  assert.equal(new TextDecoder().decode(env.PRIVATE.store.get(`o/${ID}`).data), "abcdef");
});

test("copiar a público solo copia la versión ligera, y quitar la borra", async () => {
  await put(`/u/o/${ID}`, "admin", "ORIGINAL");
  assert.equal((await call("POST", `/pub/${ID}`, "admin")).status, 404); // aún sin versión ligera
  await put(`/u/p/${ID}`, "admin", "lig", "image/webp");
  assert.equal((await call("POST", `/pub/${ID}`, "admin")).status, 200);
  assert.deepEqual([...env.PUBLIC.store.keys()], [`p/${ID}`]); // el original nunca llega al público
  assert.equal((await call("DELETE", `/pub/${ID}`, "admin")).status, 200);
  assert.equal(env.PUBLIC.store.size, 0);
});

test("borrar un archivo quita original, versión ligera y copia pública; ignora llaves antiguas", async () => {
  await put(`/u/o/${ID}`, "admin", "O");
  await put(`/u/p/${ID}`, "admin", "p");
  await call("POST", `/pub/${ID}`, "admin");
  await put(`/u/a/${ID2}`, "admin", "a");
  const r = await call("POST", "/rm", "admin", JSON.stringify({ keys: [`o/${ID}`, `a/${ID2}`, "assets/works/x/01.jpg"] }));
  assert.equal(r.status, 200);
  assert.equal(env.PRIVATE.store.size + env.PUBLIC.store.size, 0);
});

test("firmar: solo entrega enlaces de lo que la sesión puede leer", async () => {
  readable = [`o/${ID}`];
  const keys = [`o/${ID}`, `o/${ID2}`];
  const res = await (await call("POST", "/sign", "pareja", JSON.stringify({ keys }))).json() as any;
  assert.deepEqual(Object.keys(res.urls), [`o/${ID}`]);
  assert.equal((await call("POST", "/sign", "pareja", JSON.stringify({ keys: ["a/x"] }))).status, 400);
  assert.equal((await call("POST", "/sign", undefined, JSON.stringify({ keys }))).status, 401);
});

test("el enlace firmado sirve el archivo (con rangos) y falla si se altera o vence", async () => {
  await put(`/u/o/${ID}`, "admin", "0123456789", "video/mp4");
  const { urls } = await (await call("POST", "/sign", "admin", JSON.stringify({ keys: [`o/${ID}`] }))).json() as any;
  const link = new URL(urls[`o/${ID}`]);
  const get = (u: URL, headers: Record<string, string> = {}) => handle(new Request(u, { headers }), env);

  const full = await get(link);
  assert.equal(full.status, 200);
  assert.equal(await full.text(), "0123456789");

  const part = await get(link, { range: "bytes=2-4" });
  assert.equal(part.status, 206);
  assert.equal(await part.text(), "234");
  assert.equal(part.headers.get("content-range"), "bytes 2-4/10");

  const otro = new URL(link); // la firma de otro archivo no sirve para éste
  otro.pathname = `/f/o/${ID2}`;
  assert.equal((await get(otro)).status, 403);
  const vencido = new URL(link);
  vencido.searchParams.set("e", "1");
  assert.equal((await get(vencido)).status, 403);
  const sinFirma = new URL(link);
  sinFirma.searchParams.delete("s");
  assert.equal((await get(sinFirma)).status, 403);
});
