"use client";
// Lee la base desde el repo y vuelve a renderizar cuando cambia (también desde otra pestaña).
import { useEffect, useState } from "react";
import { repo, type Db } from "@bb/core";

export function useDb(): Db | null {
  const [db, setDb] = useState<Db | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () => repo.getDb().then((d) => alive && setDb(d));
    load();
    const off = repo.subscribe(load);
    return () => {
      alive = false;
      off();
    };
  }, []);
  return db;
}
