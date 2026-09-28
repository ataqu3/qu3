import { useState } from 'react';
import { getCategoryLeaders, getSubCategoryLeaders } from '../db';
import { USER_AVATARS, USER_COLORS, formatMonth } from '../constants';

// Tek bir çalışanın "avatar + isim + işlem sayısı" rozeti
function UserChip({ userName, count, tone = 'default' }) {
  const toneClasses = {
    top: 'bg-amber-500/15 border-amber-500/30',
    bottom: 'bg-surface-800/60 border-surface-700/40',
    default: 'bg-surface-800/50 border-surface-700/30',
  }[tone];

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg border ${toneClasses}`}>
      <span className={`w-5 h-5 rounded-full bg-gradient-to-br ${USER_COLORS[userName]} flex items-center justify-center text-[10px] flex-shrink-0`}>
        {USER_AVATARS[userName]}
      </span>
      <span className="text-[10px] font-bold text-white">{userName}</span>
      <span className="text-[10px] font-black text-primary-300">{count}</span>
    </span>
  );
}

// "En Çok Yapan" / "En Az Yapan" satırı
function RankingRow({ icon, title, titleClass, containerClass, data, tone }) {
  return (
    <div className={`flex items-start gap-2 p-2 rounded-xl border ${containerClass}`}>
      <span className="text-base leading-none mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-[9px] font-bold uppercase tracking-wider ${titleClass}`}>{title}</p>
        <div className="flex flex-wrap items-center gap-1 mt-1">
          {data.users.map(userName => (
            <UserChip key={userName} userName={userName} count={data.count} tone={tone} />
          ))}
        </div>
        {data.count === 0 && (
          <p className="text-[9px] text-rose-300/80 mt-1">Bu alanda hiç işlem girmemiş 👀</p>
        )}
      </div>
    </div>
  );
}

