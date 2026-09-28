import { USERS, MANAGEMENT_USER, USER_AVATARS, USER_COLORS } from '../constants';

export default function UserSelect({ onSelect }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10">
      {/* Logo & Title */}
      <div className="text-center mb-10 animate-slide-up">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/30">
          <span className="text-3xl font-black text-white">B&B</span>
        </div>
        <h1 className="text-3xl font-black gradient-text mb-2">B&B Bilişim</h1>
        <p className="text-surface-200/60 text-sm">Aylık Hedef Takip Sistemi</p>
      </div>

      {/* User Selection */}
      <div className="w-full max-w-sm">
        <p className="text-center text-sm text-surface-200/80 mb-4 font-medium">
          Hoş geldiniz! Lütfen kendinizi seçin
        </p>
        <div className="grid grid-cols-2 gap-3 stagger-children">
          {USERS.map(user => (
            <button
              key={user}
              onClick={() => onSelect(user)}
              className="glass-card glass-card-hover p-5 flex flex-col items-center gap-3 group active:scale-95 transition-transform"
            >
              <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${USER_COLORS[user]} flex items-center justify-center text-2xl shadow-lg group-hover:shadow-xl transition-shadow`}>
                {USER_AVATARS[user]}
              </div>
              <span className="font-semibold text-sm text-white group-hover:text-primary-300 transition-colors">
                {user}
              </span>
            </button>
          ))}
        </div>

        {/* Yönetim hesabı: işlem giremez, tüm istatistikleri salt-okunur görür */}
        <button
          onClick={() => onSelect(MANAGEMENT_USER)}
          className="glass-card glass-card-hover w-full mt-3 p-4 flex items-center gap-3.5 group active:scale-[0.98] transition-all border-slate-500/40"
        >
          <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${USER_COLORS[MANAGEMENT_USER]} flex items-center justify-center text-2xl shadow-lg flex-shrink-0`}>
            {USER_AVATARS[MANAGEMENT_USER]}
          </div>
          <div className="text-left flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-white group-hover:text-primary-300 transition-colors">
                {MANAGEMENT_USER}
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-500/25 text-slate-200 border border-slate-400/30">
                SALT-OKUNUR
              </span>
            </div>
            <p className="text-[10px] text-surface-200/50 mt-0.5">
              📊 Tüm istatistikler & raporlar • işlem giremez, kayıt silip değiştiremez
            </p>
          </div>
          <span className="text-surface-200/30 text-xs flex-shrink-0">▶</span>
        </button>
      </div>

      {/* Footer */}
      <p className="mt-10 text-[10px] text-surface-200/30">
        © 2026 B&B Bilişim
      </p>
    </div>
  );
}
