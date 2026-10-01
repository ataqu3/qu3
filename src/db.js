// Database layer for B&B Bilişim Target Tracker
// Provides instant offline-first storage in localStorage + real-time multi-device cloud synchronization
// Works with Cloudflare Pages Functions and Vercel Functions (/api/data) cloud sync

import { USERS, CATEGORIES, MOBIL_SUB_CATEGORIES, DSL_SPEEDS, getCurrentMonth, getCurrentDay, getDaysInMonth, getLocalDayKey } from './constants';

const DB_PREFIX = 'bvb_hedef_';
const getKey = (key) => `${DB_PREFIX}${key}`;

let isSyncing = false;
let syncStatus = { connected: false, lastSync: null, storageType: 'local' };

// Bozuk JSON okumalarında uygulamanın çökmesini engeller
const safeParse = (raw, fallback) => {
  try {
    const value = JSON.parse(raw);
    return value === null || value === undefined ? fallback : value;
  } catch {
    return fallback;
  }
};

// Initialize default data if not exists
export const initDB = () => {
  if (!localStorage.getItem(getKey('initialized'))) {
    const currentMonth = getCurrentMonth();
    const defaultTargets = {
      [currentMonth]: {
        Mobil: 50,
        DSL: 40,
        TV: 20,
        Cihaz: 15,
        DigerCihaz: 10,
      }
    };
    localStorage.setItem(getKey('targets'), JSON.stringify(defaultTargets));
    localStorage.setItem(getKey('targets_updated_at'), JSON.stringify({ [currentMonth]: Date.now() }));
    localStorage.setItem(getKey('transactions'), JSON.stringify([]));
    localStorage.setItem(getKey('deleted_ids'), JSON.stringify([]));
    localStorage.setItem(getKey('initialized'), 'true');
  }
};

// TARGETS
export const getTargets = (month) => {
  initDB();
  const targets = safeParse(localStorage.getItem(getKey('targets')), {});
  return targets[month] || { Mobil: 0, DSL: 0, TV: 0, Cihaz: 0, DigerCihaz: 0 };
};

export const setTargets = (month, targets) => {
  initDB();
  const allTargets = safeParse(localStorage.getItem(getKey('targets')), {});
  allTargets[month] = targets;
  localStorage.setItem(getKey('targets'), JSON.stringify(allTargets));

  // Hedef zaman damgası: aynı ay için iki cihaz çakışırsa en son yazan kazanır,
  // böylece bayat bulut verisi yeni girilen hedefi geri almaz.
  const stamps = safeParse(localStorage.getItem(getKey('targets_updated_at')), {});
  stamps[month] = Date.now();
  localStorage.setItem(getKey('targets_updated_at'), JSON.stringify(stamps));

  window.dispatchEvent(new CustomEvent('db-change', { detail: { type: 'targets' } }));
  triggerCloudPush();
};

// TRANSACTIONS
export const getTransactions = (month) => {
  initDB();
  const transactions = safeParse(localStorage.getItem(getKey('transactions')), []);
  if (!month) return transactions;
  return transactions.filter(t => t.month === month);
};

export const getAllTransactions = () => {
  initDB();
  return safeParse(localStorage.getItem(getKey('transactions')), []);
};

export const addTransaction = (transaction) => {
  initDB();
  const transactions = safeParse(localStorage.getItem(getKey('transactions')), []);
  const newTransaction = {
    ...transaction,
    id: Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8),
    createdAt: new Date().toISOString(),
    dayKey: getLocalDayKey(),
  };
  transactions.push(newTransaction);
  localStorage.setItem(getKey('transactions'), JSON.stringify(transactions));
  window.dispatchEvent(new CustomEvent('db-change', { detail: { type: 'transactions' } }));
  triggerCloudPush();
  return newTransaction;
};

