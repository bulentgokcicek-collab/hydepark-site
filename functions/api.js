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
    // GET: LİSTELEME
    if (request.method === "GET") {
      const url = new URL(request.url);
      const sort = url.searchParams.get("sort") || "date-asc";
      
      let query = "SELECT * FROM comments";
      if (sort === "date-desc") query += " ORDER BY created_at DESC";
      else if (sort === "rating-desc") query += " ORDER BY (total_points * 1.0 / CASE WHEN vote_count = 0 THEN 1 ELSE vote_count END) DESC";
      else query += " ORDER BY created_at ASC";

      const { results } = await env.DB.prepare(query).all();
      return new Response(JSON.stringify(results), { headers, status: 200 });
    }

    // POST: YENİ YORUM YAZMA
    if (request.method === "POST") {
      const data = await request.json();
      const { username, comment } = data;

      if (!username || !comment) return new Response(JSON.stringify({ error: "Missing fields" }), { headers, status: 400 });

      // AI Denetimi
      const aiResponse = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [
          { role: "system", content: "Your only job is to analyze the comment and output EXACTLY 'SAFE' or 'TOXIC'. No other words." },
          { role: "user", content: comment }
        ]
      });
      const aiDecision = aiResponse.choices.message.content.trim().toUpperCase();
      if (aiDecision.includes("TOXIC")) return new Response(JSON.stringify({ error: "Flagged by AI as inappropriate." }), { headers, status: 422 });

      await env.DB.prepare("INSERT INTO comments (username, comment) VALUES (?, ?)")
        .bind(username, comment).run();

      return new Response(JSON.stringify({ success: true }), { headers, status: 201 });
    }

    // PUT: BALONCUĞA OY VERME (YENİ SEÇENEK)
    if (request.method === "PUT") {
      const data = await request.json();
      const { id, rating } = data;

      if (!id || !rating) return new Response(JSON.stringify({ error: "Invalid data" }), { headers, status: 400 });

      // Matematiksel olarak puanı ve oy sayısını arttırıyoruz
      await env.DB.prepare(
        "UPDATE comments SET total_points = total_points + ?, vote_count = vote_count + 1 WHERE id = ?"
      ).bind(rating, id).run();

      return new Response(JSON.stringify({ success: true }), { headers, status: 200 });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { headers, status: 405 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { headers, status: 500 });
  }
}
