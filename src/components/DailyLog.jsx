import { useEffect, useState } from 'react';
import TransactionHistory from './TransactionHistory';
import {
  getDayTransactions,
  getDayTotals,
  getDailyBreakdown,
  getCategoryTotals,
  getTargets,
  hasTargets,
} from '../db';
import {
  CATEGORIES,
  CATEGORY_MAP,
  USER_AVATARS,
  USER_COLORS,
  formatMonth,
  formatDay,
  getCurrentDay,
  getCurrentMonth,
  getDayLabel,
  getDaysInMonth,
  shiftDay,
  getTimeAgo,
} from '../constants';

// Günlük giriş sayfası: her gün temiz bir sayfa açılır, ay içindeki tüm işlemler toplu olarak da görülebilir
export default function DailyLog({ currentUser, month, addToast, readOnly = false }) {
  const [mode, setMode] = useState('daily'); // 'daily' | 'month'
  const [today, setToday] = useState(getCurrentDay());
  const [selectedDay, setSelectedDay] = useState(getCurrentDay());

  // Gece yarısını geçince "bugün" otomatik olarak yeni güne geçer (her gün yeni temiz sayfa)
  useEffect(() => {
    const timer = setInterval(() => {
      const nowToday = getCurrentDay();
      if (nowToday !== today) {
        setToday(nowToday);
        if (selectedDay === today) setSelectedDay(nowToday);
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [today, selectedDay]);

  // Görüntülenen ay değişince seçili gün o aya taşınır (bu ayda bugün, geçmiş ayda son işlem günü)
  useEffect(() => {
    if (selectedDay.startsWith(month)) return;

    const breakdown = getDailyBreakdown(month);
    const lastWithData = [...breakdown].reverse().find(item => item.count > 0);
    setSelectedDay(month === getCurrentMonth() ? getCurrentDay() : (lastWithData?.dayKey || `${month}-01`));
  }, [month, selectedDay]);

  const dayTransactions = getDayTransactions(selectedDay);
  const dayTotals = getDayTotals(selectedDay);
  const monthBreakdown = getDailyBreakdown(month);
  const monthCategoryTotals = getCategoryTotals(month);
  const monthTotal = CATEGORIES.reduce((sum, cat) => sum + (monthCategoryTotals[cat.key] || 0), 0);
  const targets = getTargets(month);
  const targetsReady = hasTargets(month);
  const maxDayCount = Math.max(1, ...monthBreakdown.map(item => item.count));

  const isToday = selectedDay === today;
  const firstDayKey = `${month}-01`;
  const lastDayKey = `${month}-${String(getDaysInMonth(month)).padStart(2, '0')}`;
  const maxDayKey = month === getCurrentMonth() ? today : lastDayKey;

  return (
    <div className="space-y-4 stagger-children">
      {/* Görünüm seçici: Günlük sayfa / Tüm ay */}
      <div className="grid grid-cols-2 gap-1.5 bg-surface-850/80 p-1 rounded-2xl border border-surface-700/40">
        <button
          type="button"
          onClick={() => setMode('daily')}
          className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            mode === 'daily'
              ? 'bg-gradient-to-r from-primary-500 to-indigo-500 text-white shadow-md shadow-primary-500/25 ring-1 ring-white/20'
              : 'text-surface-200/60 hover:text-white'
          }`}
        >
          <span>📅</span>
          <span>Günlük Sayfa</span>
        </button>

        <button
          type="button"
          onClick={() => setMode('month')}
          className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            mode === 'month'
              ? 'bg-gradient-to-r from-primary-500 to-indigo-500 text-white shadow-md shadow-primary-500/25 ring-1 ring-white/20'
              : 'text-surface-200/60 hover:text-white'
          }`}
        >
          <span>📋</span>
          <span>Tüm Ay ({monthTotal})</span>
        </button>
      </div>

      {mode === 'month' ? (
        <TransactionHistory currentUser={currentUser} month={month} addToast={addToast} />
      ) : (
        <>
          {/* Seçili gün başlığı ve gün gezinme */}
          <div className="glass-card p-4 border-primary-500/20">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setSelectedDay(shiftDay(selectedDay, -1))}
                disabled={selectedDay <= firstDayKey}
                className="w-9 h-9 rounded-xl bg-surface-800/70 border border-surface-700/40 text-white font-bold flex items-center justify-center active:scale-90 transition-all disabled:opacity-30"
              >
                ◀
              </button>

              <div className="text-center flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary-300">
                  {isToday ? '✨ Bugünün Sayfası' : getDayLabel(selectedDay)}
                </p>
                <h2 className="text-sm font-black text-white leading-tight truncate">{formatDay(selectedDay)}</h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDay(shiftDay(selectedDay, 1))}
                disabled={selectedDay >= maxDayKey}
                className="w-9 h-9 rounded-xl bg-surface-800/70 border border-surface-700/40 text-white font-bold flex items-center justify-center active:scale-90 transition-all disabled:opacity-30"
              >
                ▶
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 mt-3 p-3 rounded-xl bg-surface-800/50 border border-surface-700/30">
              <div>
                <p className="text-[10px] text-surface-200/50 font-bold uppercase tracking-wide">Bu Gün Girilen</p>
                <p className="text-2xl font-black text-white">
                  {dayTotals.total}
                  <span className="text-[11px] text-surface-200/40 font-bold ml-1">işlem</span>
                </p>
              </div>

              <div className="flex flex-wrap justify-end gap-1 max-w-[62%]">
                {CATEGORIES.filter(cat => dayTotals.categories[cat.key] > 0).map(cat => (
                  <span
                    key={cat.key}
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg bg-surface-900/70 border border-surface-700/40 text-surface-200/80 flex items-center gap-1"
                  >
                    <span>{cat.icon}</span>
                    {dayTotals.categories[cat.key]}
                  </span>
                ))}
                {dayTotals.total === 0 && (
                  <span className="text-[10px] text-surface-200/40 font-semibold">Gün henüz boş 🧼</span>
                )}
              </div>
            </div>

            {!isToday && (
              <button
                type="button"
                onClick={() => setSelectedDay(today)}
                className="mt-2 w-full py-2 rounded-xl bg-surface-800/60 border border-surface-700/40 text-[11px] font-bold text-surface-200/70 hover:text-white transition-all"
              >
                ⏭️ Bugünün sayfasına dön
              </button>
            )}
          </div>

          {/* O günün işlemleri */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🗒️</span>
                <h3 className="text-sm font-bold text-white">
                  {isToday ? 'Bugün Yapılan İşlemler' : 'Seçili Günün İşlemleri'}
                </h3>
              </div>
              <span className="text-[10px] text-surface-200/40 font-semibold">{dayTransactions.length} kayıt</span>
            </div>

            {dayTransactions.length === 0 ? (
              <div className="text-center py-6">
                <span className="text-3xl block mb-1">🧼</span>
                <p className="text-xs font-bold text-white mb-0.5">Bu gün için kayıt yok</p>
                {readOnly ? (
                  <p className="text-[10px] text-surface-200/45">
                    📊 Yönetim hesabı salt-okunurdur — kayıtlar çalışanlar tarafından girilir.
                  </p>
                ) : (
                  <p className="text-[10px] text-surface-200/45">
                    Alttaki <b className="text-primary-300">+ (Ekle)</b> butonuyla ilk işlemi girebilirsin.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {dayTransactions.map(tx => {
                  const cat = CATEGORIES.find(c => c.key === tx.category);
                  const isOwn = tx.userName === currentUser;

                  return (
                    <div
                      key={tx.id}
                      className={`flex items-center gap-2.5 p-2 rounded-xl ${
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
                            <span>{cat?.icon}</span>
                            {CATEGORY_MAP[tx.category] || tx.category}
                          </span>
                        </div>

                        {(tx.subCategory || tx.description) && (
                          <p className="text-[10px] text-accent-400 font-medium truncate">
                            {tx.subCategory}
                            {tx.subCategory && tx.description ? ' • ' : ''}
                            {tx.description}
                          </p>
                        )}
                      </div>

                      <span className="text-[9px] text-surface-200/40 flex-shrink-0">{getTimeAgo(tx.createdAt)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Toplu ay özeti (ay içindeki tüm işlemler) */}
          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">📊</span>
                <div>
                  <h3 className="text-sm font-bold text-white">{formatMonth(month)} Toplu Özeti</h3>
                  <p className="text-[10px] text-surface-200/50">Ayın tamamı ve günlük dağılım</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-white leading-none">{monthTotal}</p>
                <p className="text-[9px] text-surface-200/40 font-semibold">toplam işlem</p>
              </div>
            </div>

            {!targetsReady && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <p className="text-[11px] font-bold text-amber-300">🎯 {formatMonth(month)} hedefleri henüz girilmedi</p>
                <p className="text-[10px] text-surface-200/70 mt-0.5">
                  Hedefler genelde ayın 6-7'sinde girilir. Girilmiş <b className="text-white">{monthTotal}</b> işlem,
                  hedefler kaydedildiği an otomatik olarak hedeften düşecek.
                </p>
              </div>
            )}

            {/* Kategori bazlı ay özeti */}
            <div className="space-y-1.5">
              {CATEGORIES.map(cat => {
                const done = monthCategoryTotals[cat.key] || 0;
                const target = targets[cat.key] || 0;
                const percent = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0;

                return (
                  <div key={cat.key} className="flex items-center gap-2">
                    <span className="w-20 text-[10px] font-bold text-surface-200/70 flex items-center gap-1 min-w-0">
                      <span>{cat.icon}</span>
                      <span className="truncate">{cat.label}</span>
                    </span>
                    <div className="flex-1 h-2 bg-surface-800/80 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${cat.color} transition-all duration-700`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="w-14 text-right text-[10px] font-black text-white">
                      {done}
                      {target > 0 && <span className="text-surface-200/40 font-semibold"> / {target}</span>}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Günlük dağılım grafiği */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-surface-200/60 uppercase tracking-wider">Günlük Dağılım</span>
                <span className="text-[9px] text-surface-200/40">Güne dokunarak aç</span>
              </div>

              <div className="flex items-end gap-0.5 h-16">
                {monthBreakdown.map(item => {
                  const height = item.count === 0 ? 4 : Math.max(8, Math.round((item.count / maxDayCount) * 52));
                  const isSelected = item.dayKey === selectedDay;
                  const isDayToday = item.dayKey === today;

                  return (
                    <button
                      key={item.dayKey}
                      type="button"
                      onClick={() => setSelectedDay(item.dayKey)}
                      title={`${item.day} ${formatMonth(month)} • ${item.count} işlem`}
                      className="flex-1 flex flex-col justify-end items-center group"
                    >
                      <span
                        className={`w-full rounded-t-sm transition-all ${
                          isSelected
                            ? 'bg-amber-400'
                            : item.count > 0
                              ? 'bg-primary-500 group-hover:bg-primary-400'
                              : 'bg-surface-700/60'
                        } ${isDayToday ? 'ring-1 ring-white/40' : ''}`}
                        style={{ height: `${height}px` }}
                      />
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between mt-1 text-[9px] text-surface-200/40 font-semibold">
                <span>1</span>
                <span>5</span>
                <span>10</span>
                <span>15</span>
                <span>20</span>
                <span>25</span>
                <span>{monthBreakdown.length}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