// Birden fazla işlemi tek seferde siler (toplu silme)
// Not: Silinen kimlikler 'deleted_ids' listesine yazılır, bulut senkronizasyonunda geri gelmezler.
export const deleteTransactions = (ids) => {
  initDB();
  const idList = Array.from(new Set((ids || []).filter(Boolean)));
  if (idList.length === 0) return 0;

  const transactions = safeParse(localStorage.getItem(getKey('transactions')), []);
  const filtered = transactions.filter(t => !idList.includes(t.id));
  const removedCount = transactions.length - filtered.length;

  if (removedCount === 0) return 0;

  localStorage.setItem(getKey('transactions'), JSON.stringify(filtered));

  const deletedIds = safeParse(localStorage.getItem(getKey('deleted_ids')), []);
  const mergedDeletedIds = Array.from(new Set([...deletedIds, ...idList]));
  localStorage.setItem(getKey('deleted_ids'), JSON.stringify(mergedDeletedIds));

  window.dispatchEvent(new CustomEvent('db-change', { detail: { type: 'transactions' } }));
  triggerCloudPush();
  return removedCount;
};

export const deleteTransaction = (id) => {
  deleteTransactions([id]);
};

// LEADERBOARD
// Aylık sıralama (Dashboard'daki "Çalışan Sıralaması" ve yönetim raporu bunu kullanır)
export const getLeaderboard = (month) => {
  const transactions = getTransactions(month);

  const leaderboard = USERS.map(user => {
    const userTransactions = transactions.filter(t => t.userName === user);
    return {
      userName: user,
      totalCount: userTransactions.length,
      categories: {
        Mobil: userTransactions.filter(t => t.category === 'Mobil').length,
        DSL: userTransactions.filter(t => t.category === 'DSL').length,
        TV: userTransactions.filter(t => t.category === 'TV').length,
        Cihaz: userTransactions.filter(t => t.category === 'Cihaz').length,
        DigerCihaz: userTransactions.filter(t => t.category === 'DigerCihaz').length,
      }
    };
  });
  
  return leaderboard.sort((a, b) => b.totalCount - a.totalCount);
};

// GÜNLÜK SIRLAMA ("Günün Lideri" rozeti)
// Yalnızca seçilen güne ait işlemleri sayar; gece yarısı kendiliğinden sıfırlanır.
export const getDailyLeaderboard = (dayKey = getCurrentDay()) => {
  const transactions = getDayTransactions(dayKey);

  return USERS
    .map(userName => ({
      userName,
      totalCount: transactions.filter(t => t.userName === userName).length,
    }))
    .sort((a, b) => b.totalCount - a.totalCount);
};

// CATEGORY TOTALS
export const getCategoryTotals = (month) => {
  const transactions = getTransactions(month);
  return {
    Mobil: transactions.filter(t => t.category === 'Mobil').length,
    DSL: transactions.filter(t => t.category === 'DSL').length,
    TV: transactions.filter(t => t.category === 'TV').length,
    Cihaz: transactions.filter(t => t.category === 'Cihaz').length,
    DigerCihaz: transactions.filter(t => t.category === 'DigerCihaz').length,
  };
};

// USER CATEGORY TOTALS
export const getUserCategoryTotals = (month, userName) => {
  const transactions = getTransactions(month).filter(t => t.userName === userName);
  return {
    Mobil: transactions.filter(t => t.category === 'Mobil').length,
    DSL: transactions.filter(t => t.category === 'DSL').length,
    TV: transactions.filter(t => t.category === 'TV').length,
    Cihaz: transactions.filter(t => t.category === 'Cihaz').length,
    DigerCihaz: transactions.filter(t => t.category === 'DigerCihaz').length,
  };
};

// CATEGORY & SUB-CATEGORY LEADERS (her kategoride en çok / en az yapanlar)
const buildRanking = (counts) => {
  const total = counts.reduce((sum, item) => sum + item.count, 0);
  const hasData = total > 0;
  const maxCount = counts.length ? Math.max(...counts.map(c => c.count)) : 0;
  const minCount = counts.length ? Math.min(...counts.map(c => c.count)) : 0;

  return {
    total,
    top: {
      count: maxCount,
      users: hasData ? counts.filter(c => c.count === maxCount).map(c => c.userName) : [],
    },
    bottom: {
      count: minCount,
      users: hasData ? counts.filter(c => c.count === minCount).map(c => c.userName) : [],
    },
    counts: [...counts].sort((a, b) => b.count - a.count),
  };
};

