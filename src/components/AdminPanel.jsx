import { useState, useEffect } from 'react';
import { 
  getTargets, 
  setTargets, 
  getTransactions, 
  deleteTransaction, 
  addTransaction, 
  exportData, 
  importData, 
  resetAllData, 
  getSyncStatus 
} from '../db';
import { 
  CATEGORIES, 
  CATEGORY_MAP, 
  USERS, 
  USER_AVATARS, 
  USER_COLORS, 
  ADMIN_PASSWORD, 
  formatMonth, 
  formatDate, 
  getCurrentMonth,
  MOBIL_SUB_CATEGORIES,
  DSL_SPEEDS
} from '../constants';

export default function AdminPanel({ month, addToast }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('bvb_admin_authed') === 'true';
  });
  const [password, setPassword] = useState('');
  const [activeSection, setActiveSection] = useState('targets'); // 'targets' | 'transactions' | 'cloudflare' | 'backup'
  const [selectedMonth, setSelectedMonth] = useState(month);
  const [targetValues, setTargetValues] = useState(() => getTargets(month));
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [editingTx, setEditingTx] = useState(null);
  const [filterUser, setFilterUser] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [syncInfo, setSyncInfo] = useState(getSyncStatus());

  useEffect(() => {
    const handleSyncStatus = (e) => setSyncInfo(e.detail);
    window.addEventListener('sync-status-change', handleSyncStatus);
    return () => window.removeEventListener('sync-status-change', handleSyncStatus);
  }, []);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem('bvb_admin_authed', 'true');
      addToast('Admin paneline hoş geldiniz! 🔓', 'success');
    } else {
      addToast('Hatalı şifre! (Şifre: 3511) ❌', 'error');
    }
    setPassword('');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('bvb_admin_authed');
    addToast('Admin panelinden çıkıldı', 'success');
  };

  const handleMonthChange = (m) => {
    setSelectedMonth(m);
    setTargetValues(getTargets(m));
  };

  const handleSaveTargets = () => {
    setTargets(selectedMonth, targetValues);
    addToast(`${formatMonth(selectedMonth)} hedefleri kaydedildi ve tüm cihazlara güncellendi! ✅`, 'success');
  };

  const handleDeleteTx = (id) => {
    deleteTransaction(id);
    setDeleteConfirmId(null);
    addToast('İşlem silindi ve hedeflerden düşüldü! 🗑️', 'success');
  };

  const handleSaveEditedTx = () => {
    if (!editingTx) return;
    deleteTransaction(editingTx.id);
    addTransaction({
      userName: editingTx.userName,
      category: editingTx.category,
      subCategory: editingTx.subCategory || null,
      description: editingTx.description || null,
      month: editingTx.month,
    });
    setEditingTx(null);
    addToast('İşlem başarıyla güncellendi! ✅', 'success');
  };

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bvb_bilisim_hedef_yedek_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Yedek dosyası cihazınıza indirildi! 📁', 'success');
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        importData(data);
        setTargetValues(getTargets(selectedMonth));
        addToast('Tüm veriler başarıyla geri yüklendi! ✅', 'success');
      } catch {
        addToast('Geçersiz yedek dosyası! ❌', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    if (window.confirm('Tüm aylık hedefleri ve kayıtlı işlemleri sıfırlamak istediğinize emin misiniz?')) {
      resetAllData();
      setTargetValues(getTargets(selectedMonth));
      addToast('Tüm veriler sıfırlandı! 🔄', 'success');
    }
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-16 animate-slide-up">
        <div className="glass-card p-6 w-full max-w-sm border-primary-500/30">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-3xl shadow-lg shadow-primary-500/30">
              🔐
            </div>
            <h2 className="text-lg font-black text-white">Yönetici Girişi</h2>
            <p className="text-xs text-surface-200/50">Admin şifresini girerek sisteme erişin</p>
          </div>

          <div className="space-y-4">
            <div>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Şifre (3511)"
                className="w-full bg-surface-800/80 border border-surface-700/60 rounded-xl px-4 py-3.5 text-center text-xl tracking-[0.5em] text-white placeholder:text-surface-200/30 placeholder:tracking-normal focus:outline-none focus:border-primary-500 transition-all font-mono"
                autoFocus
              />
            </div>

            <button
              type="button"
              onClick={handleLogin}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary-500 via-indigo-500 to-accent-500 text-white font-bold text-sm shadow-lg shadow-primary-500/25 active:scale-95 transition-all"
            >
              Giriş Yap
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Generate month list for selection
  const currentM = getCurrentMonth();
  const monthList = [];
  for (let i = -1; i <= 3; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() + i);
    monthList.push(d.toISOString().slice(0, 7));
  }

  const allTx = getTransactions(selectedMonth);
  let filteredTx = allTx;
  if (filterUser !== 'all') filteredTx = filteredTx.filter(t => t.userName === filterUser);
  if (filterCategory !== 'all') filteredTx = filteredTx.filter(t => t.category === filterCategory);
  filteredTx = [...filteredTx].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div className="space-y-4 stagger-children">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-1.5">
            <span>⚙️</span> Admin Yönetim Paneli
          </h2>
          <p className="text-[11px] text-surface-200/50">Hedefleri belirle, işlemleri düzelt ve yönet</p>
        </div>
        <button
          onClick={handleLogout}
          className="px-3 py-1.5 rounded-xl bg-surface-800 border border-surface-700 text-surface-200/70 text-xs font-bold hover:text-white hover:border-rose-500/40 transition-all"
        >
          Çıkış Yap
        </button>
      </div>

      {/* Month Selector */}
      <div className="glass-card p-3">
        <label className="text-[10px] font-bold text-surface-200/50 uppercase tracking-wider mb-2 block">
          Düzenlenen Ay
        </label>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {monthList.map(m => {
            const isSelected = selectedMonth === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => handleMonthChange(m)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                    : m === currentM
                      ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                      : 'bg-surface-800/60 text-surface-200/60'
                }`}
              >
                {formatMonth(m)} {m === currentM ? '(Bu Ay)' : ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* Nav Tabs */}
      <div className="grid grid-cols-4 gap-1.5 bg-surface-800/40 p-1 rounded-2xl border border-surface-700/30">
        {[
          { key: 'targets', label: '🎯 Hedef', title: 'Hedefler' },
          { key: 'transactions', label: '📋 İşlemler', title: 'Kayıtlar' },
          { key: 'cloudflare', label: '☁️ Cloud', title: 'Bulut' },
          { key: 'backup', label: '💾 Yedek', title: 'Yedekleme' },
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveSection(tab.key)}
            className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all ${
              activeSection === tab.key
                ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-md'
                : 'text-surface-200/60 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. SECTION: TARGET SETTINGS */}
      {activeSection === 'targets' && (
        <div className="glass-card p-4 space-y-4 animate-slide-up">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>🎯</span> {formatMonth(selectedMonth)} Hedefleri
            </h3>
            <p className="text-[11px] text-surface-200/50">
              Bu hedefler tüm ay boyunca sabit kalır ve girilen işlemlerden düşer.
            </p>
          </div>

          <div className="space-y-2.5">
            {CATEGORIES.map(cat => (
              <div
                key={cat.key}
                className="p-3 rounded-xl bg-surface-800/60 border border-surface-700/40 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{cat.icon}</span>
                  <div>
                    <span className="text-xs font-bold text-white block">{cat.label}</span>
                    <span className="text-[10px] text-primary-300 font-semibold block">
                      Kişi Başı: {Math.round((targetValues[cat.key] || 0) / 4)} Hedef
                    </span>
                    <span className="text-[9px] text-surface-200/40 font-medium">Toplam Hedef (4 Kişilik)</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetValues(prev => ({
                      ...prev,
                      [cat.key]: Math.max(0, (prev[cat.key] || 0) - 5)
                    }))}
                    className="w-8 h-8 rounded-lg bg-surface-700 text-white font-bold flex items-center justify-center active:scale-90"
                  >
                    -5
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={targetValues[cat.key] ?? 0}
                    onChange={(e) => setTargetValues(prev => ({
                      ...prev,
                      [cat.key]: Math.max(0, parseInt(e.target.value) || 0)
                    }))}
                    className="w-20 bg-surface-900 border border-surface-700 rounded-lg py-1.5 px-2 text-center text-sm font-black text-white focus:outline-none focus:border-primary-500"
                  />
                  <button
                    type="button"
                    onClick={() => setTargetValues(prev => ({
                      ...prev,
                      [cat.key]: (prev[cat.key] || 0) + 5
                    }))}
                    className="w-8 h-8 rounded-lg bg-primary-600 text-white font-bold flex items-center justify-center active:scale-90"
                  >
                    +5
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleSaveTargets}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-sm shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
          >
            💾 Hedefleri Kaydet & Tüm Ekibe Yayınla
          </button>
        </div>
      )}

      {/* 2. SECTION: TRANSACTION MANAGEMENT */}
      {activeSection === 'transactions' && (
        <div className="space-y-3 animate-slide-up">
          {/* Filter Pills */}
          <div className="glass-card p-3 space-y-2">
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setFilterUser('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${
                  filterUser === 'all' ? 'bg-primary-500 text-white' : 'bg-surface-800 text-surface-200/60'
                }`}
              >
                Herkes
              </button>
              {USERS.map(u => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setFilterUser(u)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1 ${
                    filterUser === u ? 'bg-primary-500 text-white' : 'bg-surface-800 text-surface-200/60'
                  }`}
                >
                  <span>{USER_AVATARS[u]}</span>
                  <span>{u}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setFilterCategory('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${
                  filterCategory === 'all' ? 'bg-primary-500 text-white' : 'bg-surface-800 text-surface-200/60'
                }`}
              >
                Tüm Kategoriler
              </button>
              {CATEGORIES.map(c => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setFilterCategory(c.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1 ${
                    filterCategory === c.key ? 'bg-primary-500 text-white' : 'bg-surface-800 text-surface-200/60'
                  }`}
                >
                  <span>{c.icon}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="text-[10px] text-surface-200/50 text-center">{filteredTx.length} işlem kaydı listeleniyor</p>

          {/* List */}
          {filteredTx.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <span className="text-3xl block mb-2">📭</span>
              <p className="text-xs text-surface-200/50">İşlem kaydı bulunamadı</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {filteredTx.map(tx => {
                const cat = CATEGORIES.find(c => c.key === tx.category);
                return (
                  <div key={tx.id} className="glass-card p-3 border-surface-700/40">
                    <div className="flex items-start gap-2.5">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${USER_COLORS[tx.userName]} flex items-center justify-center text-base flex-shrink-0`}>
                        {USER_AVATARS[tx.userName]}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-white">{tx.userName}</span>
                          <span className="text-[9px] text-surface-200/40">•</span>
                          <span className="text-[11px] font-bold text-surface-200/70">
                            {cat?.icon} {CATEGORY_MAP[tx.category]}
                          </span>
                        </div>

                        {tx.subCategory && (
                          <p className="text-[11px] font-semibold text-accent-300">{tx.subCategory}</p>
                        )}
                        {tx.description && (
                          <p className="text-[10px] text-surface-200/60 mt-0.5">{tx.description}</p>
                        )}

                        <p className="text-[9px] text-surface-200/30 mt-1">{formatDate(tx.createdAt)}</p>
                      </div>

                      {/* Edit & Delete Controls */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingTx({ ...tx })}
                          className="p-1.5 rounded-lg bg-surface-800 text-surface-200/60 hover:text-white"
                          title="Düzenle"
                        >
                          ✏️
                        </button>

                        {deleteConfirmId === tx.id ? (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => handleDeleteTx(tx.id)}
                              className="px-2 py-1 rounded-lg bg-rose-500 text-white text-[10px] font-black"
                            >
                              Sil!
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-1 rounded-lg bg-surface-800 text-surface-200/60 text-[10px]"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(tx.id)}
                            className="p-1.5 rounded-lg bg-surface-800 text-surface-200/60 hover:text-rose-400"
                            title="İşlemi Sil"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. SECTION: CLOUDFLARE SETUP & STATUS */}
      {activeSection === 'cloudflare' && (
        <div className="glass-card p-4 space-y-4 animate-slide-up">
          <div className="flex items-center justify-between pb-3 border-b border-surface-700/40">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>☁️</span> Cloudflare & Çoklu Cihaz Senkronizasyonu
              </h3>
              <p className="text-[10px] text-surface-200/50">Tüm çalışanların telefonları arasında anlık veri senkronizasyonu</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              🟢 {syncInfo?.storageType || 'Aktif'}
            </span>
          </div>

          {/* Quick status */}
          <div className="p-3 rounded-xl bg-surface-800/60 border border-surface-700/30 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-surface-200/60">Son Senkronizasyon:</span>
              <span className="text-white font-semibold">
                {syncInfo?.lastSync ? formatDate(syncInfo.lastSync) : 'Az önce'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-200/60">Arka Plan Yenileme:</span>
              <span className="text-emerald-400 font-semibold">Otomatik (5 sn bir)</span>
            </div>
          </div>

          {/* Cloudflare Pages Deployment Guide */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-primary-300 uppercase tracking-wider">
              🚀 Cloudflare Pages'a Yükleme Adımları:
            </h4>
            <div className="space-y-2 text-xs text-surface-200/70">
              <div className="p-2.5 rounded-xl bg-surface-800/40 border border-surface-700/20">
                <p className="font-bold text-white mb-1">1. Projeyi Derleyin:</p>
                <code className="text-[11px] bg-slate-950 px-2 py-1 rounded block text-emerald-400 font-mono">
                  npm run build
                </code>
                <p className="text-[10px] text-surface-200/50 mt-1">Oluşan <b>dist</b> klasörü sitenizi içerir.</p>
              </div>

              <div className="p-2.5 rounded-xl bg-surface-800/40 border border-surface-700/20">
                <p className="font-bold text-white mb-1">2. Cloudflare Dashboard'da Pages Açın:</p>
                <p className="text-[11px]">
                  Cloudflare &gt; <b>Workers & Pages</b> &gt; <b>Create application</b> &gt; <b>Pages</b> &gt; <b>Upload Assets</b> diyerek <b>dist</b> klasörünü yükleyin (veya GitHub reponuzu bağlayın).
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-surface-800/40 border border-surface-700/20">
                <p className="font-bold text-white mb-1">3. Cloudflare KV veya D1 Bağlama (Kalıcı Veritabanı):</p>
                <p className="text-[11px]">
                  Pages projenizin <b>Settings &gt; Functions &gt; KV namespace bindings</b> kısmına gidin:
                </p>
                <p className="text-[11px] text-amber-300 font-mono mt-0.5">
                  Değişken Adı: <b>BVB_KV</b>
                </p>
                <p className="text-[10px] text-surface-200/50 mt-1">
                  Bunu yaptığınızda tüm çalışanların girdiği tüm işlemler anında Cloudflare KV bulutunda saklanır ve hiçbir zaman kaybolmaz!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. SECTION: BACKUP & RESTORE */}
      {activeSection === 'backup' && (
        <div className="glass-card p-4 space-y-4 animate-slide-up">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>💾</span> Veri Yedekleme ve Sıfırlama
            </h3>
            <p className="text-[10px] text-surface-200/50">
              Verilerinizi bilgisayarınıza veya telefonunuza indirin, gerektiğinde tek tıkla geri yükleyin.
            </p>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleExport}
              className="w-full py-3.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20 active:scale-95 transition-all"
            >
              <span>📥</span> Verileri JSON Olarak İndir (Yedek Al)
            </button>

            <label className="w-full py-3.5 rounded-xl bg-surface-800 border border-surface-700 hover:border-primary-500/50 text-surface-200/80 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all">
              <span>📤</span> Yedek Dosyasını Geri Yükle (.json)
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
          </div>

          <div className="pt-4 border-t border-surface-700/40">
            <p className="text-[11px] font-bold text-rose-400 mb-2">Tehlikeli Bölge</p>
            <button
              type="button"
              onClick={handleResetData}
              className="w-full py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white font-bold text-xs transition-all active:scale-95"
            >
              ⚠️ Tüm Verileri Sıfırla (Fabrika Ayarları)
            </button>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-card w-full max-w-sm p-5 border border-primary-500/40 animate-slide-up space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-surface-700/40">
              <h4 className="text-sm font-bold text-white">İşlemi Düzenle</h4>
              <button onClick={() => setEditingTx(null)} className="text-surface-200/60 hover:text-white text-sm">
                ✕
              </button>
            </div>

            {/* Change User */}
            <div>
              <label className="text-[10px] font-bold text-surface-200/60 block mb-1">Çalışan</label>
              <select
                value={editingTx.userName}
                onChange={(e) => setEditingTx({ ...editingTx, userName: e.target.value })}
                className="w-full bg-surface-800 border border-surface-700 rounded-xl px-3 py-2 text-xs text-white"
              >
                {USERS.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            {/* Change Category */}
            <div>
              <label className="text-[10px] font-bold text-surface-200/60 block mb-1">Kategori</label>
              <select
                value={editingTx.category}
                onChange={(e) => setEditingTx({ ...editingTx, category: e.target.value, subCategory: '' })}
                className="w-full bg-surface-800 border border-surface-700 rounded-xl px-3 py-2 text-xs text-white"
              >
                {CATEGORIES.map(c => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* SubCategory if Mobil or DSL */}
            {editingTx.category === 'Mobil' && (
              <div>
                <label className="text-[10px] font-bold text-surface-200/60 block mb-1">Mobil İşlem Türü</label>
                <select
                  value={editingTx.subCategory || ''}
                  onChange={(e) => setEditingTx({ ...editingTx, subCategory: e.target.value })}
                  className="w-full bg-surface-800 border border-surface-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="">Seçiniz</option>
                  {MOBIL_SUB_CATEGORIES.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            )}

            {editingTx.category === 'DSL' && (
              <div>
                <label className="text-[10px] font-bold text-surface-200/60 block mb-1">DSL Hızı</label>
                <select
                  value={editingTx.subCategory || ''}
                  onChange={(e) => setEditingTx({ ...editingTx, subCategory: e.target.value })}
                  className="w-full bg-surface-800 border border-surface-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="">Seçiniz</option>
                  {DSL_SPEEDS.map(s => (
                    <option key={s} value={`${s} Mbps`}>{s} Mbps</option>
                  ))}
                </select>
              </div>
            )}

            {/* Description */}
            <div>
              <label className="text-[10px] font-bold text-surface-200/60 block mb-1">Açıklama / Not</label>
              <input
                type="text"
                value={editingTx.description || ''}
                onChange={(e) => setEditingTx({ ...editingTx, description: e.target.value })}
                className="w-full bg-surface-800 border border-surface-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                className="flex-1 py-2.5 rounded-xl bg-surface-800 text-surface-200/70 text-xs font-bold"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleSaveEditedTx}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
