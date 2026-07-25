export async function onRequest(context) {
  const url = new URL(context.request.url);
  const hostname = url.hostname;

  // İzin verilen alt alan adları (subdomain'ler) listesi
  const allowedSubdomains = ["ai", "career", "tech", "finance", "gaming"];

  // Alt alan adını yakalıyoruz (Örn: career.hydeparkspeakers.com -> career)
  const parts = hostname.split(".");
  const subdomain = parts[0];

  // Eğer istek izin verilen alt alan adlarından birine geldiyse
  if (parts.length > 2 && allowedSubdomains.includes(subdomain)) {
    // Sadece kök dizin (/) veya /index.html doğrudan çağrıldığında dinamik şablon sayfamızı sunuyoruz
    if (url.pathname === "/" || url.pathname === "/index.html") {
      url.pathname = "/free-speech-template.html";
      return context.env.ASSETS.fetch(url);
    }
    
    // Alt alan adında bir .html sayfası talep edilirse, ana alan adına yönlendiriyoruz
    if (url.pathname.endsWith(".html")) {
      let targetPath = url.pathname;
      if (targetPath === "/index.html") {
        targetPath = "/";
      }
      const redirectUrl = `https://hydeparkspeakers.com${targetPath}${url.search}`;
      return Response.redirect(redirectUrl, 302);
    }
  }

  // Diğer tüm istekleri (API, CSS, görseller vb.) normal akışına bırak
  return context.next();
}