// Her ana kategori (Mobil, DSL, TV, Cihaz, Diğer Cihaz) için en çok ve en az yapanlar
export const getCategoryLeaders = (month) => {
  const transactions = getTransactions(month);

  return CATEGORIES.map(cat => ({
    category: cat.key,
    label: cat.label,
    icon: cat.icon,
    color: cat.color,
    ...buildRanking(
      USERS.map(userName => ({
        userName,
        count: transactions.filter(t => t.userName === userName && t.category === cat.key).length,
      }))
    ),
  }));
};

// İşlem türleri (Mobil: Yeni Hat/Numara Taşıma/Sponsor, DSL: hız paketleri) için en çok ve en az yapanlar
export const getSubCategoryLeaders = (month) => {
  const transactions = getTransactions(month);

  const types = [
    ...MOBIL_SUB_CATEGORIES.map(value => ({ category: 'Mobil', value, icon: '📱' })),
    ...DSL_SPEEDS.map(speed => ({ category: 'DSL', value: `${speed} Mbps`, icon: '🌐' })),
  ];

  return types.map(({ category, value, icon }) => ({
    category,
    value,
    icon,
    ...buildRanking(
      USERS.map(userName => ({
        userName,
        count: transactions.filter(
          t => t.userName === userName && t.category === category && t.subCategory === value
        ).length,
      }))
    ),
  }));
};

// DAILY / MONTHLY VIEW HELPERS
// Bir işlemin hangi güne ait olduğunu döner (yerel gün; eski kayıtlarda createdAt'ten hesaplanır)
export const getTransactionDayKey = (tx) => tx.dayKey || getLocalDayKey(tx.createdAt);

// Belirtilen güne ait işlemler (en yeniden en eskiye)
// dayKey yetkili alandır; ay öneki yalnızca hız için kullanılır ve tutmazsa
// tüm kayıtlar taranır (ay sınırında "dün"ün verisi kaybolmaz).
export const getDayTransactions = (dayKey) => {
  if (!dayKey) return [];

  const inMonth = getTransactions(dayKey.slice(0, 7)).filter(tx => getTransactionDayKey(tx) === dayKey);
  if (inMonth.length > 0) return sortByCreatedAtDesc(inMonth);

  // Ay değişimi gibi uç durumlarda tüm kayıtlara bak
  return sortByCreatedAtDesc(getAllTransactions().filter(tx => getTransactionDayKey(tx) === dayKey));
};

