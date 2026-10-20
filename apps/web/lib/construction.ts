// Mientras se arma el sitio, la raíz muestra una pantalla de construcción y se entra a mano
// (/web para el sitio, /portal para el portal). Solo en producción; en local no estorba.
// Para abrir el sitio al público: NEXT_PUBLIC_UNDER_CONSTRUCTION=0 en las variables de compilación.
export const UNDER_CONSTRUCTION =
  process.env.NEXT_PUBLIC_UNDER_CONSTRUCTION === "1" ||
  (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_UNDER_CONSTRUCTION !== "0");

export const ACCESS_KEY = "bb-access";
