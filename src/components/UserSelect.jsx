import { USERS, USER_AVATARS, USER_COLORS } from '../constants';

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
      </div>

      {/* Footer */}
      <p className="mt-10 text-[10px] text-surface-200/30">
        © 2026 B&B Bilişim
      </p>
    </div>
  );
}
