// Mientras se arma el sitio, la raíz del admin muestra una pantalla de construcción y se entra
// a mano por /admin. Solo en producción; en local no estorba.
// Para apagarla: NEXT_PUBLIC_UNDER_CONSTRUCTION=0 en las variables de compilación.
export const UNDER_CONSTRUCTION =
  process.env.NEXT_PUBLIC_UNDER_CONSTRUCTION === "1" ||
  (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_UNDER_CONSTRUCTION !== "0");

export const ACCESS_KEY = "bb-access";
