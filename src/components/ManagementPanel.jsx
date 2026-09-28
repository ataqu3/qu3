import {
  getTargets,
  getIndividualTargets,
  getCategoryTotals,
  getLeaderboard,
  getTransactions,
  getDailyBreakdown,
  hasTargets,
} from '../db';
import {
  CATEGORIES,
  CATEGORY_MAP,
  USER_AVATARS,
  USER_COLORS,
  formatMonth,
  getCurrentDay,
  getCurrentMonth,
  getDaysInMonth,
  getTimeAgo,
} from '../constants';

// Yönetim raporu: salt-okunur. İşlem girme / düzenleme / silme yok — sadece net istatistikler.
export default function ManagementPanel({ month }) {
  const teamTargets = getTargets(month);
  const individualTargets = getIndividualTargets(month);
  const teamTotals = getCategoryTotals(month);
  const leaderboard = getLeaderboard(month);
  const transactions = getTransactions(month);
  const breakdown = getDailyBreakdown(month);
  const targetsReady = hasTargets(month);

  const totalTarget = Object.values(teamTargets).reduce((sum, value) => sum + (value || 0), 0);
  const personalTarget = Object.values(individualTargets).reduce((sum, value) => sum + (value || 0), 0);
  const totalDone = CATEGORIES.reduce((sum, cat) => sum + (teamTotals[cat.key] || 0), 0);
  const totalRemaining = Math.max(0, totalTarget - totalDone);
  const overallPercent = totalTarget > 0 ? Math.min(100, Math.round((totalDone / totalTarget) * 100)) : 0;

  // Kalan gün ve günlük gereken tempo (sadece içinde bulunulan ay için hesaplanır)
  const isCurrentMonth = month === getCurrentMonth();
  const todayDate = Number(getCurrentDay().slice(8, 10));
  const remainingDays = isCurrentMonth ? Math.max(1, getDaysInMonth(month) - todayDate + 1) : 0;
  const dailyPace = remainingDays > 0 ? Math.ceil(totalRemaining / remainingDays) : 0;

  const activeDays = breakdown.filter(day => day.count > 0).length;
  const bestDay = breakdown.reduce((best, day) => (day.count > best.count ? day : best), { day: 0, count: 0 });

  const categoryRows = CATEGORIES.map(cat => {
    const target = teamTargets[cat.key] || 0;
    const done = teamTotals[cat.key] || 0;
    const remaining = Math.max(0, target - done);
    const percent = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0;
    const perDay = remainingDays > 0 ? Math.ceil(remaining / remainingDays) : remaining;

    return { ...cat, target, done, remaining, percent, perDay };
  });

  const userRows = leaderboard.map(user => {
    const remaining = Math.max(0, personalTarget - user.totalCount);
    const percent = personalTarget > 0 ? Math.min(100, Math.round((user.totalCount / personalTarget) * 100)) : 0;
    const lastTx = transactions
      .filter(tx => tx.userName === user.userName)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

    return { ...user, target: personalTarget, remaining, percent, lastTx };
  });

  const missingTotal = categoryRows.reduce((sum, cat) => sum + cat.remaining, 0);
  const bestCategory = [...categoryRows].sort((a, b) => b.percent - a.percent)[0];
  const weakestCategory = [...categoryRows].filter(cat => cat.target > 0).sort((a, b) => b.remaining - a.remaining)[0];
  const weakestUser = [...userRows].sort((a, b) => b.remaining - a.remaining)[0];

  return (
    <div className="space-y-4 stagger-children">
      {/* Başlık ve genel durum */}
      <div className="glass-card p-4 border-slate-500/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-1.5">
              <span>📊</span> Yönetim Raporu
            </h2>
            <p className="text-[11px] text-surface-200/60 font-medium">
              {formatMonth(month)} • Salt-okunur istatistik paneli
            </p>
          </div>
          <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-slate-500/25 text-slate-200 border border-slate-400/30">
            SALT-OKUNUR
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="p-3 rounded-xl bg-surface-800/50 border border-surface-700/30">
            <p className="text-[9px] text-surface-200/50 font-bold uppercase tracking-wide">Hedef</p>
            <p className="text-xl font-black text-white">{targetsReady ? totalTarget : '—'}</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
            <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-wide">Yapılan</p>
            <p className="text-xl font-black text-emerald-300">{totalDone}</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25">
            <p className="text-[9px] text-amber-400 font-bold uppercase tracking-wide">Kalan</p>
            <p className="text-xl font-black text-amber-300">{targetsReady ? totalRemaining : '—'}</p>
          </div>
          <div className="p-3 rounded-xl bg-primary-500/10 border border-primary-500/25">
            <p className="text-[9px] text-primary-300 font-bold uppercase tracking-wide">Tamamlanma</p>
            <p className="text-xl font-black text-primary-300">%{targetsReady ? overallPercent : 0}</p>
          </div>
        </div>

        {targetsReady ? (
          <div className="mt-3 space-y-1.5">
            <div className="h-3 bg-surface-800/80 rounded-full overflow-hidden p-0.5 border border-primary-500/20">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary-500 via-indigo-500 to-emerald-400 transition-all duration-1000"
                style={{ width: `${overallPercent}%` }}
              />
            </div>
            <p className="text-[10px] text-surface-200/60 text-center font-semibold">
              {isCurrentMonth ? (
                <>
                  📅 Kalan <b className="text-white">{remainingDays}</b> gün • hedefe yetişmek için günde ortalama{' '}
                  <b className="text-white">{dailyPace}</b> işlem gerekiyor
                </>
              ) : totalRemaining === 0 ? (
                <>🎉 {formatMonth(month)} hedefinin tamamı tutturuldu</>
              ) : (
                <>🗓️ {formatMonth(month)} tamamlandı • <b className="text-amber-300">{totalRemaining}</b> işlem eksik kaldı</>
              )}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-[10px] text-amber-300 font-semibold text-center">
            🎯 {formatMonth(month)} hedefleri henüz girilmedi — girilmiş {totalDone} işlem hedefler kaydedilince otomatik düşecek
          </p>
        )}
      </div>

      {/* Eksikler ve öncelik özeti */}
      {targetsReady && (
        <div className="glass-card p-4 space-y-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <span>🎯</span> Ne Kadar Eksiğiz?
          </h3>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between p-2 rounded-xl bg-surface-800/40 border border-surface-700/30">
              <span className="text-surface-200/60 font-semibold">Toplam eksik işlem</span>
              <span className="font-black text-white">{missingTotal}</span>
            </div>

            {weakestCategory && (
              <div className="flex items-center justify-between p-2 rounded-xl bg-rose-500/10 border border-rose-500/25">
                <span className="text-rose-300 font-semibold">En çok eksik kalan kategori</span>
                <span className="font-black text-white">
                  {weakestCategory.icon} {weakestCategory.label} • {weakestCategory.remaining} eksik
                </span>
              </div>
            )}

            {weakestUser && (
              <div className="flex items-center justify-between p-2 rounded-xl bg-amber-500/10 border border-amber-500/25">
                <span className="text-amber-300 font-semibold">En çok geride kalan çalışan</span>
                <span className="font-black text-white">
                  {USER_AVATARS[weakestUser.userName]} {weakestUser.userName} • {weakestUser.remaining} eksik (%{weakestUser.percent})
                </span>
              </div>
            )}

            {bestCategory && (
              <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                <span className="text-emerald-300 font-semibold">En iyi giden kategori</span>
                <span className="font-black text-white">
                  {bestCategory.icon} {bestCategory.label} • %{bestCategory.percent}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between p-2 rounded-xl bg-surface-800/40 border border-surface-700/30">
              <span className="text-surface-200/60 font-semibold">İşlem girilen gün / en verimli gün</span>
              <span className="font-black text-white">
                {activeDays} gün • en iyi {bestDay.count} işlem
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Kategori bazlı durum */}
      <div className="glass-card p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <span>📦</span> Kategori Bazlı Durum
          </h3>
          <span className="text-[10px] text-surface-200/40 font-semibold">yapılan / hedef • kalan</span>
        </div>

        {categoryRows.map(cat => (
          <div key={cat.key} className="p-3 rounded-xl bg-surface-800/40 border border-surface-700/30">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <span className="text-base">{cat.icon}</span>
                {cat.label}
              </span>
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-lg ${
                cat.target === 0
                  ? 'bg-surface-700/60 text-surface-200/60'
                  : cat.percent >= 100
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : cat.percent >= 70
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-rose-500/20 text-rose-300'
              }`}>
                {cat.target === 0 ? 'hedef yok' : `%${cat.percent}`}
              </span>
            </div>

            <div className="h-2 bg-surface-800 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${cat.color} transition-all duration-700`}
                style={{ width: `${cat.percent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-semibold">
              <span className="text-surface-200/60">
                Yapılan: <b className="text-white">{cat.done}</b>
                {cat.target > 0 && <> / {cat.target}</>}
              </span>
              <span className={cat.remaining > 0 ? 'text-amber-300 font-black' : 'text-emerald-300 font-black'}>
                {cat.target === 0
                  ? '—'
                  : cat.remaining > 0
                    ? `${cat.remaining} kaldı${cat.perDay > 0 ? ` • günde ${cat.perDay}` : ''}`
                    : 'tamamlandı ✓'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Kim ne yapmış */}
      <div className="glass-card p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <span>👥</span> Kim Ne Yapmış?
          </h3>
          <span className="text-[10px] text-surface-200/40 font-semibold">kişi başı hedef: {personalTarget}</span>
        </div>

        {userRows.map(user => (
          <div key={user.userName} className="p-3 rounded-xl bg-surface-800/40 border border-surface-700/30 space-y-2">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${USER_COLORS[user.userName]} flex items-center justify-center text-base flex-shrink-0`}>
                {USER_AVATARS[user.userName]}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-black text-white">{user.userName}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    user.target > 0 && user.remaining === 0
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : user.percent >= 70
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {user.target > 0 && user.remaining === 0 ? '✅ Hedefi tamamladı' : user.percent >= 70 ? '🔥 İyi gidiyor' : '⚠️ Geride'}
                  </span>
                </div>
                <p className="text-[10px] text-surface-200/45 mt-0.5">
                  {user.lastTx ? `Son işlem: ${getTimeAgo(user.lastTx.createdAt)}` : 'Bu ay hiç işlem girmedi'}
                </p>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="text-base font-black text-white leading-none">{user.totalCount}</p>
                <p className="text-[9px] text-surface-200/45 font-semibold">yaptığı</p>
              </div>
            </div>

            <div className="h-1.5 bg-surface-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${USER_COLORS[user.userName]} transition-all duration-700`}
                style={{ width: `${user.percent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-semibold">
              <span className="text-surface-200/60">
                Hedefi: <b className="text-white">{user.target}</b>
                {!targetsReady && <span className="text-surface-200/35"> (hedef girilmedi)</span>}
              </span>
              <span className={user.remaining > 0 ? 'text-amber-300 font-black' : 'text-emerald-300 font-black'}>
                {user.remaining > 0 ? `${user.remaining} eksik • %${user.percent}` : '%100 tamam 🎉'}
              </span>
            </div>

            <div className="flex flex-wrap gap-1">
              {CATEGORIES.map(cat => {
                const count = user.categories[cat.key] || 0;
                return (
                  <span
                    key={cat.key}
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-lg border ${
                      count > 0
                        ? 'bg-surface-900/60 border-surface-600/50 text-surface-200/90'
                        : 'bg-surface-900/30 border-surface-700/30 text-surface-200/35'
                    }`}
                  >
                    {cat.icon} {CATEGORY_MAP[cat.key]} {count}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bilgi notu */}
      <p className="text-[10px] text-surface-200/35 text-center px-4 pb-2">
        Bu panel salt-okunurdur: işlem ekleme, düzenleme veya silme yapılamaz. Ayrıntılı kategori sıralamaları için
        <b className="text-surface-200/60"> Liderler</b>, gün gün akış için <b className="text-surface-200/60">Günlük</b> sekmesini kullanabilirsiniz.
      </p>
    </div>
  );
}