// 4 çalışanın kişi bazlı dağılım çubukları
function DistributionBars({ counts, total, topCount }) {
  return (
    <div className="space-y-1 pt-0.5">
      {counts.map(({ userName, count }) => {
        const percent = total > 0 ? Math.round((count / total) * 100) : 0;
        const isTop = count === topCount && count > 0;

        return (
          <div key={userName} className="flex items-center gap-2">
            <span className="w-16 text-[10px] font-semibold text-surface-200/70 flex items-center gap-1 min-w-0">
              <span>{USER_AVATARS[userName]}</span>
              <span className="truncate">{userName}</span>
            </span>
            <div className="flex-1 h-1.5 bg-surface-800/80 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${isTop ? 'from-amber-400 to-amber-500' : USER_COLORS[userName]} transition-all duration-700`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="w-5 text-right text-[10px] font-black text-white">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function CategoryLeaders({ month }) {
  const [showSubTypes, setShowSubTypes] = useState(false);

  const categoryLeaders = getCategoryLeaders(month);
  const subCategoryLeaders = getSubCategoryLeaders(month);

  const totalTransactions = categoryLeaders.reduce((sum, item) => sum + item.total, 0);
  const activeCategories = categoryLeaders.filter(item => item.total > 0).length;

  return (
    <div className="space-y-4 stagger-children">
      {/* Başlık & Özet */}
      <div className="glass-card p-4 border-amber-500/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-1.5">
              <span>🏆</span> Kategori Şampiyonları
            </h2>
            <p className="text-[11px] text-surface-200/60 font-medium">
              {formatMonth(month)} • Her kategoride en çok ve en az yapanlar
            </p>
          </div>
          <span className="text-2xl crown-animate">🥇</span>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="p-2.5 rounded-xl bg-surface-800/50 border border-surface-700/30">
            <p className="text-[9px] text-surface-200/50 font-bold uppercase tracking-wide">Toplam İşlem</p>
            <p className="text-lg font-black text-white">{totalTransactions}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-surface-800/50 border border-surface-700/30">
            <p className="text-[9px] text-surface-200/50 font-bold uppercase tracking-wide">Aktif Kategori</p>
            <p className="text-lg font-black text-white">
              {activeCategories}
              <span className="text-xs text-surface-200/40 font-bold"> / {categoryLeaders.length}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5 text-[10px] text-surface-200/50 font-semibold">
          <span>🥇 En Çok Yapan</span>
          <span>🐢 En Az Yapan</span>
          <span>📊 Kişi Dağılımı</span>
        </div>
      </div>

      {/* Kategori kartları */}
      <div className="space-y-2.5">
        {categoryLeaders.map(cat => (
          <div key={cat.category} className="glass-card p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-lg shadow-md shadow-black/20`}>
                  {cat.icon}
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">{cat.label}</h4>
                  <p className="text-[10px] text-surface-200/50 font-semibold">
                    Toplam <b className="text-white">{cat.total}</b> işlem
                  </p>
                </div>
              </div>
              {cat.total > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-500/15 text-primary-300 border border-primary-500/30">
                  En yüksek: {cat.top.count}
                </span>
              )}
            </div>

            {cat.total === 0 ? (
              <p className="text-[10px] text-surface-200/40 text-center py-3 rounded-xl bg-surface-800/30 border border-surface-700/20">
                Bu kategoride bu ay henüz işlem yapılmadı 🕳️
              </p>
            ) : (
              <>
                <RankingRow
                  icon="🥇"
                  title="En Çok Yapan"
                  titleClass="text-amber-300"
                  containerClass="bg-gradient-to-r from-amber-500/15 to-transparent border-amber-500/25"
                  data={cat.top}
                  tone="top"
                />
                <RankingRow
                  icon="🐢"
                  title="En Az Yapan"
                  titleClass="text-surface-200/50"
                  containerClass="bg-surface-800/40 border-surface-700/30"
                  data={cat.bottom}
                  tone="bottom"
                />
                <DistributionBars counts={cat.counts} total={cat.total} topCount={cat.top.count} />
              </>
            )}
          </div>
        ))}
      </div>

      {/* İşlem türü sıralaması (Mobil türleri & DSL hızları) */}
      <div className="glass-card p-4">
        <button
          type="button"
          onClick={() => setShowSubTypes(prev => !prev)}
          className="w-full flex items-center justify-between gap-2 text-left"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🔍</span>
            <div>
              <h3 className="text-sm font-bold text-white">İşlem Türü Sıralaması</h3>
              <p className="text-[10px] text-surface-200/50">
                Mobil türleri ve DSL hızlarında en çok / en az yapanlar
              </p>
            </div>
          </div>
          <span className="flex-shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg bg-surface-800 border border-surface-700 text-surface-200/70">
            {showSubTypes ? 'Gizle ▲' : 'Göster ▼'}
          </span>
        </button>

        {showSubTypes && (
          <div className="mt-3 space-y-2 animate-slide-up">
            {subCategoryLeaders.map(item => (
              <div
                key={`${item.category}-${item.value}`}
                className="p-2.5 rounded-xl bg-surface-800/40 border border-surface-700/30 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                    <span>{item.icon}</span>
                    <span className="text-surface-200/50 font-semibold">{item.category}</span>
                    <span className="text-surface-200/30">•</span>
                    <span>{item.value}</span>
                  </span>
                  <span className={`text-[10px] font-black ${item.total > 0 ? 'text-primary-300' : 'text-surface-200/30'}`}>
                    {item.total} işlem
                  </span>
                </div>

                {item.total === 0 ? (
                  <p className="text-[9px] text-surface-200/35">Bu ay hiç kullanılmadı</p>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-amber-300 mr-0.5">🥇 En Çok</span>
                      {item.top.users.map(userName => (
                        <UserChip key={`top-${userName}`} userName={userName} count={item.top.count} tone="top" />
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-surface-200/45 mr-0.5">🐢 En Az</span>
                      {item.bottom.users.map(userName => (
                        <UserChip key={`bottom-${userName}`} userName={userName} count={item.bottom.count} tone="bottom" />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

