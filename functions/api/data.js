// Cloudflare Pages Functions endpoint for B&B Bilişim Target Tracker
// Supports Cloudflare KV (env.BVB_KV) or D1 (env.DB) or in-memory fallback

export async function onRequestGet(context) {
  const { env } = context;
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    // 1. Try Cloudflare KV if bound (BVB_KV)
    if (env && env.BVB_KV) {
      const dataStr = await env.BVB_KV.get('bvb_hedef_database');
      if (dataStr) {
        return new Response(dataStr, { headers: corsHeaders });
      }
    }

    // 2. Try Cloudflare D1 if bound (DB)
    if (env && env.DB) {
      try {
        const result = await env.DB.prepare(
          "SELECT data FROM bvb_store WHERE key = 'main_data'"
        ).first();
        if (result && result.data) {
          return new Response(result.data, { headers: corsHeaders });
        }
      } catch (d1Err) {
        // Table may not exist yet, we will create on post
      }
    }

    // Return empty payload indicating no remote data yet
    return new Response(
      JSON.stringify({ targets: null, transactions: null, isCloudReady: !!(env && (env.BVB_KV || env.DB)) }),
      { headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message, isCloudReady: false }),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function onRequestPost(context) {
  const { env, request } = context;
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const payload = await request.json();
    const dataStr = JSON.stringify(payload);

    // 1. Save to Cloudflare KV
    if (env && env.BVB_KV) {
      await env.BVB_KV.put('bvb_hedef_database', dataStr);
      return new Response(JSON.stringify({ success: true, storage: 'KV' }), { headers: corsHeaders });
    }

    // 2. Save to Cloudflare D1
    if (env && env.DB) {
      try {
        await env.DB.prepare(
          "CREATE TABLE IF NOT EXISTS bvb_store (key TEXT PRIMARY KEY, data TEXT, updated_at TEXT)"
        ).run();
        await env.DB.prepare(
          "INSERT INTO bvb_store (key, data, updated_at) VALUES ('main_data', ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at"
        ).bind(dataStr).run();
        return new Response(JSON.stringify({ success: true, storage: 'D1' }), { headers: corsHeaders });
      } catch (d1Err) {
        return new Response(JSON.stringify({ error: d1Err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // If neither KV nor D1 bound, return acknowledged status
    return new Response(
      JSON.stringify({ success: true, storage: 'client_cached', note: 'Bind BVB_KV or DB in Cloudflare Pages settings for permanent multi-device sync' }),
      { headers: corsHeaders }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
