// Database layer for B&B Bilişim Target Tracker
// Provides instant offline-first storage in localStorage + real-time multi-device cloud synchronization
// Works with Cloudflare Pages Functions and Vercel Functions (/api/data) cloud sync

import { USERS, CATEGORIES, MOBIL_SUB_CATEGORIES, DSL_SPEEDS, getCurrentMonth, getDaysInMonth, getLocalDayKey } from './constants';

const DB_PREFIX = 'bvb_hedef_';
const getKey = (key) => `${DB_PREFIX}${key}`;

let isSyncing = false;
let syncStatus = { connected: false, lastSync: null, storageType: 'local' };

// Initialize default data if not exists
export const initDB = () => {
  if (!localStorage.getItem(getKey('initialized'))) {
    const currentMonth = new Date().toISOString().slice(0, 7);
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
    localStorage.setItem(getKey('transactions'), JSON.stringify([]));
    localStorage.setItem(getKey('deleted_ids'), JSON.stringify([]));
    localStorage.setItem(getKey('initialized'), 'true');
  }
};

// TARGETS
export const getTargets = (month) => {
  initDB();
  const targets = JSON.parse(localStorage.getItem(getKey('targets')) || '{}');
  return targets[month] || { Mobil: 0, DSL: 0, TV: 0, Cihaz: 0, DigerCihaz: 0 };
};

export const setTargets = (month, targets) => {
  initDB();
  const allTargets = JSON.parse(localStorage.getItem(getKey('targets')) || '{}');
  allTargets[month] = targets;
  localStorage.setItem(getKey('targets'), JSON.stringify(allTargets));
  window.dispatchEvent(new CustomEvent('db-change', { detail: { type: 'targets' } }));
  triggerCloudPush();
};

// TRANSACTIONS
export const getTransactions = (month) => {
  initDB();
  const transactions = JSON.parse(localStorage.getItem(getKey('transactions')) || '[]');
  if (!month) return transactions;
  return transactions.filter(t => t.month === month);
};

export const getAllTransactions = () => {
  initDB();
  return JSON.parse(localStorage.getItem(getKey('transactions')) || '[]');
};

export const addTransaction = (transaction) => {
  initDB();
  const transactions = JSON.parse(localStorage.getItem(getKey('transactions')) || '[]');
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

  const transactions = JSON.parse(localStorage.getItem(getKey('transactions')) || '[]');
  const filtered = transactions.filter(t => !idList.includes(t.id));
  const removedCount = transactions.length - filtered.length;

  if (removedCount === 0) return 0;

  localStorage.setItem(getKey('transactions'), JSON.stringify(filtered));

  const deletedIds = JSON.parse(localStorage.getItem(getKey('deleted_ids')) || '[]');
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
export const getLeaderboard = (month) => {
  const transactions = getTransactions(month);
  const users = ['Atakan', 'Murat', 'Busra', 'Eda'];
  
  const leaderboard = users.map(user => {
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
export const getDayTransactions = (dayKey) => {
  if (!dayKey) return [];
  const month = dayKey.slice(0, 7);
  return getTransactions(month)
    .filter(tx => getTransactionDayKey(tx) === dayKey)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

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

  const targets = JSON.parse(localStorage.getItem(getKey('targets')) || '{}');
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
  window.addEventListener('db-change', handler);
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith(DB_PREFIX)) {
      handler();
    }
  });
  return () => {
    window.removeEventListener('db-change', handler);
    window.removeEventListener('storage', handler);
  };
};

// CLOUD SYNC ENGINE
export const getSyncStatus = () => syncStatus;

export const triggerCloudPush = async () => {
  if (isSyncing) return;
  try {
    const targets = JSON.parse(localStorage.getItem(getKey('targets')) || '{}');
    const transactions = JSON.parse(localStorage.getItem(getKey('transactions')) || '[]');
    const deletedIds = JSON.parse(localStorage.getItem(getKey('deleted_ids')) || '[]');
    const payload = {
      targets,
      transactions,
      deletedIds,
      updatedAt: new Date().toISOString()
    };

    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const result = await res.json();
      syncStatus = {
        connected: true,
        lastSync: new Date().toISOString(),
        storageType: result.storage || 'Bulut',
      };
      window.dispatchEvent(new CustomEvent('sync-status-change', { detail: syncStatus }));
    }
  } catch {
    // Silently continue in local-first mode
  }
};

