// Constants used throughout the app

export const USERS = ['Atakan', 'Murat', 'Busra', 'Eda'];

// Yönetim hesabı: işlem giremez, sadece istatistikleri görür (salt-okunur)
export const MANAGEMENT_USER = 'Yönetim';

// Giriş ekranında seçilebilecek hesaplar (4 çalışan + yönetim)
export const LOGIN_ACCOUNTS = [...USERS, MANAGEMENT_USER];

export const isManagementUser = (userName) => userName === MANAGEMENT_USER;

export const CATEGORIES = [
  { key: 'Mobil', label: 'Mobil', icon: '📱', color: 'from-blue-500 to-cyan-400' },
  { key: 'DSL', label: 'DSL', icon: '🌐', color: 'from-green-500 to-emerald-400' },
  { key: 'TV', label: 'TV', icon: '📺', color: 'from-purple-500 to-pink-400' },
  { key: 'Cihaz', label: 'Cihaz', icon: '📦', color: 'from-orange-500 to-amber-400' },
  { key: 'DigerCihaz', label: 'Diğer Cihaz', icon: '🔧', color: 'from-red-500 to-rose-400' },
];

export const MOBIL_SUB_CATEGORIES = ['Yeni Hat', 'Numara Taşıma', 'Sponsor'];

export const DSL_SPEEDS = [16, 24, 35, 50, 100, 200, 500, 1000];

export const CATEGORY_MAP = {
  Mobil: 'Mobil',
  DSL: 'DSL',
  TV: 'TV',
  Cihaz: 'Cihaz',
  DigerCihaz: 'Diğer Cihaz',
};

export const USER_AVATARS = {
  Atakan: '👨‍💻',
  Murat: '👨‍🔧',
  Busra: '👩‍💼',
  Eda: '👩‍🎨',
  Yönetim: '🧑‍💼',
};

export const USER_COLORS = {
  Atakan: 'from-blue-500 to-indigo-500',
  Murat: 'from-emerald-500 to-teal-500',
  Busra: 'from-pink-500 to-rose-500',
  Eda: 'from-amber-500 to-orange-500',
  Yönetim: 'from-slate-500 to-slate-700',
};

// Admin şifresi: Vercel/yerel ortamda VITE_ADMIN_PASSWORD tanımlıysa o kullanılır, aksi halde varsayılan.
export const ADMIN_PASSWORD = import.meta.env?.VITE_ADMIN_PASSWORD || '3511';

// --- Yerel saat dilimine göre tarih/ay yardımcıları (UTC kayması olmadan) ---
const pad2 = (n) => String(n).padStart(2, '0');

// Ayın 1'inde otomatik olarak yeni aya geçer (yerel saat)
export const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
};

// Bir tarihin yerel gün anahtarı: 'YYYY-MM-DD'
export const getLocalDayKey = (dateInput = new Date()) => {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

// Bugünün gün anahtarı
export const getCurrentDay = () => getLocalDayKey(new Date());

// 'YYYY-MM' -> o aydaki gün sayısı
export const getDaysInMonth = (month) => {
  const [year, m] = month.split('-').map(Number);
  return new Date(year, m, 0).getDate();
};

// 'YYYY-MM' ayını delta kadar kaydırır
export const shiftMonth = (month, delta) => {
  const [year, m] = month.split('-').map(Number);
  const d = new Date(year, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
};

// 'YYYY-MM-DD' gününü delta kadar kaydırır
export const shiftDay = (dayKey, delta) => {
  const [year, m, day] = dayKey.split('-').map(Number);
  return getLocalDayKey(new Date(year, m - 1, day + delta));
};

// 'YYYY-MM-DD' -> "28 Eylül 2026 Pazartesi"
export const formatDay = (dayKey) => {
  const [year, m, day] = dayKey.split('-').map(Number);
  return new Date(year, m - 1, day).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
  });
};

// 'YYYY-MM-DD' -> "Bugün" / "Dün" / "Yarın" / "28 Eylül 2026"
export const getDayLabel = (dayKey) => {
  const today = getCurrentDay();
  if (dayKey === today) return 'Bugün';
  if (dayKey === shiftDay(today, -1)) return 'Dün';
  if (dayKey === shiftDay(today, 1)) return 'Yarın';
  return formatDay(dayKey);
};

export const formatMonth = (monthStr) => {
  const [year, month] = monthStr.split('-');
  const months = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];
  return `${months[parseInt(month) - 1]} ${year}`;
};

export const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatTime = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getTimeAgo = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Az önce';
  if (minutes < 60) return `${minutes} dk önce`;
  if (hours < 24) return `${hours} saat önce`;
  return `${days} gün önce`;
};
