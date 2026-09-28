import { useState } from 'react';
import { addTransaction, deleteTransaction } from '../db';
import { CATEGORIES, MOBIL_SUB_CATEGORIES, DSL_SPEEDS, CATEGORY_MAP } from '../constants';

export default function AddTransaction({ currentUser, month, addToast }) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [subCategory, setSubCategory] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastAddedId, setLastAddedId] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleVibrate = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([20, 40, 20]);
    }
  };

  const handleSubmit = () => {
    if (!selectedCategory) {
      addToast('Lütfen bir kategori seçin!', 'error');
      return;
    }

    if (selectedCategory === 'Mobil' && !subCategory) {
      addToast('Lütfen Mobil işlem türünü seçin (Yeni Hat, Numara Taşıma, Sponsor)', 'error');
      return;
    }

    if (selectedCategory === 'DSL' && !subCategory) {
      addToast('Lütfen DSL internet hızını seçin', 'error');
      return;
    }

    setIsSubmitting(true);
    handleVibrate();

    // Add transactions based on quantity
    let lastId = null;
    for (let i = 0; i < quantity; i++) {
      const tx = addTransaction({
        userName: currentUser,
        category: selectedCategory,
        subCategory: subCategory || null,
        description: description.trim() || null,
        month: month,
      });
      lastId = tx.id;
    }

    setLastAddedId(lastId);
    setShowSuccess(true);

    const catName = CATEGORY_MAP[selectedCategory] || selectedCategory;
    const qtyText = quantity > 1 ? `${quantity} adet ` : '';
    addToast(`${qtyText}${catName} (${subCategory || 'İşlem'}) başarıyla hedefe işlendi! 🎉`, 'success');

    setTimeout(() => {
      setShowSuccess(false);
      setSelectedCategory(null);
      setSubCategory('');
      setDescription('');
      setQuantity(1);
      setIsSubmitting(false);
    }, 1800);
  };

  const handleUndo = () => {
    if (lastAddedId) {
      deleteTransaction(lastAddedId);
      setLastAddedId(null);
      setShowSuccess(false);
      setIsSubmitting(false);
      addToast('Eklenen işlem geri alındı! ↩️', 'success');
    }
  };

  const resetForm = () => {
    setSelectedCategory(null);
    setSubCategory('');
    setDescription('');
    setQuantity(1);
  };

  if (showSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-16 animate-slide-up text-center glass-card p-6 border-emerald-500/30">
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-4xl mb-4 crown-animate">
          🎉
        </div>
        <h2 className="text-xl font-black text-white mb-1">Harika İş Çıkardın!</h2>
        <p className="text-xs text-emerald-400 font-bold mb-1">
          {quantity}x {CATEGORY_MAP[selectedCategory]} {subCategory ? `• ${subCategory}` : ''}
        </p>
        <p className="text-xs text-surface-200/60 mb-5">
          {currentUser}, işlem anlık olarak hedeften düşüldü! 🎯
        </p>

        <button
          onClick={handleUndo}
          className="px-4 py-2 rounded-xl bg-surface-800 text-rose-400 border border-rose-500/30 text-xs font-bold hover:bg-rose-500/10 active:scale-95 transition-all"
        >
          ↩️ Yanlış mı girdin? Hemen Geri Al
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 stagger-children">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-lg font-black text-white">Yeni İşlem Kaydı</h2>
        <p className="text-xs text-surface-200/50">Yaptığın işlemi seç ve kaydet, anında hedeften düşsün</p>
      </div>

      {/* 1. Category Selection */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-bold text-surface-200/80 uppercase tracking-wider">
            1. Kategori Seçimi
          </label>
          <span className="text-[10px] text-primary-300 font-semibold">Zorunlu</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map(cat => {
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.key);
                  setSubCategory('');
                }}
                className={`p-3 rounded-2xl flex flex-col items-center gap-1.5 transition-all duration-200 active:scale-95 ${
                  isSelected
                    ? `bg-gradient-to-br ${cat.color} text-white shadow-lg shadow-primary-500/30 scale-[1.02] ring-2 ring-white/30`
                    : 'bg-surface-800/60 hover:bg-surface-800 text-surface-200/70 border border-surface-700/30'
                }`}
              >
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-xs font-bold text-center leading-tight">
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Sub-category for Mobil */}
      {selectedCategory === 'Mobil' && (
        <div className="glass-card p-4 animate-slide-up border-blue-500/30">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>📱</span> Mobil İşlem Türü
            </label>
            <span className="text-[10px] text-blue-400 font-semibold">Seçim Yapın</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {MOBIL_SUB_CATEGORIES.map(sub => {
              const isSelected = subCategory === sub;
              return (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setSubCategory(sub)}
                  className={`p-3 rounded-xl text-center font-bold text-xs transition-all active:scale-95 ${
                    isSelected
                      ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-md shadow-blue-500/30 ring-2 ring-white/30'
                      : 'bg-surface-800/60 text-surface-200/70 hover:bg-surface-800 border border-surface-700/30'
                  }`}
                >
                  {sub}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Sub-category for DSL */}
      {selectedCategory === 'DSL' && (
        <div className="glass-card p-4 animate-slide-up border-emerald-500/30">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>🌐</span> DSL İnternet Hızı (Mbps)
            </label>
            <span className="text-[10px] text-emerald-400 font-semibold">Hız Seçin</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {DSL_SPEEDS.map(speed => {
              const speedLabel = `${speed} Mbps`;
              const isSelected = subCategory === speedLabel;
              return (
                <button
                  key={speed}
                  type="button"
                  onClick={() => setSubCategory(speedLabel)}
                  className={`p-2.5 rounded-xl text-center font-bold text-xs transition-all active:scale-95 ${
                    isSelected
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/30 ring-2 ring-white/30'
                      : 'bg-surface-800/60 text-surface-200/70 hover:bg-surface-800 border border-surface-700/30'
                  }`}
                >
                  {speed}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Quantity Stepper */}
      <div className="glass-card p-4 flex items-center justify-between">
        <div>
          <label className="text-xs font-bold text-surface-200/80 uppercase block">
            İşlem Adedi
          </label>
          <p className="text-[10px] text-surface-200/40">Kaç adet işlem yaptın?</p>
        </div>
        <div className="flex items-center gap-3 bg-surface-800/60 border border-surface-700/40 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="w-8 h-8 rounded-lg bg-surface-700/50 hover:bg-surface-700 text-white font-bold flex items-center justify-center active:scale-90 transition-all"
          >
            -
          </button>
          <span className="w-8 text-center text-sm font-black text-white">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity(quantity + 1)}
            className="w-8 h-8 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-bold flex items-center justify-center active:scale-90 transition-all"
          >
            +
          </button>
        </div>
      </div>

      {/* 5. Description Note */}
      <div className="glass-card p-4">
        <label className="text-xs font-bold text-surface-200/80 uppercase tracking-wider mb-2 block">
          Açıklama / Müşteri Notu (Opsiyonel)
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Müşteri adı, sözleşme veya not..."
          className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-surface-200/30 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/30 transition-all"
        />
      </div>

      {/* 6. Summary & Submit Buttons */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || !selectedCategory}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary-500 via-indigo-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white text-base font-black shadow-xl shadow-primary-500/25 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <span>⏳ Hedefe İşleniyor...</span>
          ) : (
            <>
              <span>⚡</span>
              <span>
                {selectedCategory
                  ? `${quantity > 1 ? `${quantity}x ` : ''}${CATEGORY_MAP[selectedCategory]} İşlemini Kaydet`
                  : 'İşlemi Kaydet'}
              </span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={resetForm}
          className="w-full py-2.5 rounded-xl bg-surface-800/40 text-xs font-bold text-surface-200/50 hover:text-white transition-all"
        >
          Formu Sıfırla
        </button>
      </div>
    </div>
  );
}
