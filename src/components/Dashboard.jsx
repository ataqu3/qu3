import { useState } from 'react';
import { 
  getTargets, 
  getCategoryTotals, 
  getLeaderboard, 
  getRecentActivity, 
  getTransactions, 
  getIndividualTargets, 
  getUserCategoryTotals,
  hasTargets
} from '../db';
import { CATEGORIES, USERS, USER_AVATARS, USER_COLORS, CATEGORY_MAP, formatMonth, getTimeAgo } from '../constants';

export default function Dashboard({ currentUser, month, readOnly = false }) {
  // 'personal' (default: user's 1/4 share) or 'team' (total team 4-person target)
  const [viewMode, setViewMode] = useState(readOnly ? 'team' : 'personal');
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);

  const teamTargets = getTargets(month);
  const indTargets = getIndividualTargets(month);
  const teamTotals = getCategoryTotals(month);
  const userTotals = getUserCategoryTotals(month, currentUser);
  const leaderboard = getLeaderboard(month);
  const recentActivity = getRecentActivity(month, 20);
  const allTx = getTransactions(month);
  // Hedefler (ayın 6-7'sinde) girilmediyse işlemler "bekleyen" olarak gösterilir
  const targetsReady = hasTargets(month);

  // Active targets and totals based on viewMode
  const activeTargets = viewMode === 'personal' ? indTargets : teamTargets;
  const activeTotals = viewMode === 'personal' ? userTotals : teamTotals;

  const totalTarget = Object.values(activeTargets).reduce((a, b) => a + b, 0);
  const totalDone = Object.values(activeTotals).reduce((a, b) => a + b, 0);
  const remainingTotal = Math.max(0, totalTarget - totalDone);
  const overallPercent = totalTarget > 0 ? Math.min(100, Math.round((totalDone / totalTarget) * 100)) : 0;

  const topPerformer = leaderboard.length > 0 && leaderboard[0].totalCount > 0 ? leaderboard[0] : null;

  // Personal individual target total for each person
  const personalTotalTargetSum = Object.values(indTargets).reduce((a, b) => a + b, 0);

  // Selected user detail transactions
  const selectedUserTx = selectedUserDetail 
    ? allTx.filter(t => t.userName === selectedUserDetail.userName)
    : [];

  return (
    <div className="space-y-4 stagger-children">
      {/* Top Motivation Banner - Crown on Top Performer */}
      {topPerformer && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/20 via-primary-500/20 to-purple-500/20 border border-amber-500/30 p-3.5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${USER_COLORS[topPerformer.userName]} flex items-center justify-center text-2xl shadow-lg shadow-amber-500/20`}>
                  {USER_AVATARS[topPerformer.userName]}
                </div>
                <span className="absolute -top-2.5 -right-2 text-xl crown-animate">👑</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                    Günün Lideri
                  </span>
                </div>
                <h3 className="text-base font-black text-white flex items-center gap-1.5">
                  {topPerformer.userName}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold">
                    {topPerformer.totalCount} İşlem
                  </span>
                </h3>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl">🔥</span>
              <p className="text-[9px] text-amber-200/70 font-semibold">Hedefe Koşuyor</p>
            </div>
          </div>
        </div>
      )}

      {/* Target View Mode Selector (Personal 1/4 vs Full Team) */}
      {!readOnly && (
      <div className="grid grid-cols-2 gap-1.5 bg-surface-850/80 p-1 rounded-2xl border border-surface-700/40">
        <button
          type="button"
          onClick={() => setViewMode('personal')}
          className={`py-2 px-2 text-center rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            viewMode === 'personal'
              ? 'bg-gradient-to-r from-primary-500 to-indigo-500 text-white shadow-md shadow-primary-500/25 ring-1 ring-white/20'
              : 'text-surface-200/60 hover:text-white'
          }`}
        >
          <span>{USER_AVATARS[currentUser]}</span>
          <span className="truncate">{currentUser}'ın Kalan Hedefi</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('team')}
          className={`py-2 px-2 text-center rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            viewMode === 'team'
              ? 'bg-gradient-to-r from-primary-500 to-indigo-500 text-white shadow-md shadow-primary-500/25 ring-1 ring-white/20'
              : 'text-surface-200/60 hover:text-white'
          }`}
        >
          <span>👥</span>
          <span className="truncate">Tüm Ekip Hedefi</span>
        </button>
      </div>
      )}

      {/* Month & Target Status Banner */}
      <div className="glass-card p-4 relative overflow-hidden border-primary-500/20">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-black text-white">
                {viewMode === 'personal' ? `${currentUser}'ın Hedef Tablosu` : 'B&B Bilişim Toplam Hedef'}
              </h2>
            </div>
            <p className="text-[11px] text-surface-200/60 font-medium">
              {viewMode === 'personal'
                ? `Hedef 4 çalışana eşit bölündü (1/4 Payın) • ${formatMonth(month)}`
                : `4 Kişinin Toplam Ortak Hedefi • ${formatMonth(month)}`}
            </p>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${
              !targetsReady
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : remainingTotal === 0
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full animate-ping ${targetsReady ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              {!targetsReady ? '🎯 Hedef Bekleniyor' : remainingTotal === 0 ? '🎉 Bitti!' : `${remainingTotal} Kalan`}
            </span>
          </div>
        </div>

        {/* Progress Bar & Big Numbers */}
        <div className="space-y-2">
          {targetsReady ? (
            <>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-surface-200/70 font-semibold">
                  Yapılan: <b className="text-white text-sm">{totalDone}</b> / {totalTarget}
                </span>
                <span className="text-primary-300 font-black text-base">%{overallPercent}</span>
              </div>

              <div className="h-3 bg-surface-800/80 rounded-full overflow-hidden p-0.5 border border-primary-500/20">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary-500 via-indigo-500 to-emerald-400 transition-all duration-1000 ease-out shadow-lg shadow-primary-500/40"
                  style={{ width: `${overallPercent}%` }}
                />
              </div>
            </>
          ) : (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1">
              <p className="text-[11px] font-bold text-amber-300">🎯 {formatMonth(month)} hedefleri henüz girilmedi</p>
              <p className="text-[11px] text-surface-200/70 leading-relaxed">
                Hedefler genelde ayın 6-7'sinde belirlenir. Şu ana kadar girilen{' '}
                <b className="text-white">{totalDone}</b> işlem kayıtlı; hedefler admin panelinden girildiği an
                bu işlemler <b className="text-white">otomatik olarak hedeften düşecek</b>.
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 pt-2 text-center">
            <div className="p-2 rounded-xl bg-surface-800/40 border border-surface-700/30">
              <p className="text-[9px] text-surface-200/50 uppercase font-semibold">
                {viewMode === 'personal' ? 'Senin Hedefin' : 'Ekip Hedefi'}
              </p>
              <p className="text-base font-black text-white">{targetsReady ? totalTarget : '—'}</p>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-[9px] text-emerald-400 uppercase font-semibold">
                {viewMode === 'personal' ? 'Senin Yaptığın' : 'Yapılan'}
              </p>
              <p className="text-base font-black text-emerald-300">{totalDone}</p>
            </div>
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 ring-1 ring-amber-400/20">
              <p className="text-[9px] text-amber-400 uppercase font-bold">
                {viewMode === 'personal' ? 'Kalan Hedefin' : 'Kalan Hedef'}
              </p>
              <p className="text-base font-black text-amber-300 count-animate">{targetsReady ? remainingTotal : '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Progress Cards */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-surface-200/80 uppercase tracking-wider">
            {viewMode === 'personal' ? `${currentUser}'a Düşen Kategori Hedefleri` : 'Ekip Kategori Hedefleri'}
          </h3>
          <span className="text-[10px] text-surface-200/40">
            {viewMode === 'personal' ? 'Kişi Başı (1/4)' : 'Toplam'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {CATEGORIES.map(cat => {
            const target = activeTargets[cat.key] || 0;
            const done = activeTotals[cat.key] || 0;
            const remaining = Math.max(0, target - done);
            const percent = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0;
            const isCompleted = remaining === 0 && target > 0;
            const teamTotalTarget = teamTargets[cat.key] || 0;

            return (
              <div
                key={cat.key}
                className="glass-card p-3 glass-card-hover relative overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xl">{cat.icon}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                      isCompleted ? 'bg-emerald-500/20 text-emerald-300' :
                      percent >= 70 ? 'bg-amber-500/20 text-amber-300' :
                      'bg-primary-500/20 text-primary-300'
                    }`}>
                      %{percent}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-white mb-0.5">{cat.label}</h4>

                  {viewMode === 'personal' && (
                    <p className="text-[9px] text-surface-200/40 mb-1">
                      Toplam {teamTotalTarget} / 4 = <b>{target} hedef</b>
                    </p>
                  )}

                  <div className="flex items-baseline justify-between mb-2">
                    <div>
                      <span className="text-lg font-black text-white">{done}</span>
                      <span className="text-[10px] text-surface-200/40 font-medium"> / {target}</span>
                    </div>
                    <span className={`text-xs font-black px-1.5 py-0.5 rounded ${
                      isCompleted 
                        ? 'text-emerald-400 bg-emerald-500/10' 
                        : 'text-amber-400 bg-amber-500/10'
                    }`}>
                      {isCompleted ? '✓ Bitti' : `${remaining} kaldı`}
                    </span>
                  </div>
                </div>

                <div>
                  {/* Progress bar */}
                  <div className="h-2 bg-surface-800 rounded-full overflow-hidden mb-1">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${cat.color} transition-all duration-700`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <p className="text-[9px] text-surface-200/40 text-right">
                    {remaining > 0 ? `Kalan: ${remaining}` : 'Hedef tamamlandı!'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leaderboard - Ekip Üyelerinin Durumu */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏆</span>
            <div>
              <h3 className="text-sm font-bold text-white">Çalışan Sıralaması</h3>
              <p className="text-[10px] text-surface-200/50">Herkesin hedefi ve kalan sayısı</p>
            </div>
          </div>
          <span className="text-[10px] text-surface-200/40">Detay için dokun</span>
        </div>

        <div className="space-y-2">
          {leaderboard.map((user, idx) => {
            const isTop = idx === 0 && user.totalCount > 0;
            const isCurrentUser = user.userName === currentUser;
            const userRemaining = Math.max(0, personalTotalTargetSum - user.totalCount);
            const userPercent = personalTotalTargetSum > 0 
              ? Math.min(100, Math.round((user.totalCount / personalTotalTargetSum) * 100))
              : 0;

            return (
              <button
                key={user.userName}
                onClick={() => setSelectedUserDetail(user)}
                className={`w-full text-left flex items-center gap-3 p-3 rounded-xl transition-all active:scale-[0.98] ${
                  isCurrentUser
                    ? 'bg-primary-500/15 border border-primary-500/30 hover:border-primary-500/50'
                    : 'bg-surface-800/40 hover:bg-surface-800/70 border border-surface-700/20'
                } ${isTop ? 'ring-2 ring-amber-400/40 shadow-lg shadow-amber-500/10' : ''}`}
              >
                {/* Rank Badge */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0 ${
                  idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-slate-950 shadow-md' :
                  idx === 1 ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-950' :
                  idx === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white' :
                  'bg-surface-800 text-surface-200/60'
                }`}>
                  {idx === 0 ? '👑' : idx + 1}
                </div>

                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${USER_COLORS[user.userName]} flex items-center justify-center text-lg relative flex-shrink-0`}>
                  {USER_AVATARS[user.userName]}
                  {isTop && (
                    <span className="absolute -top-2.5 -right-1 text-sm crown-animate">👑</span>
                  )}
                </div>

                {/* Name & Categories */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${isCurrentUser ? 'text-primary-300' : 'text-white'}`}>
                      {user.userName}
                    </span>
                    {isCurrentUser && (
                      <span className="text-[9px] bg-primary-500/20 text-primary-300 px-1.5 py-0.2 rounded-full font-bold">
                        Sen
                      </span>
                    )}
                    {isTop && (
                      <span className="text-[9px] bg-amber-400/20 text-amber-300 px-1.5 py-0.2 rounded-full font-bold">
                        Lider
                      </span>
                    )}
                  </div>

                  <p className="text-[10px] text-surface-200/50 mt-0.5">
                    Hedef: <b>{personalTotalTargetSum}</b> • <span className="text-amber-400 font-semibold">{userRemaining} kaldı</span>
                  </p>

                  {/* Micro category badges */}
                  <div className="flex gap-1.5 mt-1 overflow-x-auto scrollbar-none">
                    {CATEGORIES.map(cat => (
                      <span
                        key={cat.key}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-surface-900/60 text-surface-200/70 whitespace-nowrap"
                        title={cat.label}
                      >
                        {cat.icon} {user.categories[cat.key] || 0}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Total count & Remaining */}
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-black text-white">{user.totalCount}</p>
                  <p className="text-[9px] text-emerald-400 font-bold">%{userPercent}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* User Detail Modal */}
      {selectedUserDetail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-card w-full max-w-sm p-5 border border-primary-500/30 animate-slide-up max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-surface-700/40">
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${USER_COLORS[selectedUserDetail.userName]} flex items-center justify-center text-xl`}>
                  {USER_AVATARS[selectedUserDetail.userName]}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{selectedUserDetail.userName} - Detaylar</h4>
                  <p className="text-[10px] text-surface-200/50">
                    Toplam {selectedUserDetail.totalCount} / {personalTotalTargetSum} işlem
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserDetail(null)}
                className="w-8 h-8 rounded-full bg-surface-800 text-surface-200/70 hover:text-white flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Category Breakdown (Personal Target vs Done vs Remaining) */}
            <div className="py-3 grid grid-cols-2 gap-2">
              {CATEGORIES.map(cat => {
                const catTarget = indTargets[cat.key] || 0;
                const catDone = selectedUserDetail.categories[cat.key] || 0;
                const catRem = Math.max(0, catTarget - catDone);
                return (
                  <div key={cat.key} className="p-2.5 rounded-xl bg-surface-800/50 border border-surface-700/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-surface-200/80 flex items-center gap-1">
                        <span>{cat.icon}</span> {cat.label}
                      </span>
                      <span className="text-xs font-black text-white">{catDone}/{catTarget}</span>
                    </div>
                    <p className="text-[9px] text-amber-400 font-semibold text-right">
                      {catRem === 0 ? '✓ Tamamlandı' : `${catRem} kaldı`}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Operations list */}
            <h5 className="text-[11px] font-bold text-surface-200/60 uppercase mb-2">Son Yaptığı İşlemler</h5>
            <div className="overflow-y-auto space-y-1.5 flex-1 pr-1">
              {selectedUserTx.length === 0 ? (
                <p className="text-xs text-surface-200/40 text-center py-4">İşlem kaydı yok</p>
              ) : (
                selectedUserTx.slice(0, 10).map(tx => (
                  <div key={tx.id} className="p-2 rounded-lg bg-surface-850 border border-surface-700/20 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">
                        {CATEGORY_MAP[tx.category]} {tx.subCategory ? `(${tx.subCategory})` : ''}
                      </span>
                      <span className="text-[9px] text-surface-200/40">{getTimeAgo(tx.createdAt)}</span>
                    </div>
                    {tx.description && <p className="text-[10px] text-surface-200/50 mt-0.5">{tx.description}</p>}
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setSelectedUserDetail(null)}
              className="mt-4 w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-xs font-bold text-white transition-all"
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      {/* Live Recent Activity */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <h3 className="text-sm font-bold text-white">Canlı İşlem Akışı</h3>
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Anlık Takip
          </span>
        </div>

        {recentActivity.length === 0 ? (
          <p className="text-xs text-surface-200/40 text-center py-6">
            {readOnly ? 'Henüz işlem kaydedilmedi.' : 'Henüz işlem kaydedilmedi. İlk işlemi sen ekle! 🚀'}
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {recentActivity.map(tx => {
              const cat = CATEGORIES.find(c => c.key === tx.category);
              const isOwn = tx.userName === currentUser;

              return (
                <div
                  key={tx.id}
                  className={`flex items-center gap-2.5 p-2 rounded-xl transition-all ${
                    isOwn ? 'bg-primary-500/10 border border-primary-500/20' : 'bg-surface-800/30'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${USER_COLORS[tx.userName]} flex items-center justify-center text-sm flex-shrink-0`}>
                    {USER_AVATARS[tx.userName]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold ${isOwn ? 'text-primary-300' : 'text-white'}`}>
                        {tx.userName}
                      </span>
                      <span className="text-[9px] text-surface-200/30">•</span>
                      <span className="text-[10px] text-surface-200/70 font-semibold flex items-center gap-1">
                        <span>{cat?.icon}</span> {CATEGORY_MAP[tx.category] || tx.category}
                      </span>
                    </div>

                    {tx.subCategory && (
                      <p className="text-[10px] text-accent-400 font-medium truncate">
                        {tx.subCategory} {tx.description ? `• ${tx.description}` : ''}
                      </p>
                    )}
                    {!tx.subCategory && tx.description && (
                      <p className="text-[10px] text-surface-200/40 truncate">{tx.description}</p>
                    )}
                  </div>

                  <span className="text-[9px] text-surface-200/40 flex-shrink-0">
                    {getTimeAgo(tx.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
