// Database layer for B&B Bilişim Target Tracker
// Provides instant offline-first storage in localStorage + real-time multi-device cloud synchronization
// Works with Cloudflare Pages Functions and Vercel Functions (/api/data) cloud sync

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
  };
  transactions.push(newTransaction);
  localStorage.setItem(getKey('transactions'), JSON.stringify(transactions));
  window.dispatchEvent(new CustomEvent('db-change', { detail: { type: 'transactions' } }));
  triggerCloudPush();
  return newTransaction;
};

export const deleteTransaction = (id) => {
  initDB();
  const transactions = JSON.parse(localStorage.getItem(getKey('transactions')) || '[]');
  const filtered = transactions.filter(t => t.id !== id);
  localStorage.setItem(getKey('transactions'), JSON.stringify(filtered));
  
  // Track deleted IDs to prevent reviving them during remote sync
  const deletedIds = JSON.parse(localStorage.getItem(getKey('deleted_ids')) || '[]');
  if (!deletedIds.includes(id)) {
    deletedIds.push(id);
    localStorage.setItem(getKey('deleted_ids'), JSON.stringify(deletedIds));
  }

  window.dispatchEvent(new CustomEvent('db-change', { detail: { type: 'transactions' } }));
  triggerCloudPush();
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
