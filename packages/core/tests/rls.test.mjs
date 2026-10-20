// Prueba las reglas RLS de supabase/migrations en un Postgres embebido (PGlite).
// Correr: pnpm test:rls   — simula roles y auth.uid() como lo hace Supabase.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const MIGRATIONS = new URL("../../../supabase/migrations/", import.meta.url);

const ADMIN = "00000000-0000-0000-0000-00000000000a";
const USER_A = "00000000-0000-0000-0000-0000000000a1";
const USER_B = "00000000-0000-0000-0000-0000000000b1";
const USER_NEW = "00000000-0000-0000-0000-0000000000c1";

let db;

/** ejecuta `fn` con el rol y el usuario indicados, como lo haría PostgREST */
async function as(role, userId, fn, email = null) {
  const claims = JSON.stringify(userId ? { sub: userId, email } : {});
  await db.exec(`set role ${role}`);
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [claims]);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role`);
  }
}
const ids = async (sql) => (await db.query(sql)).rows.map((r) => r.id).sort();

before(async () => {
  db = new PGlite();
  // lo mínimo de Supabase: roles, auth.users, auth.uid(), auth.jwt() y permisos por defecto
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key, email text);
    create function auth.jwt() returns jsonb language sql stable as
      $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    alter default privileges in schema public grant all on functions to anon, authenticated;
  `);
  for (const f of readdirSync(MIGRATIONS).filter((n) => n.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(new URL(f, MIGRATIONS), "utf8"));
  }
  await db.exec(`
    insert into auth.users values ('${ADMIN}', 'admin@x.com'), ('${USER_A}', 'a@x.com'), ('${USER_B}', 'b@x.com'), ('${USER_NEW}', 'nuevo@x.com');
    insert into admins values ('${ADMIN}');
    insert into plans (id, name) values ('p1', 'the story');

    -- A: en galería. B: oculta (aún sin publicar).
    insert into couples (id, slug, names, in_gallery) values ('cA', 'a', 'A & A', true), ('cB', 'b', 'B & B', false);
    insert into coverages (id, couple_id, type) values ('cvA', 'cA', 'boda'), ('cvB', 'cB', 'boda');
    insert into moments (id, coverage_id, name) values ('mA', 'cvA', 'Ceremonia'), ('mB', 'cvB', 'Ceremonia');
    insert into files (id, moment_id, kind, name, storage_key, published) values
      ('fA_pub',  'mA', 'photo', 'a1.jpg', 'k1', false), -- elegida para la galería pública
      ('fA_priv', 'mA', 'photo', 'a2.jpg', 'k2', false), -- privada, sin publicar
      ('fA_dl',   'mA', 'photo', 'a3.jpg', 'k3', true),  -- publicada para descarga de la pareja
      ('fB_dl',   'mB', 'photo', 'b1.jpg', 'k4', true);
    insert into public_items (id, coverage_id, file_id, scope) values ('pi1', 'cvA', 'fA_pub', 'gallery');
    insert into public_profiles (couple_id, title) values ('cA', 'A & A'), ('cB', 'B & B');
    insert into presentations (couple_id, message) values ('cA', 'borrador secreto');
    insert into presentation_published (couple_id, content) values ('cA', '{"message":"hola","items":[{"fileId":"fA_priv"}]}');

    insert into members (id, couple_id, user_id, email, status) values
      ('mem_a', 'cA', '${USER_A}', 'a@x.com', 'active'),
      ('mem_b', 'cB', '${USER_B}', 'b@x.com', 'active');
    insert into members (id, couple_id, email, status, invite_token, invited_at) values
      ('mem_new', 'cA', 'nuevo@x.com', 'invited', 'tok-nuevo', now());
    insert into testimonials (id, couple_id, member_id, original_text) values ('t_a', 'cA', 'mem_a', 'gracias');
  `);
});

test("el público solo ve parejas en galería y las fotos elegidas para la web", async () => {
  await as("anon", null, async () => {
    assert.deepEqual(await ids("select id from couples"), ["cA"]);
    assert.deepEqual(await ids("select id from files"), ["fA_pub"]);
    assert.deepEqual(await ids("select id from public_items"), ["pi1"]);
    assert.deepEqual(await ids("select couple_id as id from public_profiles"), ["cA"]);
  });
});

test("el público no ve miembros, borradores, agradecimientos ni admins", async () => {
  await as("anon", null, async () => {
    for (const t of ["members", "presentations", "presentation_published", "testimonials", "admins", "pres_items"]) {
      assert.equal((await db.query(`select 1 from ${t}`)).rows.length, 0, t);
    }
  });
});

test("el público no puede escribir", async () => {
  await as("anon", null, async () => {
    await assert.rejects(db.query(`insert into plans (id, name) values ('x', 'x')`));
    await assert.rejects(db.query(`update couples set names = 'hack'`));
    await assert.rejects(db.query(`delete from couples`));
  });
});

test("la pareja A ve su historia y no la de la pareja B", async () => {
  await as("authenticated", USER_A, async () => {
    assert.deepEqual(await ids("select id from couples"), ["cA"]);
    assert.deepEqual(await ids("select id from files"), ["fA_dl", "fA_priv", "fA_pub"].sort());
    assert.ok(!(await ids("select id from files")).includes("fB_dl"));
    assert.deepEqual(await ids("select id from coverages"), ["cvA"]);
    assert.deepEqual(await ids("select id from members"), ["mem_a"]);
  });
  await as("authenticated", USER_B, async () => {
    assert.deepEqual(await ids("select id from couples"), ["cA", "cB"]); // A es pública, B es la suya
    assert.deepEqual(await ids("select id from files"), ["fA_pub", "fB_dl"]);
    assert.ok(!(await ids("select id from files")).includes("fA_dl"));
  });
});

