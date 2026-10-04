// Coberturas, en el orden del carrusel. Los campos marcados TODO aún son de ejemplo.
// cover: foto del carrusel (card vertical ~4:5) · coverPos: encuadre opcional (CSS object-position)
// video: URL de embed (YouTube/Vimeo) o .mp4 — vacío = "Video próximamente"
// poster: portada del video (opcional, si no usa la primera foto)
// photos: galería, en orden — { src, w, h } (w/h reservan el alto antes de cargar)

window.WORKS = [
  {
    id: "ceziel-gianfranco",
    couple: "Ceziel & Gianfranco",
    place: "Paracas, Perú",
    date: "7 de agosto, 2024",
    collection: "essentials™",
    tags: ["Fotografía", "Highlight film"],
    // TODO: historia todavía de ejemplo — reemplazar con el texto real de la pareja
    story:
      "Una boda frente al mar, con el viento del desierto de testigo. Ceziel y Gianfranco querían algo honesto: sin poses, sin guion. Nos dejaron entrar a su día desde muy temprano y terminamos contando una historia de familia, sal y atardecer.",
    cover: "assets/works/ceziel-gianfranco/01.jpg",
    video: "https://www.youtube.com/embed/yL7-UPrKCwg",
    poster: "https://img.youtube.com/vi/yL7-UPrKCwg/maxresdefault.jpg",
    photos: [
      { src: "assets/works/ceziel-gianfranco/01.jpg", w: 1024, h: 1536 },
      { src: "assets/works/ceziel-gianfranco/02.jpg", w: 1024, h: 1536 },
      { src: "assets/works/ceziel-gianfranco/03.jpg", w: 1024, h: 1536 },
      { src: "assets/works/ceziel-gianfranco/04.jpg", w: 1024, h: 1536 },
      { src: "assets/works/ceziel-gianfranco/05.jpg", w: 1024, h: 683 },
      { src: "assets/works/ceziel-gianfranco/06.jpg", w: 1024, h: 683 },
      { src: "assets/works/ceziel-gianfranco/07.jpg", w: 1024, h: 683 },
    ],
  },
  {
    id: "diego-ale",
    couple: "Diego & Ale",
    // TODO: fecha, colección e historia todavía de ejemplo — reemplazar con los datos reales
    place: "Lima, Perú",
    date: "Octubre 2024",
    collection: "the story™",
    tags: ["Fotografía", "Story film"],
    story:
      "Texto de ejemplo. Aquí va la historia de la pareja: cómo se conocieron, qué querían para su día y qué momento nos marcó durante la cobertura.",
    cover: "assets/works/diego-ale/01.jpg",
    video: "https://www.youtube.com/embed/muZDcVTYJAI",
    poster: "https://img.youtube.com/vi/muZDcVTYJAI/maxresdefault.jpg",
    photos: [
      { src: "assets/works/diego-ale/01.jpg", w: 1024, h: 683 },
      { src: "assets/works/diego-ale/02.jpg", w: 640, h: 960 },
      { src: "assets/works/diego-ale/03.jpg", w: 640, h: 961 },
      { src: "assets/works/diego-ale/04.jpg", w: 1600, h: 1067 },
      { src: "assets/works/diego-ale/05.jpg", w: 640, h: 960 },
      { src: "assets/works/diego-ale/06.jpg", w: 1600, h: 1067 },
      { src: "assets/works/diego-ale/07.jpg", w: 1024, h: 683 },
      { src: "assets/works/diego-ale/08.jpg", w: 640, h: 961 },
      { src: "assets/works/diego-ale/09.jpg", w: 640, h: 960 },
    ],
  },
  {
    id: "paul-gabriela",
    couple: "Paul & Gabriela",
    // TODO: fecha, colección e historia todavía de ejemplo — reemplazar con los datos reales
    place: "Lima, Perú",
    date: "Diciembre 2024",
    collection: "essentials™",
    tags: ["Fotografía", "Highlight film"],
    story:
      "Texto de ejemplo. Aquí va la historia de la pareja: cómo se conocieron, qué querían para su día y qué momento nos marcó durante la cobertura.",
    cover: "assets/works/paul-gabriela/01.jpg",
    video: "https://www.youtube.com/embed/5qCl7eJHBWk",
    poster: "https://img.youtube.com/vi/5qCl7eJHBWk/maxresdefault.jpg",
    photos: [
      { src: "assets/works/paul-gabriela/01.jpg", w: 640, h: 960 },
      { src: "assets/works/paul-gabriela/02.jpg", w: 640, h: 960 },
      { src: "assets/works/paul-gabriela/03.jpg", w: 640, h: 960 },
      { src: "assets/works/paul-gabriela/04.jpg", w: 1600, h: 1067 },
      { src: "assets/works/paul-gabriela/05.jpg", w: 640, h: 960 },
      { src: "assets/works/paul-gabriela/06.jpg", w: 640, h: 960 },
      { src: "assets/works/paul-gabriela/07.jpg", w: 640, h: 960 },
      { src: "assets/works/paul-gabriela/08.jpg", w: 1600, h: 1067 },
      { src: "assets/works/paul-gabriela/09.jpg", w: 640, h: 960 },
      { src: "assets/works/paul-gabriela/10.jpg", w: 640, h: 960 },
    ],
  },
  {
    id: "jose-michelle",
    couple: "Jose & Michelle",
    // TODO: lugar, fecha, colección, tags, historia y resto de fotos todavía de ejemplo
    place: "Perú",
    date: "Mayo 2025",
    collection: "the legacy™",
    tags: ["Fotografía", "Legacy film", "Análogo 120mm"],
    story:
      "Texto de ejemplo. Aquí va la historia de la pareja: cómo se conocieron, qué querían para su día y qué momento nos marcó durante la cobertura.",
    cover: "assets/works/jose-michelle/01.jpg",
    video: "",
    photos: [{ src: "assets/works/jose-michelle/01.jpg", w: 640, h: 960 }],
  },
  {
    id: "salva-lu",
    couple: "Salva & Lu",
    // TODO: lugar, fecha, colección, tags, historia y resto de fotos todavía de ejemplo
    place: "Perú",
    date: "Agosto 2025",
    collection: "the story™",
    tags: ["Fotografía", "Story film", "Wedding reel"],
    story:
      "Texto de ejemplo. Aquí va la historia de la pareja: cómo se conocieron, qué querían para su día y qué momento nos marcó durante la cobertura.",
    cover: "assets/works/salva-lu/01.jpg",
    video: "",
    photos: [{ src: "assets/works/salva-lu/01.jpg", w: 640, h: 960 }],
  },
  {
    id: "giulio-fer",
    couple: "Giulio & Fer",
    // TODO: lugar, fecha, colección, tags, historia y resto de fotos todavía de ejemplo
    place: "Perú",
    date: "Febrero 2025",
    collection: "essentials™",
    tags: ["Fotografía", "Highlight film"],
    story:
      "Texto de ejemplo. Aquí va la historia de la pareja: cómo se conocieron, qué querían para su día y qué momento nos marcó durante la cobertura.",
    cover: "assets/works/giulio-fer/01.jpg",
    video: "",
    photos: [{ src: "assets/works/giulio-fer/01.jpg", w: 640, h: 960 }],
  },
];
