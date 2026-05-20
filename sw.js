self.addEventListener("install", () => {
  console.log("SW instalado");
});

self.addEventListener("fetch", () => {
  // por ahora vacío, solo para activar PWA
});