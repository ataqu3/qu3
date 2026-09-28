import { useState, useEffect, useCallback } from 'react';
import { USERS, USER_AVATARS, USER_COLORS, getCurrentMonth } from './constants';
import UserSelect from './components/UserSelect';
import Dashboard from './components/Dashboard';
import AddTransaction from './components/AddTransaction';
import TransactionHistory from './components/TransactionHistory';
import CategoryLeaders from './components/CategoryLeaders';
import AdminPanel from './components/AdminPanel';
import BottomNav from './components/BottomNav';
import Toast from './components/Toast';
import { useDBListener, getSyncStatus } from './db';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    return localStorage.getItem('bvb_current_user') || null;
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentMonth] = useState(getCurrentMonth());
  const [toasts, setToasts] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [syncStatus, setSyncStatus] = useState(getSyncStatus());
  const [showSwitchUser, setShowSwitchUser] = useState(false);

  // Listen for DB changes to refresh UI
  useEffect(() => {
    const cleanup = useDBListener(() => {
      setRefreshKey(prev => prev + 1);
    });
    return cleanup;
  }, []);

  // Listen for cloud sync events
  useEffect(() => {
    const handleSyncChange = (e) => setSyncStatus(e.detail);
    window.addEventListener('sync-status-change', handleSyncChange);
    return () => window.removeEventListener('sync-status-change', handleSyncChange);
  }, []);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3200);
  }, []);

  const handleUserSelect = (user) => {
    setCurrentUser(user);
    localStorage.setItem('bvb_current_user', user);
    setShowSwitchUser(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('bvb_current_user');
    setActiveTab('dashboard');
    setShowSwitchUser(false);
  };

  if (!currentUser) {
    return <UserSelect onSelect={handleUserSelect} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard key={refreshKey} currentUser={currentUser} month={currentMonth} />;
      case 'add':
        return <AddTransaction currentUser={currentUser} month={currentMonth} addToast={addToast} />;
      case 'history':
        return <TransactionHistory key={refreshKey} currentUser={currentUser} month={currentMonth} addToast={addToast} />;
      case 'leaders':
        return <CategoryLeaders key={refreshKey} month={currentMonth} />;
      case 'admin':
        return <AdminPanel key={refreshKey} month={currentMonth} addToast={addToast} />;
      default:
        return <Dashboard key={refreshKey} currentUser={currentUser} month={currentMonth} />;
    }
  };

  return (
    <div className="min-h-screen pb-24 text-slate-100 selection:bg-primary-500 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 glass-card border-t-0 border-x-0 rounded-none px-4 py-3 shadow-lg shadow-black/20">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          {/* Logo & Company */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 via-indigo-500 to-accent-500 flex items-center justify-center text-white text-xs font-black shadow-md shadow-primary-500/30">
              B&B
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-black gradient-text tracking-tight">B&B Bilişim</h1>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="Sistem Canlı ve Hazır" />
              </div>
              <p className="text-[10px] text-surface-200/50 font-semibold">Hedef Takip Sistemi</p>
            </div>
          </div>

          {/* User Button */}
          <button
            type="button"
            onClick={() => setShowSwitchUser(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-800/80 border border-surface-700/60 text-xs font-bold text-white hover:border-primary-500/50 active:scale-95 transition-all shadow-sm"
          >
            <span className="text-base">{USER_AVATARS[currentUser]}</span>
            <span>{currentUser}</span>
            <span className="text-[9px] text-surface-200/40">▼</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-lg mx-auto px-4 py-4 animate-fade-in">
        {renderContent()}
      </main>

      {/* Switch User Modal */}
      {showSwitchUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-card w-full max-w-xs p-5 border border-primary-500/30 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Kullanıcı Değiştir</h3>
              <button
                type="button"
                onClick={() => setShowSwitchUser(false)}
                className="w-7 h-7 rounded-full bg-surface-800 text-surface-200/60 hover:text-white flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {USERS.map(user => {
                const isCurrent = user === currentUser;
                return (
                  <button
                    key={user}
                    type="button"
                    onClick={() => handleUserSelect(user)}
                    className={`p-3 rounded-xl flex flex-col items-center gap-1.5 border transition-all ${
                      isCurrent
                        ? 'bg-primary-500/20 border-primary-500 text-primary-300 font-bold'
                        : 'bg-surface-800/60 border-surface-700/40 text-surface-200/70 hover:bg-surface-800'
                    }`}
                  >
                    <span className="text-2xl">{USER_AVATARS[user]}</span>
                    <span className="text-xs">{user}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-2.5 rounded-xl bg-surface-800 text-rose-400 hover:bg-rose-500/10 border border-surface-700 text-xs font-bold transition-all"
            >
              Çıkış Yap
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Toast Notifications */}
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-[92%] max-w-sm pointer-events-none">
        {toasts.map(toast => (
          <Toast key={toast.id} message={toast.message} type={toast.type} />
        ))}
      </div>
    </div>
  );
}
