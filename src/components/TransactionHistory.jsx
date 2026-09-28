import { useState } from 'react';
import { getTransactions, deleteTransaction } from '../db';
import { CATEGORIES, CATEGORY_MAP, USERS, USER_AVATARS, USER_COLORS, formatDate, getTimeAgo } from '../constants';

export default function TransactionHistory({ currentUser, month, addToast }) {
  const [filterUser, setFilterUser] = useState('all'); // 'all' | 'mine' | user name
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const allTransactions = getTransactions(month);

  let filtered = allTransactions;

  if (filterUser === 'mine') {
    filtered = filtered.filter(t => t.userName === currentUser);
  } else if (filterUser !== 'all') {
    filtered = filtered.filter(t => t.userName === filterUser);
  }

  if (categoryFilter !== 'all') {
    filtered = filtered.filter(t => t.category === categoryFilter);
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(t => 
      (t.description && t.description.toLowerCase().includes(q)) ||
      (t.subCategory && t.subCategory.toLowerCase().includes(q)) ||
      (t.userName && t.userName.toLowerCase().includes(q))
    );
  }

  // Sort descending
  filtered = [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const handleDelete = (id) => {
    deleteTransaction(id);
    setConfirmDeleteId(null);
    addToast('İşlem silindi ve hedef güncellendi! 🗑️', 'success');
  };

  return (
    <div className="space-y-4 stagger-children">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-lg font-black text-white">İşlem Akışı & Geçmiş</h2>
        <p className="text-xs text-surface-200/50">Tüm ekibin girdiği işlemleri canlı olarak takip et</p>
      </div>

      {/* Search Input */}
      <div className="glass-card p-2.5">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="İsim, açıklama veya hız ara..."
            className="w-full bg-surface-800/60 border border-surface-700/40 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-surface-200/30 focus:outline-none focus:border-primary-500/50 transition-all"
          />
          <span className="absolute left-3 top-2.5 text-xs text-surface-200/40">🔍</span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-surface-200/50 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* User Filter Pills */}
      <div className="glass-card p-3">
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10px] font-bold text-surface-200/60 uppercase tracking-wider">
            Çalışan Filtresi
          </label>
          <span className="text-[10px] text-surface-200/40 font-semibold">{filtered.length} işlem</span>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setFilterUser('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              filterUser === 'all'
                ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                : 'bg-surface-800/60 text-surface-200/60 hover:bg-surface-800'
            }`}
          >
            👥 Herkes ({allTransactions.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterUser('mine')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              filterUser === 'mine'
                ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                : 'bg-surface-800/60 text-surface-200/60 hover:bg-surface-800'
            }`}
          >
            ⭐ Benim ({allTransactions.filter(t => t.userName === currentUser).length})
          </button>

          {USERS.map(user => {
            const count = allTransactions.filter(t => t.userName === user).length;
            const isSelected = filterUser === user;
            return (
              <button
                key={user}
                type="button"
                onClick={() => setFilterUser(user)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                    : 'bg-surface-800/60 text-surface-200/60 hover:bg-surface-800'
                }`}
              >
                <span>{USER_AVATARS[user]}</span>
                <span>{user}</span>
                <span className="text-[10px] opacity-70 font-normal">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="glass-card p-3">
        <label className="text-[10px] font-bold text-surface-200/60 uppercase tracking-wider mb-2 block">
          Kategori Filtresi
        </label>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              categoryFilter === 'all'
                ? 'bg-primary-500 text-white'
                : 'bg-surface-800/60 text-surface-200/60'
            }`}
          >
            Tümü
          </button>
          {CATEGORIES.map(cat => {
            const isSelected = categoryFilter === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setCategoryFilter(cat.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-primary-500 text-white'
                    : 'bg-surface-800/60 text-surface-200/60'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Transaction List */}
      {filtered.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <span className="text-4xl block mb-2">📭</span>
          <h3 className="text-sm font-bold text-white mb-1">Kayıt Bulunamadı</h3>
          <p className="text-xs text-surface-200/40">Seçilen filtrelere uygun işlem kaydı yok</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(tx => {
            const cat = CATEGORIES.find(c => c.key === tx.category);
            const isOwn = tx.userName === currentUser;

            return (
              <div
                key={tx.id}
                className={`glass-card p-3.5 transition-all ${
                  isOwn ? 'border-primary-500/30 bg-primary-950/20' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* User Avatar */}
                  <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${USER_COLORS[tx.userName]} flex items-center justify-center text-lg shadow-sm flex-shrink-0`}>
                    {USER_AVATARS[tx.userName]}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-black ${isOwn ? 'text-primary-300' : 'text-white'}`}>
                        {tx.userName}
                      </span>
                      {isOwn && (
                        <span className="text-[9px] bg-primary-500/30 text-primary-300 px-1.5 py-0.2 rounded font-bold">
                          Senin İşlemin
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-base">{cat?.icon}</span>
                      <span className="text-xs font-bold text-white">
                        {CATEGORY_MAP[tx.category] || tx.category}
                      </span>
                      {tx.subCategory && (
                        <>
                          <span className="text-surface-200/40 text-[10px]">•</span>
                          <span className="text-xs font-semibold text-accent-300">
                            {tx.subCategory}
                          </span>
                        </>
                      )}
                    </div>

                    {tx.description && (
                      <p className="text-xs text-surface-200/70 mt-1 bg-surface-850/60 p-1.5 rounded-lg border border-surface-700/20">
                        {tx.description}
                      </p>
                    )}

                    <p className="text-[10px] text-surface-200/40 mt-1.5">
                      {formatDate(tx.createdAt)} ({getTimeAgo(tx.createdAt)})
                    </p>
                  </div>

                  {/* Delete button (Employees can delete their own mistakes) */}
                  {isOwn && (
                    <div className="flex-shrink-0">
                      {confirmDeleteId === tx.id ? (
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => handleDelete(tx.id)}
                            className="px-2.5 py-1 rounded-lg bg-rose-500 text-white text-[10px] font-black shadow-md hover:bg-rose-600 active:scale-95 transition-all"
                          >
                            Sil
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2.5 py-1 rounded-lg bg-surface-800 text-surface-200/60 text-[10px] font-bold hover:bg-surface-700"
                          >
                            İptal
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(tx.id)}
                          title="Yanlış yapılan işlemi sil"
                          className="p-2 rounded-xl text-surface-200/40 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
