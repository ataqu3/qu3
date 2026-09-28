// Constants used throughout the app

export const USERS = ['Atakan', 'Murat', 'Busra', 'Eda'];

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
};

export const USER_COLORS = {
  Atakan: 'from-blue-500 to-indigo-500',
  Murat: 'from-emerald-500 to-teal-500',
  Busra: 'from-pink-500 to-rose-500',
  Eda: 'from-amber-500 to-orange-500',
};

export const ADMIN_PASSWORD = '3511';

export const getCurrentMonth = () => new Date().toISOString().slice(0, 7);

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
