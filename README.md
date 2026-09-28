# B ve B Bilişim - Aylık Hedef Takip Sistemi 🚀

Bu uygulama, **B ve B Bilişim** ekibinin (Atakan, Murat, Büşra ve Eda) aylık hedeflerini canlı olarak takip etmesi, motivasyonu en üst seviyeye çıkarması ve girilen işlemlerin hedeften anında düşmesini sağlamak için özel olarak geliştirilmiş **Mobile-First Fullstack** bir web uygulamasıdır.

---

## 🌟 Öne Çıkan Özellikler

1. **📱 Mobil Odaklı Tasarım (Mobile-First):**
   - Telefonlardan uygulama gibi rahatça açılır ve kullanılır (PWA & iOS/Android safe-area uyumlu).
   - Glassmorphism, modern koyu tema, yumuşak geçişler ve dokunmatik butonlar.

2. **🎯 Canlı Hedef Takibi (Hedef - Yapılan = Kalan):**
   - Aylık hedefler belirlenir ve tüm ay boyunca sabit kalır.
   - Herhangi bir çalışan yeni işlem girdiğinde, kalan hedef sayısı anında canlı olarak düşer.
   - Kategoriler: **Mobil**, **DSL**, **TV**, **Cihaz** ve **Diğer Cihaz**.

3. **📱 Mobil & DSL Özel Seçenekleri:**
   - **Mobil:** `Yeni Hat`, `Numara Taşıma`, `Sponsor` seçenekleri.
   - **DSL:** `16`, `24`, `35`, `50`, `100`, `200`, `500` ve `1000` Mbps hız seçenekleri.
   - Diğer kategoriler için hızlı 1 tıkla kayıt.
   - Çoklu işlem yapanlar için Adet seçimi (1, 2, 3...).

4. **👑 Liderlik Tablosu & Kral Tacı (Motivasyon Sistemi):**
   - En çok işlem yapan ekip üyesinin profilinin ve adının yanında **parıldayan altın kral tacı (👑)** yer alır.
   - Herkes birbirinin kaç işlem yaptığını ve hangi kategorilerde önde olduğunu anlık görür.
   - İsme dokunulduğunda o kişinin detaylı dökümü açılır.

5. **⚡ Canlı Akış & Yanlış İşlemi Silme (Geri Al):**
   - Kim, ne zaman, hangi işlemi yapmış herkes anlık akıştan görebilir.
   - Yanlış girilen bir işlem olursa çalışan kendi işlemini tek tıkla silebilir veya işlem girildikten sonra hemen "Geri Al" butonuna basabilir.

6. **🔐 Admin Yönetim Paneli (Şifreli Giriş):**
   - Şifreli giriş: şifre ekranda hiçbir yerde gösterilmez. Varsayılan şifre koda tanımlıdır ve `VITE_ADMIN_PASSWORD` ortam değişkeni ile değiştirilebilir.
   - Aylık hedefleri kategori bazında düzenleme ve kaydetme.
   - Tüm çalışanların işlemlerini inceleme, yanlış kayıtları düzeltme veya silme.
   - Verileri tek tıkla JSON formatında yedekleme (İndir) ve geri yükleme.
   - Cloudflare senkronizasyon ayarları.

7. **☁️ Cloudflare & Çoklu Cihaz Senkronizasyonu:**
   - Her çalışanın telefonundan aynı verileri görmesi için Cloudflare Pages Functions (`/functions/api/data.js`) ve Cloudflare KV / D1 desteği entegre edilmiştir.
   - İnternet kesilse bile offline-first çalışır, bağlantı gelince otomatik senkronize olur.

8. **🏆 Kategori Şampiyonları ("Liderler" sekmesi):**
   - Her kategori (Mobil, DSL, TV, Cihaz, Diğer Cihaz) için **en çok yapan** ve **en az yapan** çalışanlar; isim, avatar ve işlem sayısıyla listelenir.
   - Kart içinde 4 çalışanın kişi bazlı dağılım çubukları gösterilir (lider çubuk altın renkli).
   - **İşlem türü sıralaması** paneli: Yeni Hat, Numara Taşıma, Sponsor ve 16–1000 Mbps DSL paketlerinde en çok / en az yapanlar.

