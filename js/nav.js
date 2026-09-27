// Navbar compartido: logo + hamburguesa con menú desplegable.
const SITE = {
  instagram: "https://www.instagram.com/", // TODO: reemplazar con el usuario real de brosbefore
};

(function () {
  const page = document.body.dataset.page || "inicio";
  const links = [
    { id: "inicio", label: "Inicio", href: "index.html" },
    { id: "nosotros", label: "Nosotros", href: "nosotros.html" },
    { id: "pricing", label: "Pricing", href: "pricing.html" },
  ];

  const header = document.createElement("header");
  header.className = "nav";
  header.innerHTML = `
    <a class="nav__logo" href="index.html" aria-label="brosbefore — inicio">
      <img src="assets/logo.svg" alt="(brosbefore)™" />
    </a>
    <button class="nav__burger" aria-label="Abrir menú" aria-expanded="false" aria-controls="menu">
      <span></span><span></span>
    </button>
  `;

  const menu = document.createElement("div");
  menu.className = "menu";
  menu.id = "menu";
  menu.setAttribute("aria-hidden", "true");
  menu.innerHTML = `
    <nav class="menu__links">
      ${links
        .map(
          (l, i) => `
        <a href="${l.href}" class="menu__link${l.id === page ? " is-current" : ""}" style="--i:${i}">
          <span class="menu__num">0${i + 1}</span>${l.label}
        </a>`
        )
        .join("")}
    </nav>
    <div class="menu__foot" style="--i:3">
      <button type="button" class="btn btn--solid menu__cta">Contáctanos</button>
      <a class="btn btn--ghost" href="${SITE.instagram}" target="_blank" rel="noopener">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor"/></svg>
        Instagram
      </a>
    </div>
  `;

  document.body.prepend(menu);
  document.body.prepend(header);

  const burger = header.querySelector(".nav__burger");
  const setOpen = (open) => {
    document.body.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    menu.setAttribute("aria-hidden", String(!open));
  };
  burger.addEventListener("click", () => setOpen(!document.body.classList.contains("menu-open")));
  document.addEventListener("keydown", (e) => e.key === "Escape" && setOpen(false));
  menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
})();
