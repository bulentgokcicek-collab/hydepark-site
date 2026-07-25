export async function onRequest(context) {
  const url = new URL(context.request.url);

  // Eğer istek "ai.hydeparkspeakers.com" alan adına geldiyse ve ana sayfa talep ediliyorsa
  if (url.hostname === "ai.hydeparkspeakers.com") {
    if (url.pathname === "/" || url.pathname === "/index.html") {
      // URL yolunu /ai-debate-template.html olarak değiştir ve statik varlıklardan bu dosyayı getir
      url.pathname = "/ai-debate-template.html";
      return context.env.ASSETS.fetch(url);
    }
  }

  // Diğer tüm istekleri (API, CSS, görseller vb.) normal akışına bırak
  return context.next();
}
