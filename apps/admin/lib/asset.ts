// URL de un archivo estático respetando el basePath (GitHub Pages publica bajo una subruta).
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function asset(key: string): string {
  if (/^(https?:)?\/\//.test(key) || key.startsWith("data:") || key.startsWith("blob:")) return key;
  return `${BASE_PATH}/${key.replace(/^\//, "")}`;
}
