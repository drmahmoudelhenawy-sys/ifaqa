import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Folder, FolderPlus, Check, Tag, Palette, Sparkles } from 'lucide-react';

export interface QuranGroup {
  id: string;
  name: string;
  items: string[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  surahNumber: number;
  ayahNumber: number;
  ayahText?: string;
  surahName?: string;
  pageNumber: number;
  selectedColor: string;
  groups: QuranGroup[];
  currentGroupId?: string;
  currentNote?: string;
  onSaveToGroup: (groupId: string, color: string, note?: string) => void;
  onCreateGroup: (name: string) => string;
  onRemoveHighlight?: () => void;
}

const COLOR_OPTIONS = [
  { name: 'yellow', label: 'أصفر', swatch: '#facc15', bg: 'bg-amber-400' },
  { name: 'green', label: 'أخضر', swatch: '#4ade80', bg: 'bg-emerald-400' },
  { name: 'blue', label: 'أزرق', swatch: '#60a5fa', bg: 'bg-sky-400' },
  { name: 'brown', label: 'بني / برتقالي', swatch: '#fb923c', bg: 'bg-orange-400' },
];

export const AyahGroupPickerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  surahNumber,
  ayahNumber,
  ayahText,
  surahName,
  pageNumber,
  selectedColor,
  groups,
  currentGroupId = 'general',
  currentNote = '',
  onSaveToGroup,
  onCreateGroup,
  onRemoveHighlight
}) => {
  const [activeColor, setActiveColor] = useState<string>(selectedColor && selectedColor !== 'transparent' ? selectedColor : 'yellow');
  const [selectedGroupId, setSelectedGroupId] = useState<string>(currentGroupId || 'general');
  const [note, setNote] = useState<string>(currentNote || '');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  if (!isOpen) return null;

  const handleCreateNewGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    const newId = onCreateGroup(newGroupName.trim());
    setSelectedGroupId(newId);
    setNewGroupName('');
    setIsCreatingNew(false);
  };

  const handleConfirm = () => {
    onSaveToGroup(selectedGroupId, activeColor, note.trim());
    onClose();
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md my-auto max-h-[85vh] overflow-y-auto scrollbar-hide rounded-[2.2rem] bg-white p-5 sm:p-6 shadow-2xl dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 animate-in zoom-in-95 duration-200 text-right"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Folder size={20} />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-white">إضافة الآية لمجلد / مجموعة</h3>
              <p className="text-[11px] font-bold text-slate-400">اختر تصنيفاً ولوناً لتسهيل الرجوع للآية</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 transition"
            aria-label="إغلاق"
          >
            <X size={16} />
          </button>
        </div>

        {/* Ayah Snippet Banner */}
        <div className="mb-4 rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-black text-slate-700 dark:text-slate-200">
              سورة {surahName || surahNumber} · آية {ayahNumber}
            </span>
            <span className="text-[10px] font-bold text-slate-400">صفحة {pageNumber}</span>
          </div>
          {ayahText && (
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed opacity-90 font-quran">
              {ayahText}
            </p>
          )}
        </div>

        {/* Color Picker Row */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Palette size={14} className="text-slate-400" />
              <span>لون التظليل</span>
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              {COLOR_OPTIONS.find(c => c.name === activeColor)?.label}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setActiveColor(c.name)}
                className={`flex items-center justify-center gap-2 rounded-xl py-2 px-2 border transition-all active:scale-95 ${
                  activeColor === c.name 
                    ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900 shadow-md' 
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300'
                }`}
              >
                <span className={`w-3.5 h-3.5 rounded-full border border-white/40 shadow-sm`} style={{ backgroundColor: c.swatch }} />
                <span className="text-xs font-black">{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Groups Selection */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Tag size={14} className="text-slate-400" />
              <span>المجلد أو التصنيف</span>
            </span>
            {!isCreatingNew && (
              <button
                type="button"
                onClick={() => setIsCreatingNew(true)}
                className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <FolderPlus size={13} />
                <span>+ مجلد جديد</span>
              </button>
            )}
          </div>

          {/* New Group Form */}
          {isCreatingNew && (
            <form onSubmit={handleCreateNewGroup} className="mb-2.5 flex items-center gap-2 animate-in slide-in-from-top duration-200">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="اسم المجلد الجديد (مثل: أدعية الرزق)..."
                autoFocus
                className="flex-1 rounded-xl border border-emerald-500/40 bg-white px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 dark:bg-slate-800 dark:text-white"
              />
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700 active:scale-95 transition"
              >
                إضافة
              </button>
              <button
                type="button"
                onClick={() => { setIsCreatingNew(false); setNewGroupName(''); }}
                className="rounded-xl bg-slate-100 dark:bg-slate-800 px-2.5 py-2 text-xs font-bold text-slate-500"
              >
                إلغاء
              </button>
            </form>
          )}

          {/* Group Chips Grid */}
          <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1">
            {groups.map((group) => {
              const isSelected = selectedGroupId === group.id;
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setSelectedGroupId(group.id)}
                  className={`flex items-center justify-between rounded-xl border p-2.5 text-right transition-all active:scale-95 ${
                    isSelected 
                      ? 'border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200 shadow-sm' 
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Folder size={14} className={isSelected ? 'text-amber-600' : 'text-slate-400'} />
                    <span className="text-xs font-black truncate">{group.name}</span>
                  </div>
                  {isSelected && <Check size={14} className="text-amber-600 stroke-[3] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Note input */}
        <div className="mb-5">
          <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
            ملاحظة أو تدبر (اختياري)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="اكتب خاطرة أو تأملاً أو سبب حفظ الآية..."
            rows={2}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold outline-none focus:border-amber-500 focus:bg-white dark:border-slate-800 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800 resize-none transition"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-3 text-xs font-black text-white shadow-lg shadow-amber-500/25 transition hover:brightness-105 active:scale-95"
          >
            <Sparkles size={15} />
            <span>حفظ الآية في المجلد</span>
          </button>

          {onRemoveHighlight && (
            <button
              type="button"
              onClick={() => {
                onRemoveHighlight();
                onClose();
              }}
              className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 px-3 py-3 text-xs font-black text-rose-600 hover:bg-rose-100 transition active:scale-95"
              title="إلغاء التظليل"
            >
              إلغاء
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
