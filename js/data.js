// MOCK — reemplazar imágenes, textos y video cuando lleguen los archivos reales.
// cover: foto del carrusel (vertical, ~4:5)
// video: URL de embed (YouTube/Vimeo) o .mp4 — vacío = placeholder
// photos: galería de la cobertura
const img = (seed, w = 900, h = 1125) => `https://picsum.photos/seed/bb-${seed}/${w}/${h}`;

const gallery = (seed, n = 8) =>
  Array.from({ length: n }, (_, i) =>
    i % 3 === 0 ? img(`${seed}-${i}`, 1200, 800) : img(`${seed}-${i}`, 800, 1000)
  );

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
    // La música tiene copyright (LatinAutor/UMPG) y YouTube bloquea el embed fuera de su sitio,
    // así que el play abre YouTube. Si suben una versión embebible, usar video: ".../embed/ID".
    video: "",
    watchUrl: "https://www.youtube.com/watch?v=yL7-UPrKCwg",
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
    id: "ben-meg",
    couple: "Ben & Meg",
    place: "Texas, USA",
    date: "Octubre 2024",
    collection: "the story™",
    tags: ["Fotografía", "Story film", "Pre-boda"],
    story:
      "Dos días en Texas: una sesión pre-boda entre campos abiertos y un día de boda lleno de detalles pequeños. Ben y Meg se ríen igual que hace diez años, y eso fue lo que quisimos guardar.",
    cover: img("benmeg"),
    video: "",
    photos: gallery("benmeg"),
  },
  {
    id: "talia-carlos",
    couple: "Talia & Carlos",
    place: "Lima, Perú",
    date: "Diciembre 2024",
    collection: "essentials™",
    tags: ["Fotografía", "Highlight film"],
    story:
      "Una celebración íntima en Lima, rodeados de las personas que más quieren. Lo esencial, tal como fue: miradas, abrazos y una pista de baile que no se vació hasta el final.",
    cover: img("talia"),
    video: "",
    photos: gallery("talia"),
  },
  {
    id: "mock-4",
    couple: "Andrea & Sebastián",
    place: "Cusco, Perú",
    date: "Mayo 2025",
    collection: "the legacy™",
    tags: ["Fotografía", "Legacy film", "Análogo 120mm"],
    story:
      "Texto de ejemplo. Aquí va la historia de la pareja: cómo se conocieron, qué querían para su día y qué momento nos marcó durante la cobertura.",
    cover: img("mock4"),
    video: "",
    photos: gallery("mock4"),
  },
  {
    id: "mock-5",
    couple: "Lucía & Mateo",
    place: "Arequipa, Perú",
    date: "Agosto 2025",
    collection: "the story™",
    tags: ["Fotografía", "Story film", "Wedding reel"],
    story:
      "Texto de ejemplo. Aquí va la historia de la pareja: cómo se conocieron, qué querían para su día y qué momento nos marcó durante la cobertura.",
    cover: img("mock5"),
    video: "",
    photos: gallery("mock5"),
  },
  {
    id: "mock-6",
    couple: "Valeria & Diego",
    place: "Máncora, Perú",
    date: "Febrero 2025",
    collection: "essentials™",
    tags: ["Fotografía", "Highlight film"],
    story:
      "Texto de ejemplo. Aquí va la historia de la pareja: cómo se conocieron, qué querían para su día y qué momento nos marcó durante la cobertura.",
    cover: img("mock6"),
    video: "",
    photos: gallery("mock6"),
  },
  {
    id: "mock-7",
    couple: "Camila & Joaquín",
    place: "Valle Sagrado, Perú",
    date: "Junio 2025",
    collection: "the legacy™",
    tags: ["Fotografía", "Legacy film", "Video dump"],
    story:
      "Texto de ejemplo. Aquí va la historia de la pareja: cómo se conocieron, qué querían para su día y qué momento nos marcó durante la cobertura.",
    cover: img("mock7"),
    video: "",
    photos: gallery("mock7"),
  },
];
