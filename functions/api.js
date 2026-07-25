// SHA-256 ile IP adresini anonim olarak hashleme fonksiyonu
async function getIpHash(request) {
  const ip = request.headers.get("CF-Connecting-IP") || "127.0.0.1";
  const msgUint8 = new TextEncoder().encode(ip);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const ipHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return ipHash;
}

export async function onRequest(context) {
  const { request, env } = context;
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  if (request.method === "OPTIONS") return new Response(null, { headers, status: 204 });

  try {
    // -------------------------------------------------------------
    // GET: YORUMLARI LİSTELEME (KONU FİLTRELİ)
    // -------------------------------------------------------------
    if (request.method === "GET") {
      const url = new URL(request.url);
      const sort = url.searchParams.get("sort") || "date-asc";
      const topic = url.searchParams.get("topic") || "ai"; // Konu parametresi (Örn: ai, politika vb.)
      
      let query = "SELECT * FROM comments WHERE topic = ?";
      if (sort === "date-desc") query += " ORDER BY created_at DESC";
      else if (sort === "rating-desc") query += " ORDER BY (total_points * 1.0 / CASE WHEN vote_count = 0 THEN 1 ELSE vote_count END) DESC";
      else query += " ORDER BY created_at ASC"; // WhatsApp Tarzı: En eski en üstte

      const { results } = await env.DB.prepare(query).bind(topic).all();
      return new Response(JSON.stringify(results), { headers, status: 200 });
    }

    // -------------------------------------------------------------
    // POST: YENİ YORUM GÖNDERME (KONU ALANLI VE YAZILIMSAL FİLTRELİ)
    // -------------------------------------------------------------
    if (request.method === "POST") {
      const data = await request.json();
      const { username, comment, topic } = data;
      const finalTopic = topic || "ai";

      if (!username || !comment) {
        return new Response(JSON.stringify({ error: "Missing fields" }), { headers, status: 400 });
      }

      // 🛡️ AKILLI FİLTRE: Yayın politikasını korumak için temel zararlı kelime kontrolü
      const toxicWords = ["slur", "hate", "küfür1", "küfür2", "hakaret1", "spam"]; // Filtrelenecek kelimeler
      const isToxic = toxicWords.some(word => comment.toLowerCase().includes(word));

      if (isToxic) {
        return new Response(JSON.stringify({ error: "Your comment contains words that violate our free speech guidelines." }), { headers, status: 422 });
      }

      // D1 SQL veri tabanına topic alanı ile birlikte yaz
      await env.DB.prepare("INSERT INTO comments (username, comment, stars, topic) VALUES (?, ?, 3, ?)")
        .bind(username, comment, finalTopic).run();

      return new Response(JSON.stringify({ success: true }), { headers, status: 201 });
    }

    // -------------------------------------------------------------
    // PUT: BALONCUĞA OY VERME (IP KONTROLLÜ)
    // -------------------------------------------------------------
    if (request.method === "PUT") {
      const data = await request.json();
      const { id, rating } = data;

      if (!id || !rating) return new Response(JSON.stringify({ error: "Invalid data" }), { headers, status: 400 });

      // Ziyaretçinin IP hash değerini alıyoruz
      const ipHash = await getIpHash(request);

      // Daha önce bu yoruma oy verip vermediğini votes tablosundan kontrol ediyoruz
      const checkVote = await env.DB.prepare(
        "SELECT 1 FROM votes WHERE comment_id = ? AND ip_hash = ?"
      ).bind(id, ipHash).first();

      if (checkVote) {
        return new Response(JSON.stringify({ error: "You have already rated this comment!" }), { headers, status: 400 });
      }

      // İşlemleri atomik olarak yürütüyoruz: votes tablosuna kaydet ve comments tablosunda puanı güncelle
      await env.DB.batch([
        env.DB.prepare("INSERT INTO votes (comment_id, ip_hash) VALUES (?, ?)").bind(id, ipHash),
        env.DB.prepare("UPDATE comments SET total_points = total_points + ?, vote_count = vote_count + 1 WHERE id = ?").bind(rating, id)
      ]);

      return new Response(JSON.stringify({ success: true }), { headers, status: 200 });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { headers, status: 405 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { headers, status: 500 });
  }
}