export const syncWithCloud = async () => {
  if (isSyncing) return;
  isSyncing = true;
  try {
    const res = await fetch('/api/data');
    if (!res.ok) throw new Error('API not available');
    const cloudData = await res.json();

    if (cloudData && (cloudData.transactions || cloudData.targets)) {
      let hasChanges = false;
      const localTargets = JSON.parse(localStorage.getItem(getKey('targets')) || '{}');
      const localTransactions = JSON.parse(localStorage.getItem(getKey('transactions')) || '[]');
      const localDeletedIds = JSON.parse(localStorage.getItem(getKey('deleted_ids')) || '[]');
      
      const remoteDeletedIds = cloudData.deletedIds || [];
      const allDeletedIds = Array.from(new Set([...localDeletedIds, ...remoteDeletedIds]));
      localStorage.setItem(getKey('deleted_ids'), JSON.stringify(allDeletedIds));

      // Merge targets
      if (cloudData.targets) {
        const mergedTargets = { ...localTargets, ...cloudData.targets };
        if (JSON.stringify(mergedTargets) !== JSON.stringify(localTargets)) {
          localStorage.setItem(getKey('targets'), JSON.stringify(mergedTargets));
          hasChanges = true;
        }
      }

      // Merge transactions (union excluding deleted items)
      if (Array.isArray(cloudData.transactions)) {
        const txMap = new Map();
        [...localTransactions, ...cloudData.transactions].forEach(tx => {
          if (!allDeletedIds.includes(tx.id)) {
            txMap.set(tx.id, tx);
          }
        });
        const mergedTx = Array.from(txMap.values());
        if (mergedTx.length !== localTransactions.length) {
          localStorage.setItem(getKey('transactions'), JSON.stringify(mergedTx));
          hasChanges = true;
        }
      }

      syncStatus = {
        connected: true,
        lastSync: new Date().toISOString(),
        storageType: cloudData.isCloudReady ? 'Bulut Veritabanı (KV/Redis)' : 'Local-Online',
      };

      if (hasChanges) {
        window.dispatchEvent(new CustomEvent('db-change', { detail: { type: 'cloud-merge' } }));
      }
      window.dispatchEvent(new CustomEvent('sync-status-change', { detail: syncStatus }));
    }
  } catch {
    syncStatus = {
      connected: false,
      lastSync: syncStatus.lastSync,
      storageType: 'Yerel Depolama (Offline-First)',
    };
    window.dispatchEvent(new CustomEvent('sync-status-change', { detail: syncStatus }));
  } finally {
    isSyncing = false;
  }
};

// Automatic background sync scheduler (starts automatically)
if (typeof window !== 'undefined') {
  initDB();
  // Immediate initial sync
  setTimeout(syncWithCloud, 1000);
  // Recurring polling every 5 seconds
  setInterval(syncWithCloud, 5000);
  // Sync when window becomes active/visible
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      syncWithCloud();
    }
  });
}

// EXPORT / IMPORT
export const exportData = () => {
  return {
    targets: JSON.parse(localStorage.getItem(getKey('targets')) || '{}'),
    transactions: JSON.parse(localStorage.getItem(getKey('transactions')) || '[]'),
    deletedIds: JSON.parse(localStorage.getItem(getKey('deleted_ids')) || '[]'),
    exportedAt: new Date().toISOString(),
    version: '2.0',
  };
};

export const importData = (data) => {
  if (data.targets) {
    localStorage.setItem(getKey('targets'), JSON.stringify(data.targets));
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
  localStorage.removeItem(getKey('transactions'));
  localStorage.removeItem(getKey('deleted_ids'));
  localStorage.removeItem(getKey('initialized'));
  initDB();
  window.dispatchEvent(new CustomEvent('db-change', { detail: { type: 'reset' } }));
  triggerCloudPush();
};
