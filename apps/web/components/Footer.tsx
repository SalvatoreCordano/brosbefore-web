import { asset } from "@/lib/asset";
import { SITE } from "@/lib/site";

const WHATSAPP =
  "https://wa.me/51936536544?text=%C2%A1Hola!%20Vi%20su%20web%20y%20quisiera%20m%C3%A1s%20informaci%C3%B3n%20de%20sus%20servicios.";

export function Footer() {
  return (
    <footer className="footer">
      <img className="footer__logo" src={asset("assets/logo.svg")} alt="" aria-hidden="true" />
      <div className="footer__row">
        <span>{SITE.name} · Perú | Destination weddings</span>
        <span>
          <a href="https://www.instagram.com/brosbeforefilm/" target="_blank" rel="noopener">
            Instagram
          </a>
          <a href={WHATSAPP} target="_blank" rel="noopener">
            WhatsApp
          </a>
        </span>
        <span>© {new Date().getFullYear()} Todos los derechos reservados</span>
      </div>
    </footer>
  );
}
