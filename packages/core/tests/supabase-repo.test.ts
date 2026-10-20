// Comprueba que SupabaseRepo guarda en filas y vuelve a leer exactamente lo mismo,
// con un cliente de Supabase falso en memoria. Correr: pnpm test:core
import { test } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseRepo } from "../src/supabase-repo";
import { buildSeed } from "../src/seed";
import type { Db } from "../src/types";

type Row = Record<string, any>;

/** Lo mínimo de supabase-js que usa el repo: select/order/range, upsert, delete.in/match, auth. */
function fakeClient(opts: { failTable?: string } = {}) {
  const tables = new Map<string, Row[]>();
  const rowsOf = (t: string) => tables.get(t) ?? tables.set(t, []).get(t)!;
  const ok = (data: unknown) => Promise.resolve({ data, error: null });

  const client = {
    tables,
    from(table: string) {
      return {
        select: () => {
          let list = rowsOf(table).map((r) => ({ ...r }));
          const q: any = {
            order: (col: string) => {
              list.sort((a, b) => String(a[col]).localeCompare(String(b[col])));
              return q;
            },
            range: (a: number, b: number) => ok(list.slice(a, b + 1)),
          };
          return q;
        },
        upsert: (rows: Row[], o: { onConflict: string }) => {
          if (opts.failTable === table) return Promise.resolve({ error: { message: `falló ${table}` } });
          const keys = o.onConflict.split(",");
          for (const r of rows) {
            const list = rowsOf(table);
            const i = list.findIndex((x) => keys.every((k) => x[k] === r[k]));
            if (i >= 0) list[i] = { ...list[i], ...r }; // PostgREST solo pisa las columnas enviadas
            else list.push({ ...r });
          }
          return Promise.resolve({ error: null });
        },
        delete: () => ({
          in: (col: string, vals: unknown[]) => {
            tables.set(table, rowsOf(table).filter((r) => !vals.includes(r[col])));
            return Promise.resolve({ error: null });
          },
          match: (m: Row) => {
            tables.set(table, rowsOf(table).filter((r) => !Object.entries(m).every(([k, v]) => r[k] === v)));
            return Promise.resolve({ error: null });
          },
        }),
      };
    },
    auth: {
      getSession: () => ok({ session: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
  };
  return client as unknown as SupabaseClient & { tables: Map<string, Row[]> };
}

class TestRepo extends SupabaseRepo {
  seed(db: Db) {
    return this.tx((d) => Object.assign(d, structuredClone(db)));
  }
  addTestFiles(coverageId: string) {
    // sin R2 conectado no hay subida real: se agregan archivos de prueba directo al modelo
    return this.tx((d) => {
      d.moments.push({ id: "m_test", coverageId, name: "Ceremonia", order: 0 });
      d.files.push({
        id: "f_test", momentId: "m_test", kind: "photo", name: "x.jpg", storageKey: "k", order: 99, published: false,
      });
    });
  }
}
const repoOn = (c: SupabaseClient) => new TestRepo("http://x", "k", c);

/** deja la base en una forma comparable: sin `undefined`, con las listas ordenadas y sin lo que no se guarda */
function normalize(db: Db) {
  const out: Row = JSON.parse(JSON.stringify(db));
  delete out.version;
  out.members.forEach((m: Row) => (m.passwordHash = null));
  for (const k of Object.keys(out)) {
    if (Array.isArray(out[k])) out[k].sort((a: Row, b: Row) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  return out;
}

async function assertPersisted(client: SupabaseClient, repo: TestRepo, label: string) {
  const fresh = await repoOn(client).getDb(); // lee de las "filas" como lo haría otro navegador
  assert.deepEqual(normalize(fresh), normalize(await repo.getDb()), label);
}

test("lo guardado se lee igual: ida y vuelta con los datos de ejemplo", async () => {
  const client = fakeClient();
  const repo = repoOn(client);
  await repo.seed(buildSeed());
  await assertPersisted(client, repo, "seed");
  const db = await repoOn(client).getDb();
  assert.equal(db.couples.length, buildSeed().couples.length);
  assert.equal(db.files.length, buildSeed().files.length);
  // columnas que no deben viajar
  assert.ok(client.tables.get("members")!.every((r) => !("password_hash" in r) && !("passwordHash" in r)));
});

test("cada operación del admin queda guardada tal cual está en memoria", async () => {
  const client = fakeClient();
  const repo = repoOn(client);
  await repo.seed(buildSeed());

  const id = await repo.createCouple("Ana & Luis");
  await assertPersisted(client, repo, "createCouple");
  await repo.setCoverages(id, ["boda", "preboda"]);
  await assertPersisted(client, repo, "setCoverages");
  await repo.updatePublicProfile(id, { description: "Una historia", coverPosition: "50% 30%" });
  await assertPersisted(client, repo, "updatePublicProfile");
  await repo.setTags(id, ["playa", "atardecer"]);
  await assertPersisted(client, repo, "setTags");
  await repo.updatePresentation(id, { message: "Gracias", songName: "Canción" });
  await repo.publishPresentation(id);
  await assertPersisted(client, repo, "publishPresentation");
  await repo.saveMember(id, "ana@correo.com");
  const [link] = await repo.sendInvites(id);
  await assertPersisted(client, repo, "invitaciones");
  assert.ok(link.token);
  const cv = (await repo.getDb()).coverages.find((c) => c.coupleId === id && c.type === "boda")!;
  await repo.addTestFiles(cv.id);
  await repo.setCoupleVisibility(id, { inGallery: true });
  await assertPersisted(client, repo, "visibilidad");
  await repo.setCoverages(id, ["boda"]); // quita preboda
  await assertPersisted(client, repo, "quitar cobertura");
  await repo.deleteFile("f_test");
  await assertPersisted(client, repo, "deleteFile");

  const seedCouple = buildSeed().couples[0].id;
  await repo.deleteCouple(seedCouple);
  await assertPersisted(client, repo, "deleteCouple");
  const rows = (t: string) => client.tables.get(t) ?? [];
  assert.ok(!rows("couples").some((r) => r.id === seedCouple));
  assert.ok(!rows("coverages").some((r) => r.couple_id === seedCouple));
  assert.ok(!rows("presentations").some((r) => r.couple_id === seedCouple));
});

test("solo se envían las filas que cambiaron", async () => {
  const client = fakeClient();
  const repo = repoOn(client);
  await repo.seed(buildSeed());
  const calls: string[] = [];
  const realFrom = client.from.bind(client);
  (client as any).from = (t: string) => {
    const api: any = realFrom(t);
    const up = api.upsert;
    api.upsert = (rows: Row[], o: any) => {
      calls.push(`${t}:${rows.length}`);
      return up(rows, o);
    };
    return api;
  };
  const id = (await repo.getDb()).couples[0].id;
  await repo.setPortalStatus(id, "suspended");
  assert.deepEqual(calls, ["couples:1"]);
});

test("si falla el guardado, se avisa y no queda un estado a medias en memoria", async () => {
  const client = fakeClient();
  const repo = repoOn(client);
  await repo.seed(buildSeed());
  const bad = fakeClient({ failTable: "couples" });
  const broken = repoOn(bad);
  await assert.rejects(broken.seed(buildSeed()), /falló couples/);
  // la base falsa quedó vacía y el repo roto vuelve a leerla sin romperse
  assert.equal((await broken.getDb()).couples.length, 0);
  // y el repo sano sigue funcionando
  await repo.createCouple("Otra & Pareja");
  await assertPersisted(client, repo, "tras otro repo roto");
});

test("las operaciones seguidas se guardan en orden", async () => {
  const client = fakeClient();
  const repo = repoOn(client);
  await repo.seed(buildSeed());
  const ids = await Promise.all(["Uno & Dos", "Tres & Cuatro", "Cinco & Seis"].map((n) => repo.createCouple(n)));
  assert.equal(new Set(ids).size, 3);
  await assertPersisted(client, repo, "tres altas a la vez");
  assert.equal((await repo.getDb()).couples.length, buildSeed().couples.length + 3);
});
