import { formatMonth } from '../constants';

// Sayfalar arasında ortak kullanılan ay seçici (geçmiş aylara bakmak için)
export default function MonthSelector({ month, months, currentMonth, onChange }) {
  return (
    <div className="glass-card p-2.5">
      <div className="flex items-center justify-between mb-2 px-0.5">
        <span className="text-[10px] font-bold text-surface-200/60 uppercase tracking-wider">
          Görüntülenen Ay
        </span>
        <span className="text-[10px] text-surface-200/40 font-semibold">
          {months.length} ay kayıtlı
        </span>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {months.map(item => {
          const isSelected = item.month === month;
          const isCurrent = item.month === currentMonth;

          return (
            <button
              key={item.month}
              type="button"
              onClick={() => onChange(item.month)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                  : isCurrent
                    ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                    : 'bg-surface-800/60 text-surface-200/60 hover:bg-surface-800'
              }`}
            >
              <span>{formatMonth(item.month)}</span>
              {isCurrent && <span className="text-[9px] opacity-80">• Bu Ay</span>}
              {item.hasTargets && <span title="Hedefleri girilmiş">🎯</span>}
              <span className={`text-[9px] px-1 rounded font-black ${
                isSelected ? 'bg-white/20 text-white' : 'bg-surface-700/60 text-surface-200/70'
              }`}>
                {item.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
