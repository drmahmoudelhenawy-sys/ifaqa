import { OutlineIcon, outlineContent } from '../src/components/OutlineIcon';

import React from 'react';
import { ISLAMIC_OCCASIONS } from '../constants';

const OccasionsPage: React.FC = () => {
    const calculateDays = (date: string) => {
        const diff = new Date(date).getTime() - new Date().getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };
    return (
        <div className="space-y-4 pt-6">
            <h2 className="text-2xl font-bold text-center text-slate-800 dark:text-white mb-6">المناسبات القادمة</h2>
            <p className="text-xs text-center text-slate-400 mb-6">(التواريخ الميلادية تقديرية لعام 2026)</p>
            {ISLAMIC_OCCASIONS.map((occ, i) => (
                <div key={i} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded-full">{outlineContent(occ.icon)}</div>
                        <div><h3 className="font-bold text-slate-800 dark:text-slate-200">{occ.name}</h3><p className="text-xs text-slate-400">{occ.date}</p></div>
                    </div>
                    <div className="text-center"><span className="block text-xl font-black text-violet-600 dark:text-violet-400">{calculateDays(occ.date)}</span><span className="text-[10px] text-slate-400">يوم</span></div>
                </div>
            ))}
        </div>
    );
}

export default OccasionsPage;