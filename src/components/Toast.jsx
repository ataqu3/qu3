export default function Toast({ message, type = 'success' }) {
  const isSuccess = type === 'success';
  return (
    <div
      className={`toast-enter flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-xl transition-all duration-300 ${
        isSuccess
          ? 'bg-slate-900/95 border-emerald-500/40 text-emerald-300 shadow-emerald-950/40'
          : 'bg-slate-900/95 border-rose-500/40 text-rose-300 shadow-rose-950/40'
      }`}
    >
      <div
        className={`w-7 h-7 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${
          isSuccess ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
        }`}
      >
        {isSuccess ? '✓' : '!'}
      </div>
      <p className="text-xs font-semibold text-slate-100 flex-1 leading-snug">{message}</p>
    </div>
  );
}
