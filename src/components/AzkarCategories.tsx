import React from 'react';
import { Sun, Moon, Bed, Bookmark } from 'lucide-react';

interface Props {
  categories: string[];
  onSelectCategory: (category: string) => void;
}

const colorMap: Record<string, string> = {
  'أذكار الصباح': 'bg-orange-500 hover:bg-orange-600',
  'أذكار المساء': 'bg-blue-600 hover:bg-blue-700',
  'أذكار النوم': 'bg-indigo-600 hover:bg-indigo-700',
  'أذكار منوعة': 'bg-emerald-600 hover:bg-emerald-700'
};

const iconMap: Record<string, React.ReactNode> = {
  'أذكار الصباح': <Sun size={36} />,
  'أذكار المساء': <Moon size={36} />,
  'أذكار النوم': <Bed size={36} />,
  'أذكار منوعة': <Bookmark size={36} />
};

export const AzkarCategories: React.FC<Props> = ({ categories, onSelectCategory }) => {
  return (
    <div className="grid gap-6 p-6 md:grid-cols-2">
      {categories.map(cat => (
        <button
          key={cat}
          onClick={() => onSelectCategory(cat)}
          className={`flex items-center gap-6 p-8 text-white rounded-3xl transition-transform shadow-xl hover:-translate-y-1 ${colorMap[cat] || 'bg-slate-600 hover:bg-slate-700'}`}
        >
          {iconMap[cat] || <Sun size={36} />}
          <span className="text-3xl font-bold font-arabic">{cat}</span>
        </button>
      ))}
    </div>
  );
};
