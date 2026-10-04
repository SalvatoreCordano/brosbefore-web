"use client";
// Lee la base desde el repo y se actualiza sola cuando cambia.
import { useEffect, useState } from "react";
import { repo, type Db } from "@bb/core";

export function useDb(): Db | null {
  const [db, setDb] = useState<Db | null>(null);
  useEffect(() => {
    const load = () => repo.getDb().then(setDb);
    load();
    return repo.subscribe(load);
  }, []);
  return db;
}