---

## 🛠️ Nasıl Çalıştırılır?

### Yerel Olarak Çalıştırma:
```bash
npm run dev
```
Tarayıcınızda veya telefonunuzdan aynı Wi-Fi ağındayken açabilirsiniz:
- Bilgisayarda: `http://localhost:5173`
- Telefonda: Vite terminalinde çıkan yerel IP adresi (örn: `http://192.168.1.xxx:5173`)

### Cloudflare Pages'a Yükleme:
1. Terminalde derleyin:
   ```bash
   npm run build
   ```
2. Cloudflare Dashboard'a girin:
   - **Workers & Pages** > **Create application** > **Pages**
   - **Upload assets** seçeneğiyle oluşturulan **`dist`** klasörünü sürükleyip bırakın (veya GitHub reponuzu bağlayın).
   - Özel domaininizi (örn: `hedef.bvb.com.tr`) bağlayın.
3. Kalıcı veritabanı için:
   - Pages projenizin ayarlarında **Settings > Functions > KV namespace bindings** kısmına gidin.
   - Değişken adı: **`BVB_KV`** olarak bir KV namespace bağlayın. Artık tüm verileriniz Cloudflare bulutunda güvenle saklanır.

### ▲ Vercel'e Yükleme (Önerilen) + Upstash Redis Veritabanı:

1. **Projeyi GitHub'dan içe aktarın:**
   - Vercel Dashboard > **Add New...** > **Project** > `ataqu3/qu3` deposunu seçin.
   - Vite otomatik algılanır: **Build Command:** `npm run build`, **Output Directory:** `dist`.
2. **Veritabanını (Upstash Redis) kurun:**
   - Vercel Dashboard > **Storage** (Integrations) > **Marketplace** > **Upstash for Redis** > **Install** > projenizi seçin > bölge: **Frankfurt (fra1)** > **Create**.
   - Entegrasyon projeye **`KV_REST_API_URL`** ve **`KV_REST_API_TOKEN`** ortam değişkenlerini otomatik ekler. `/api/data` fonksiyonu bu değişkenleri okur; `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` isimleri de desteklenir.
   - CLI ile kurmak isterseniz: `npm i -g vercel` → `vercel link` → `vc i upstash/upstash-kv`
3. **Yeniden dağıtın (Redeploy):** Ortam değişkenleri yalnızca **yeni** dağıtımlarda geçerli olur. **Deployments** > son dağıtım > **Redeploy**.
4. **Doğrulayın:** `https://<proje-adiniz>.vercel.app/api/data` adresini açın. İlk açılışta `{"targets":null,"transactions":null,"isCloudReady":true}` görürsünüz; uygulamadan bir işlem girildiğinde aynı adreste **`transactions`** dolmaya başlar. Admin panelindeki durum rozetinde **Upstash Redis (Vercel)** yazar.
5. **Yerelde test:** `vercel env pull .env.local` (değişkenleri indirir) → `vercel dev` (arayüz + canlı sunucu fonksiyonu birlikte çalışır).

> ℹ️ **Not:** Vercel'in kendi **Vercel KV** ve **Vercel Postgres** ürünleri Aralık 2024'te kaldırıldı; yerine Marketplace üzerinden **Upstash Redis** ve **Neon Postgres** sunuluyor. Bu proje tek bir JSON dokümanı sakladığı için Redis en uygun ve en ekonomik çözümdür. İlişkisel veritabanı (Neon Postgres) tercih ederseniz `api/data.js` içindeki Redis çağrılarını `@neondatabase/serverless` ile SQL sorgularına çevirmeniz yeterlidir.

> 🔀 Hem Cloudflare (`functions/api/data.js`) hem Vercel (`api/data.js`) sürümü aynı `/api/data` sözleşmesini kullanır. İki platformu aynı anda kullanırsanız iki ayrı veritabanı (Cloudflare KV ve Upstash Redis) oluşur; veriler birbirine karışmaz, tek bir platform tercih edin.

---


---
© 2026 B ve B Bilişim