const sortByCreatedAtDesc = (list) => [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

// Belirtilen günün kategori bazlı özeti
export const getDayTotals = (dayKey) => {
  const list = getDayTransactions(dayKey);
  const categories = {};
  CATEGORIES.forEach(cat => { categories[cat.key] = 0; });
  list.forEach(tx => {
    if (categories[tx.category] !== undefined) categories[tx.category] += 1;
  });
  return { total: list.length, categories };
};

// Ayın her günü için işlem sayısı (toplu aylık görünüm / gün grafiği)
export const getDailyBreakdown = (month) => {
  const transactions = getTransactions(month);
  const counts = new Map();

  transactions.forEach(tx => {
    const dayKey = getTransactionDayKey(tx);
    if (!dayKey || !dayKey.startsWith(month)) return;
    counts.set(dayKey, (counts.get(dayKey) || 0) + 1);
  });

  const result = [];
  const dayCount = getDaysInMonth(month);
  for (let day = 1; day <= dayCount; day++) {
    const dayKey = `${month}-${String(day).padStart(2, '0')}`;
    result.push({ dayKey, day, count: counts.get(dayKey) || 0 });
  }
  return result;
};

// Ayın hedefleri girilmiş mi? (hedef girilene kadar işlemler "bekleyen" sayılır)
export const hasTargets = (month) => {
  const targets = getTargets(month);
  return Object.values(targets || {}).some(value => (value || 0) > 0);
};

// Ay listesi + işlem sayısı (geçmiş ayları görebilmek için; en yeni ay başta)
export const getMonthSummaries = () => {
  const months = new Set();

  getAllTransactions().forEach(tx => { if (tx.month) months.add(tx.month); });

  const targets = safeParse(localStorage.getItem(getKey('targets')), {});
  Object.keys(targets).forEach(month => { if (month) months.add(month); });

  months.add(getCurrentMonth());

  return Array.from(months)
    .sort((a, b) => (a < b ? 1 : -1))
    .map(month => ({
      month,
      count: getTransactions(month).length,
      hasTargets: hasTargets(month),
    }));
};

// INDIVIDUAL TARGETS (Total targets divided equally by 4 employees)
export const getIndividualTargets = (month) => {
  const totalTargets = getTargets(month);
  const indTargets = {};
  Object.keys(totalTargets).forEach(key => {
    // Divided by 4 persons
    indTargets[key] = Math.round((totalTargets[key] || 0) / 4);
  });
  return indTargets;
};


// RECENT ACTIVITY
export const getRecentActivity = (month, limit = 25) => {
  const transactions = getTransactions(month);
  return transactions
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
};

// EVENT LISTENER
export const useDBListener = (callback) => {
  const handler = () => callback();
  const storageHandler = (e) => {
    if (e.key && e.key.startsWith(DB_PREFIX)) handler();
  };
  window.addEventListener('db-change', handler);
  window.addEventListener('storage', storageHandler);
  return () => {
    window.removeEventListener('db-change', handler);
    window.removeEventListener('storage', storageHandler);
  };
};

// CLOUD SYNC ENGINE
// Amaç: bir telefonda girilen işlem diğer telefonlarda saniyeler içinde görünsün.
// Nasıl çalışır:
//   1) Her yerel değişiklik "kirli" (dirty) işaretler ve kısa bir gecikmeyle buluta yazılır.
//   2) Yazmadan hemen önce bulutun son hali çekilip yerel veriyle birleştirilir; böylece
//      başka cihazın verisi ezilmez (last-write-wins tehlikesi yoktur).
//   3) Düzenli aralıklarla bulut çekilir (pull) ve ekrana yansıtılır.
// ÖNCEKİ HATA: push çağrısı "isSyncing" sırasında sessizce düşüyordu; girilen işlem
// hiçbir zaman buluta ulaşmıyordu. Artık push asla düşmez: kirlilik bayrağı açık kalır
// ve sonraki turda tekrar denenir.

const SYNC_VISIBLE_MS = 3000;    // ekran açıkken çekme aralığı (anlık his)
const SYNC_HIDDEN_MS = 15000;   // arka plandayken (pil dostu)
const PUSH_DEBOUNCE_MS = 600;    // ardışık değişiklikleri tek gönderimde birleştir
const CLOUD_TIMEOUT_MS = 10000;  // takılı istekte yoklamayı kilitlemesin
const STATUS_EVENT_MIN_MS = 10000; // durum olayının en sık gönderilme aralığı

let pushDirty = false;   // buluta gönderilmeyi bekleyen yerel değişiklik var mı
let pushTimer = null;    // debounce zamanlayıcısı
let changeSeq = 0;       // her yerel değişiklikte artar (push sırasında yeni değişiklik kontrolü)
let pollTimer = null;
let lastStatusEventAt = 0;

export const getSyncStatus = () => syncStatus;

// Yerel verinin tamamını tek bir anlık görüntü olarak okur
const readLocalSnapshot = () => ({
  targets: safeParse(localStorage.getItem(getKey('targets')), {}),
  targetsUpdatedAt: safeParse(localStorage.getItem(getKey('targets_updated_at')), {}),
  transactions: safeParse(localStorage.getItem(getKey('transactions')), []),
  deletedIds: safeParse(localStorage.getItem(getKey('deleted_ids')), []),
});

// Hedefler: aynı ay için en son yazan cihazın değeri kazanır (bayat veri hedefi geri almaz)
const mergeTargets = (localTargets, localStamps, remoteTargets, remoteStamps) => {
  const targets = { ...localTargets };
  const stamps = { ...localStamps };

  Object.keys(remoteTargets || {}).forEach(month => {
    const remoteValue = remoteTargets[month];
    if (!remoteValue) return;
    if ((remoteStamps?.[month] || 0) >= (localStamps?.[month] || 0)) {
      targets[month] = remoteValue;
      stamps[month] = remoteStamps[month];
    }
  });

  return { targets, stamps };
};

// Yerel ve bulut anlık görüntülerini birleştirir (silinen kayıtlar geri gelmez)
const mergeSnapshots = (local, remote) => {
  const deletedIds = Array.from(new Set([...(local.deletedIds || []), ...(remote.deletedIds || [])]));
  const { targets, stamps } = mergeTargets(
    local.targets,
    local.targetsUpdatedAt,
    remote.targets,
    remote.targetsUpdatedAt
  );

  const txMap = new Map();
  [...(remote.transactions || []), ...(local.transactions || [])].forEach(tx => {
    if (!tx || !tx.id || deletedIds.includes(tx.id)) return;
    const current = txMap.get(tx.id);
    if (!current || String(tx.createdAt || '') >= String(current.createdAt || '')) txMap.set(tx.id, tx);
  });

  // Her cihazda aynı sıralama olsun ki "değişiklik var" yanlış sinyalleri üretilmesin
  const transactions = Array.from(txMap.values()).sort((a, b) =>
    String(a.createdAt || '').localeCompare(String(b.createdAt || '')) || String(a.id).localeCompare(String(b.id))
  );

  return { targets, targetsUpdatedAt: stamps, transactions, deletedIds };
};

// Birleşik durumu localStorage'a yazar; gerçekten bir şey değiştiyse true döner
const applySnapshot = (snapshot) => {
  const local = readLocalSnapshot();
  let changed = false;

  if (JSON.stringify(local.targets) !== JSON.stringify(snapshot.targets)) {
    localStorage.setItem(getKey('targets'), JSON.stringify(snapshot.targets));
    changed = true;
  }
  if (JSON.stringify(local.targetsUpdatedAt) !== JSON.stringify(snapshot.targetsUpdatedAt)) {
    localStorage.setItem(getKey('targets_updated_at'), JSON.stringify(snapshot.targetsUpdatedAt));
    changed = true;
  }
  if (JSON.stringify(local.deletedIds) !== JSON.stringify(snapshot.deletedIds)) {
    localStorage.setItem(getKey('deleted_ids'), JSON.stringify(snapshot.deletedIds));
    changed = true;
  }
  // Uzunluk değil İÇERİK karşılaştırılır: güncellenen kayıtlar da yakalanır
  if (JSON.stringify(local.transactions) !== JSON.stringify(snapshot.transactions)) {
    localStorage.setItem(getKey('transactions'), JSON.stringify(snapshot.transactions));
    changed = true;
  }

  return changed;
};

// Durum değiştiğinde ekrana bildir (her yoklamada render tetiklememek için kısıtlı)
const updateSyncStatus = (patch) => {
  const next = { ...syncStatus, ...patch };
  const meaningfulChange = next.connected !== syncStatus.connected || next.storageType !== syncStatus.storageType;
  syncStatus = next;

  const now = Date.now();
  if (!meaningfulChange && now - lastStatusEventAt < STATUS_EVENT_MIN_MS) return;

  lastStatusEventAt = now;
  window.dispatchEvent(new CustomEvent('sync-status-change', { detail: syncStatus }));
};

// Buluttan güncel dokümanı çeker (önbellek ve takılma koruması ile)
const fetchCloud = async () => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CLOUD_TIMEOUT_MS);

  try {
    const res = await fetch(`/api/data?_=${Date.now()}`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Bulut okunamadı (${res.status})`);

    const data = await res.json();
    if (!data || data.error) throw new Error(data?.error || 'Bulut okunamadı');
    return data;
  } finally {
    clearTimeout(timeoutId);
  }
};

// Yerel değişiklikten sonra çağrılır: veriyi "gönderilmeyi bekliyor" işaretler ve kısa sürede yazar
export const triggerCloudPush = () => {
  pushDirty = true;
  changeSeq += 1;

  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    pushToCloud();
  }, PUSH_DEBOUNCE_MS);
};

// Yerel değişiklikleri buluta yazar (göndermeden önce bulutla birleştirilir)
const pushToCloud = async () => {
  if (!pushDirty || isSyncing) return;
  isSyncing = true;
  const seqAtStart = changeSeq;

  try {
    // 1) Bulutun son halini çek ve yerelle birleştir (başka cihazın verisi korunur)
    try {
      const remote = await fetchCloud();
      if (applySnapshot(mergeSnapshots(readLocalSnapshot(), remote))) {
        window.dispatchEvent(new CustomEvent('db-change', { detail: { type: 'cloud-merge' } }));
      }
    } catch {
      // Bulut okunamıyorsa da göndermeyi dene; bağlantı gelince veri kurtarılır
    }

    // 2) Birleşik dokümanı buluta yaz
    const payload = { ...readLocalSnapshot(), updatedAt: new Date().toISOString() };
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Buluta yazılamadı (${res.status})`);

    const result = await res.json().catch(() => ({}));

    // Yazma sırasında yeni bir değişiklik olduysa kirlilik bayrağı açık kalır
    if (changeSeq === seqAtStart) pushDirty = false;

    updateSyncStatus({
      connected: true,
      lastSync: new Date().toISOString(),
      storageType: result.storage || 'Bulut Veritabanı (KV/Redis)',
    });
  } catch {
    // pushDirty true kalır: veri kaybolmaz, sonraki turda tekrar denenir
    updateSyncStatus({ connected: false, storageType: 'Yerel Depolama (Offline-First)' });
  } finally {
    isSyncing = false;
  }
};

