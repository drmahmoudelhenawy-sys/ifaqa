import React, { useState } from 'react';
import {
  Book,
  Radio,
  Compass,
  LayoutGrid,
  ChevronLeft,
  CalendarDays,
  Headphones,
  Search,
  DownloadCloud,
  Layers,
  Flame,
  X,
  Sparkles,
  Zap,
  Trophy,
} from 'lucide-react';
import { haptic } from '../services/haptics';

interface ToolsPageProps {
  onOpenTool: (toolId: string) => void;
}

interface ToolItem {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tone: string;
  locked?: boolean;
}

const ToolsPage: React.FC<ToolsPageProps> = ({ onOpenTool }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const tools: ToolItem[] = [
    {
      id: 'hadith',
      name: 'الأحاديث النبوية',
      description: 'تصفح صحيح البخاري، مسلم، والسنن مع ميزة البحث الفوري والحفظ والتخريج.',
      icon: Book,
      tone: 'from-emerald-500 to-teal-600',
    },
    {
      id: 'calendar',
      name: 'التقويم والمناسبات',
      description: 'تاريخ هجري وميلادي حي مع مواعيد المناسبات الإسلامية، الأيام البيض، والعد التنازلي.',
      icon: CalendarDays,
      tone: 'from-fuchsia-500 to-purple-600',
    },
    {
      id: 'radio',
      name: 'إذاعة القرآن الكريم',
      description: 'إذاعات كبار القراء، البث المباشر للحرمين الشريفين، وإذاعة القرآن الكريم من القاهرة.',
      icon: Radio,
      tone: 'from-blue-500 to-cyan-600',
    },
    {
      id: 'qibla',
      name: 'اتجاه القبلة',
      description: 'بوصلة رقمية دقيقة لحساب اتجاه الكعبة المشرفة من موقعك الحالي بدقة المستشعرات.',
      icon: Compass,
      tone: 'from-amber-500 to-orange-600',
    },
    {
      id: 'masbaha',
      name: 'المسبحة والعداد الذكي',
      description: 'تسبيح وذكر مع استجابة اهتزازية ملموسة، أذكار مأثورة، وحفظ سجل التسبيحات.',
      icon: Flame,
      tone: 'from-teal-600 to-emerald-700',
    },
    {
      id: 'downloads',
      name: 'مركز التنزيلات أوفلاين',
      description: 'إدارة تفاسير القرآن، تلاوات المشايخ، وكتب الحديث الشريف للعمل بدون اتصال إنترنت.',
      icon: DownloadCloud,
      tone: 'from-sky-500 to-indigo-600',
    },
  ];

  const filteredTools = tools.filter((tool) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return tool.name.toLowerCase().includes(q) || tool.description.toLowerCase().includes(q);
  });

  const handleToolClick = (tool: ToolItem) => {
    if (tool.locked) {
      void haptic('warning');
      return;
    }
    void haptic('selection');
    onOpenTool(tool.id);
  };

  return (
    <div className="pt-2 pb-24 space-y-5 max-w-3xl mx-auto px-2 sm:px-4 animate-in fade-in duration-300 select-none">
      {/* Header */}
      <div className="text-right space-y-1.5 px-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200/60 dark:border-violet-800/40">
          <LayoutGrid size={13} className="text-violet-600 dark:text-violet-400" />
          <span className="text-[11px] font-black tracking-wide">مكتبة الأدوات الشاملة</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">أدوات إفاقة</h1>
        <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
          أدوات روحية وعملية جاهزة للعبادة والمعرفة والتنقل اليومي.
        </p>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
          <Search size={18} />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث في الأدوات..."
          className="w-full pl-10 pr-11 py-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-bold placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all shadow-xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Unified Tools List */}
      <div className="grid grid-cols-1 gap-3.5">
        {filteredTools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              disabled={tool.locked}
              onClick={() => handleToolClick(tool)}
              className={`group w-full bg-white dark:bg-slate-900 px-4 py-4 sm:px-5 sm:py-4.5 rounded-[2rem] border border-slate-200/80 dark:border-slate-800 shadow-xs transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] flex items-center gap-3.5 sm:gap-4 text-right ${
                tool.locked
                  ? 'opacity-55 cursor-not-allowed'
                  : 'cursor-pointer hover:border-violet-300 dark:hover:border-violet-500/40'
              }`}
            >
              {/* Tool Icon Box */}
              <div
                className={`w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-br ${tool.tone} flex items-center justify-center text-white shadow-md flex-shrink-0 group-hover:scale-105 transition-transform`}
              >
                <Icon size={24} />
              </div>

              {/* Tool Content (Title + Description) */}
              <div className="flex-1 min-w-0 space-y-1">
                <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white leading-snug">
                  {tool.name}
                </h3>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                  {tool.description}
                </p>
              </div>

              {/* Navigation Chevron Arrow */}
              <div className="flex-shrink-0 pl-1">
                <ChevronLeft
                  size={20}
                  className="text-slate-300 dark:text-slate-600 group-hover:text-violet-600 dark:group-hover:text-violet-400 group-hover:-translate-x-1 transition-all"
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ToolsPage;
