export async function onRequest(context) {
  const url = new URL(context.request.url);

  // Eğer istek "ai.hydeparkspeakers.com" alan adına geldiyse
  if (url.hostname === "ai.hydeparkspeakers.com") {
    // Sadece kök dizin (/) doğrudan çağrıldığında AI tartışma sayfasını sunuyoruz
    if (url.pathname === "/") {
      url.pathname = "/ai-debate-template.html";
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
