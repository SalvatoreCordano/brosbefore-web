import type { Metadata } from "next";
import { Sidebar } from "@/components/Sidebar";
import { asset } from "@/lib/asset";
import "./admin.css";

export const metadata: Metadata = {
  title: "Admin — (brosbefore)™",
  icons: { icon: asset("assets/logo.svg") },
  robots: { index: false, follow: false },
};

const themeScript = `try{var t=localStorage.getItem("bb-theme");if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <div className="shell">
          <Sidebar />
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