// Buluttan güncel veriyi çeker, yerelle birleştirir ve ekrana yansıtır
export const syncWithCloud = async () => {
  if (isSyncing) return;
  isSyncing = true;

  try {
    const remote = await fetchCloud();

    if (applySnapshot(mergeSnapshots(readLocalSnapshot(), remote))) {
      window.dispatchEvent(new CustomEvent('db-change', { detail: { type: 'cloud-merge' } }));
    }

    updateSyncStatus({
      connected: true,
      lastSync: new Date().toISOString(),
      storageType: remote.isCloudReady ? 'Bulut Veritabanı (KV/Redis)' : 'Local-Online',
    });
  } catch {
    updateSyncStatus({ connected: false, storageType: 'Yerel Depolama (Offline-First)' });
  } finally {
    isSyncing = false;
    // Yerelde bekleyen değişiklik varsa hemen yaz (hiçbir işlem bulutta kalmaz)
    if (pushDirty) await pushToCloud();
  }
};

// Automatic background sync scheduler (starts automatically)
// Ekran açıkken 3 saniyede bir, arka plandayken 15 saniyede bir bulut kontrolü yapılır.
const scheduleNextPoll = () => {
  if (pollTimer) clearTimeout(pollTimer);
  const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
  pollTimer = setTimeout(async () => {
    await syncWithCloud();
    scheduleNextPoll();
  }, hidden ? SYNC_HIDDEN_MS : SYNC_VISIBLE_MS);
};

