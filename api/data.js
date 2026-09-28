// Vercel Function endpoint for B&B Bilişim Hedef Takip Sistemi
// Cloudflare Pages Function (functions/api/data.js) dosyasının Vercel karşılığıdır.
// Aynı sözleşmeyi kullanır:  GET /api/data  ->  kayıtlı JSON dokümanını döner
//                           POST /api/data ->  gönderilen JSON dokümanını kaydeder
//
// Veri deposu: Upstash Redis (Vercel Marketplace > "Upstash for Redis", eski adı "Vercel KV")
// Hiçbir npm bağımlılığı gerekmez, Upstash REST API doğrudan fetch ile çağrılır.

const REDIS_KEY = 'bvb_hedef_database';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const JSON_HEADERS = {
  ...CORS_HEADERS,
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

// Vercel Marketplace entegrasyonları iki farklı isimlendirme kullanabiliyor:
// - "Upstash for Redis" (ve eski Vercel KV): KV_REST_API_URL / KV_REST_API_TOKEN
// - @upstash/redis SDK varsayılanı:          UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
const getRedisConfig = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ''), token };
};

// Upstash REST API: POST <REST_URL> + gövdede JSON komut dizisi (["SET","key","value"] gibi)
const redisCommand = async (config, command) => {
  const res = await fetch(config.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Upstash Redis hatası (${res.status})${text ? `: ${text.slice(0, 200)}` : ''}`);
  }

  const payload = await res.json();
  if (payload && payload.error) throw new Error(payload.error);
  return payload ? payload.result : null;
};

// Redis bağlı değilse kullanılan geçici bellek deposu (vercel dev / demo).
// Sunucu örneği yeniden başladığında sıfırlanır, kalıcı değildir.
let memoryStore = null;

export async function GET() {
  try {
    const config = getRedisConfig();

    if (config) {
      const stored = await redisCommand(config, ['GET', REDIS_KEY]);
      if (stored) {
        const body = typeof stored === 'string' ? stored : JSON.stringify(stored);
        return new Response(body, { headers: JSON_HEADERS });
      }
      return new Response(
        JSON.stringify({ targets: null, transactions: null, isCloudReady: true }),
        { headers: JSON_HEADERS }
      );
    }

    if (memoryStore) {
      return new Response(memoryStore, { headers: JSON_HEADERS });
    }

    return new Response(
      JSON.stringify({ targets: null, transactions: null, isCloudReady: false }),
      { headers: JSON_HEADERS }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message, isCloudReady: false }),
      { status: 500, headers: JSON_HEADERS }
    );
  }
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const dataStr = JSON.stringify(payload);
    const config = getRedisConfig();

    if (config) {
      await redisCommand(config, ['SET', REDIS_KEY, dataStr]);
      return new Response(
        JSON.stringify({ success: true, storage: 'Upstash Redis (Vercel)' }),
        { headers: JSON_HEADERS }
      );
    }

    memoryStore = dataStr;
    return new Response(
      JSON.stringify({
        success: true,
        storage: 'Vercel Bellek (geçici)',
        note: 'Kalıcı çoklu cihaz senkronizasyonu için Vercel projesine Upstash Redis entegrasyonu ekleyin.',
      }),
      { headers: JSON_HEADERS }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: JSON_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
