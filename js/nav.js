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
      <button type="button" class="theme-toggle" data-theme-toggle></button>
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

  // ---------- navbar sólido al hacer scroll ----------
  // escucha la página y también paneles con scroll propio (detalle en home)
  const scrollers = [window, ...document.querySelectorAll("[data-nav-scroll]")];
  const onScroll = () => {
    const y = Math.max(window.scrollY, ...scrollers.slice(1).map((el) => el.scrollTop));
    header.classList.toggle("is-scrolled", y > 8);
  };
  scrollers.forEach((s) => s.addEventListener("scroll", onScroll, { passive: true }));
  onScroll();

  // ---------- tema claro / oscuro ----------
  const themeBtn = menu.querySelector("[data-theme-toggle]");
  const systemDark = matchMedia("(prefers-color-scheme: dark)");
  const currentTheme = () =>
    document.documentElement.dataset.theme || (systemDark.matches ? "dark" : "light");
  const sun = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`;
  const moon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>`;
  const paintThemeBtn = () => {
    const dark = currentTheme() === "dark";
    themeBtn.innerHTML = dark ? `${sun} Modo claro` : `${moon} Modo oscuro`;
  };
  themeBtn.addEventListener("click", () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("bb-theme", next);
    } catch (e) {}
    paintThemeBtn();
  });
  systemDark.addEventListener("change", paintThemeBtn);
  paintThemeBtn();
})();