test("la pareja no ve el borrador de la presentación, solo lo publicado", async () => {
  await as("authenticated", USER_A, async () => {
    assert.equal((await db.query("select 1 from presentations")).rows.length, 0);
    assert.equal((await db.query("select 1 from presentation_published")).rows.length, 1);
  });
  await as("authenticated", USER_B, async () => {
    assert.equal((await db.query("select 1 from presentation_published")).rows.length, 0);
  });
});

test("la pareja no puede escribir en galería, parejas ni archivos", async () => {
  await as("authenticated", USER_A, async () => {
    await assert.rejects(db.query(`insert into couples (id, slug, names) values ('x', 'x', 'x')`));
    await db.query(`update couples set names = 'hack' where id = 'cA'`); // RLS filtra: 0 filas
    await db.query(`update files set published = true where id = 'fA_priv'`);
    await db.query(`delete from files where id = 'fA_pub'`);
  });
  assert.equal((await db.query(`select names from couples where id = 'cA'`)).rows[0].names, "A & A");
  assert.equal((await db.query(`select published from files where id = 'fA_priv'`)).rows[0].published, false);
  assert.equal((await db.query(`select 1 from files where id = 'fA_pub'`)).rows.length, 1);
});

test("un portal suspendido deja de ver sus archivos", async () => {
  await db.exec(`update couples set portal_status = 'suspended' where id = 'cA'`);
  try {
    await as("authenticated", USER_A, async () => {
      assert.deepEqual(await ids("select id from files"), ["fA_pub"]); // solo lo público
      assert.equal((await db.query("select 1 from presentation_published")).rows.length, 0);
    });
  } finally {
    await db.exec(`update couples set portal_status = 'active' where id = 'cA'`);
  }
});

test("agradecimientos: la pareja edita solo el suyo y no puede publicarlo", async () => {
  await as("authenticated", USER_A, async () => {
    await db.query(`update testimonials set original_text = 'muchas gracias', published_text = 'HACK', reposted = true where id = 't_a'`);
    assert.deepEqual(await ids("select id from testimonials"), ["t_a"]);
    // no puede escribir a nombre de otra historia
    await assert.rejects(
      db.query(`insert into testimonials (id, couple_id, member_id) values ('t_x', 'cB', 'mem_b')`)
    );
  });
  const t = (await db.query(`select * from testimonials where id = 't_a'`)).rows[0];
  assert.equal(t.original_text, "muchas gracias");
  assert.equal(t.published_text, "");
  assert.equal(t.reposted, false);
  await as("authenticated", USER_B, async () => {
    assert.equal((await db.query("select 1 from testimonials where id = 't_a'")).rows.length, 0);
  });
});

test("el público solo ve agradecimientos republicados, sin el texto original", async () => {
  await as("anon", null, async () => {
    assert.equal((await db.query("select 1 from testimonials_public")).rows.length, 0);
  });
  await db.exec(`update testimonials set reposted = true, published_text = 'Gracias a ambos' where id = 't_a'`);
  await as("anon", null, async () => {
    const rows = (await db.query("select * from testimonials_public")).rows;
    assert.equal(rows.length, 1);
    assert.equal(rows[0].published_text, "Gracias a ambos");
    assert.ok(!("original_text" in rows[0]));
  });
  await db.exec(`update testimonials set reposted = false, published_text = '' where id = 't_a'`);
});

test("el admin lee y escribe todo", async () => {
  await as("authenticated", ADMIN, async () => {
    assert.deepEqual(await ids("select id from couples"), ["cA", "cB"]);
    assert.equal((await db.query("select 1 from files")).rows.length, 4);
    assert.equal((await db.query("select 1 from presentations")).rows.length, 1);
    await db.query(`insert into couples (id, slug, names) values ('cC', 'c', 'C & C')`);
    await db.query(`delete from couples where id = 'cC'`);
  });
});

test("invitaciones: el correo debe coincidir y el enlace sirve una sola vez", async () => {
  await as("anon", null, async () => {
    const r = (await db.query(`select * from get_invite('tok-nuevo')`)).rows;
    assert.deepEqual(r, [{ email: "nuevo@x.com", names: "A & A" }]);
    assert.equal((await db.query(`select * from get_invite('otro')`)).rows.length, 0);
    await assert.rejects(db.query(`select claim_invite('tok-nuevo', 'Nuevo')`)); // sin sesión
  });
  await as("authenticated", USER_B, async () => {
    await assert.rejects(db.query(`select claim_invite('tok-nuevo', 'Intruso')`), /correo_distinto/);
  }, "b@x.com");
  await as("authenticated", USER_NEW, async () => {
    await db.query(`select claim_invite('tok-nuevo', ' Nuevo ')`);
    await assert.rejects(db.query(`select claim_invite('tok-nuevo', 'Nuevo')`), /invitacion_invalida/);
    assert.deepEqual(await ids("select id from members"), ["mem_new"]);
  }, "nuevo@x.com");
  const m = (await db.query(`select * from members where id = 'mem_new'`)).rows[0];
  assert.equal(m.status, "active");
  assert.equal(m.name, "Nuevo");
  assert.equal(m.invite_token, null);
});

test("una invitación vencida (más de 14 días) no sirve", async () => {
  await db.exec(`insert into members (id, couple_id, email, status, invite_token, invited_at)
                 values ('mem_old', 'cB', 'viejo@x.com', 'invited', 'tok-viejo', now() - interval '15 days')`);
  await as("anon", null, async () => {
    assert.equal((await db.query(`select * from get_invite('tok-viejo')`)).rows.length, 0);
  });
});
