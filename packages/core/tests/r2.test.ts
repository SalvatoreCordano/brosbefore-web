// R2Storage habla con el Worker de archivos; aquí se simula con un fetch que anota cada llamada.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { R2Storage } from "../src/r2-storage";

type Call = { method: string; path: string; type?: string; size: number; auth?: string };
const realFetch = globalThis.fetch;
afterEach(() => void (globalThis.fetch = realFetch));

function stub(fail: (c: Call) => boolean = () => false) {
  const calls: Call[] = [];
  globalThis.fetch = (async (url: any, init: any) => {
    const c: Call = {
      method: init.method,
      path: String(url).replace("https://api.test", ""),
      type: init.headers["content-type"],
      size: init.body instanceof Blob ? init.body.size : String(init.body ?? "").length,
      auth: init.headers.authorization,
    };
    calls.push(c);
    if (fail(c)) return Response.json({ error: "falló" }, { status: 500 });
    return Response.json(c.path.startsWith("/m/") && c.method === "POST" && !c.path.includes("/done") ? { uploadId: "u1" } : { etag: "e", urls: {} });
  }) as any;
  return calls;
}
const store = (o = {}) =>
  new R2Storage({ api: "https://api.test", token: async () => "tok", preview: async () => new Blob(["lig"], { type: "image/webp" }), ...o });
const photo = (n: number) => new Blob(["x".repeat(n)], { type: "image/jpeg" });

test("una foto sube el original y su versión ligera con la sesión, y devuelve la llave o/<id>", async () => {
  const calls = stub();
  const key = await store().put(photo(10));
  const id = key.slice(2);
  assert.match(key, /^o\/[0-9a-f-]{36}$/);
  assert.deepEqual(calls.map((c) => `${c.method} ${c.path}`), [`PUT /u/o/${id}`, `PUT /u/p/${id}`]);
  assert.ok(calls.every((c) => c.auth === "Bearer tok"));
  assert.equal(calls[1].type, "image/webp");
});

test("un recurso público (banner, canción) va a a/<id> y sin versión ligera", async () => {
  const calls = stub();
  const key = await store().put(photo(10), { asset: true });
  assert.match(key, /^a\//);
  assert.deepEqual(calls.map((c) => c.path), [`/u/a/${key.slice(2)}`]);
});

test("un video no genera versión ligera", async () => {
  const calls = stub();
  await store().put(new Blob(["v"], { type: "video/mp4" }));
  assert.equal(calls.length, 1);
});

test("un archivo grande sube por partes y las junta al final", async () => {
  const calls = stub();
  await store({ singleMax: 5, partSize: 4 }).put(photo(10)); // 3 partes: 4 + 4 + 2
  const route = calls.map((c) => `${c.method} ${c.path.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/, "ID")}`);
  assert.deepEqual(route, [
    "POST /m/ID?size=10",
    "PUT /m/ID?u=u1&n=1",
    "PUT /m/ID?u=u1&n=2",
    "PUT /m/ID?u=u1&n=3",
    "POST /m/ID/done?u=u1",
    "PUT /u/p/ID",
  ]);
  assert.deepEqual(calls.slice(1, 4).map((c) => c.size), [4, 4, 2]);
});

test("si una parte falla, se aborta la subida y se borra lo que quedó", async () => {
  const calls = stub((c) => c.path.includes("n=2"));
  await assert.rejects(store({ singleMax: 5, partSize: 4 }).put(photo(10)), /falló/);
  const last = calls.map((c) => `${c.method} ${c.path}`);
  assert.ok(last.some((l) => l.startsWith("DELETE /m/")), "aborta la subida por partes");
  assert.ok(last.includes("POST /rm"), "borra lo que quedó");
});

test("si la foto no se puede leer, no se sube nada", async () => {
  const calls = stub();
  const bad = store({ preview: async () => { throw new Error("No se pudo leer la imagen."); } });
  await assert.rejects(bad.put(photo(10)), /No se pudo leer/);
  assert.equal(calls.length, 0);
});

test("sin sesión no se sube", async () => {
  const calls = stub();
  await assert.rejects(store({ token: async () => null }).put(photo(1)), /Inicia sesión/);
  assert.equal(calls.length, 0);
});

test("borrar ignora las llaves antiguas del sitio y no falla si el servidor falla", async () => {
  const calls = stub((c) => c.path === "/rm");
  const s = store();
  await s.remove(["assets/works/x/01.jpg", "idb:1"]);
  assert.equal(calls.length, 0);
  await s.remove(["o/11111111-1111-1111-1111-111111111111"]); // el servidor responde 500: solo avisa
  assert.equal(calls.length, 1);
});
