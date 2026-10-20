// Instancia única de `repo` por app. Con las variables de Supabase usa datos reales;
// sin ellas (desarrollo local) usa el mock con datos de ejemplo.
import type { Repo } from "./repo";
import { MockRepo } from "./mock-repo";
import { SupabaseRepo } from "./supabase-repo";

// Next reemplaza `process.env.NEXT_PUBLIC_*` al compilar; este paquete no depende de los tipos de Node.
declare const process: { env: Record<string, string | undefined> };

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const repo: Repo = url && anonKey ? new SupabaseRepo(url, anonKey) : new MockRepo();
