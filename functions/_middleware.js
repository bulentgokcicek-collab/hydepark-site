export async function onRequest(context) {
  const url = new URL(context.request.url);
  const hostname = url.hostname;

  // İzin verilen alt alan adları (subdomain'ler) listesi
  const allowedSubdomains = [
    "ai", "career", "tech", "finance", "gaming", "crypto",
    "place-them-all", "just-swipe-away", "search-your-memory", "lingo-match"
  ];

  // Alt alan adını yakalıyoruz
  const parts = hostname.split(".");
  const subdomain = parts[0];

  // Eğer istek izin verilen bir subdomain'den geldse ve ana sayfa talep ediliyorsa
  if (parts.length > 2 && allowedSubdomains.includes(subdomain)) {
    if (url.pathname === "/" || url.pathname === "/index.html") {
      url.pathname = "/free-speech-template.html";
      return context.env.ASSETS.fetch(url);
    }
  }

  // Diğer tüm istekleri (resimler, CSS, API vb.) normal akışına bırak
  return context.next();
}
