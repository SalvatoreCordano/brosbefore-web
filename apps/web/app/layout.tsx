import type { Metadata, Viewport } from "next";
import { FloatingControls } from "@/components/FloatingControls";
import { Nav } from "@/components/Nav";
import { asset } from "@/lib/asset";
import { SITE } from "@/lib/site";
import "./globals.css";
import "./product.css";

export const metadata: Metadata = {
  title: SITE.title,
  description: SITE.description,
  icons: { icon: asset("assets/logo.svg") },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Se ejecuta antes de pintar: aplica el tema elegido (evita el destello blanco en modo oscuro)
// y marca si el loader del home ya se vio en esta sesión.
const bootScript = `try{var t=localStorage.getItem("bb-theme");if(t)document.documentElement.dataset.theme=t}catch(e){}
try{if(sessionStorage.getItem("bb-intro"))document.documentElement.classList.add("no-intro")}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // el script de arriba modifica <html> antes de React: se avisa para que no lo marque como error
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body>
        <Nav />
        {children}
        <FloatingControls />
      </body>
    </html>
  );
}