if (typeof window !== 'undefined') {
  initDB();
  // Immediate initial sync
  setTimeout(syncWithCloud, 800);
  scheduleNextPoll();

  // Sekme tekrar görünür olduğunda, ağ bağlantısı geldiğinde veya sayfa geri geldiğinde
  // beklemeden çek: kullanıcı telefonu açtığı an güncel veriyi görür
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    syncWithCloud();
    scheduleNextPoll();
  });
  window.addEventListener('online', () => syncWithCloud());
  window.addEventListener('focus', () => syncWithCloud());
  window.addEventListener('pageshow', () => syncWithCloud());
}

// EXPORT / IMPORT
export const exportData = () => {
  return {
    ...readLocalSnapshot(),
    exportedAt: new Date().toISOString(),
    version: '2.1',
  };
};

export const importData = (data) => {
  if (data.targets) {
    localStorage.setItem(getKey('targets'), JSON.stringify(data.targets));
  }
  if (data.targetsUpdatedAt) {
    localStorage.setItem(getKey('targets_updated_at'), JSON.stringify(data.targetsUpdatedAt));
  }
  if (data.transactions) {
    localStorage.setItem(getKey('transactions'), JSON.stringify(data.transactions));
  }
  if (data.deletedIds) {
    localStorage.setItem(getKey('deleted_ids'), JSON.stringify(data.deletedIds));
  }
  window.dispatchEvent(new CustomEvent('db-change', { detail: { type: 'import' } }));
  triggerCloudPush();
};

export const resetAllData = () => {
  localStorage.removeItem(getKey('targets'));
  localStorage.removeItem(getKey('targets_updated_at'));
  localStorage.removeItem(getKey('transactions'));
  localStorage.removeItem(getKey('deleted_ids'));
  localStorage.removeItem(getKey('initialized'));
  initDB();
  window.dispatchEvent(new CustomEvent('db-change', { detail: { type: 'reset' } }));
  triggerCloudPush();
};
