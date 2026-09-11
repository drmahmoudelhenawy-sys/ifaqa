
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Quote } from 'lucide-react';
import { db } from '../services/firebase';
import { APP_ID } from '../constants';
import { ContentItem } from '../types';

const DynamicContent: React.FC = () => {
    const [items, setItems] = useState<ContentItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'dynamic_content'), where('active', '==', true));
        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map(d => ({id: d.id, ...d.data()} as ContentItem));
            setItems(list);
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        if (items.length <= 1) return;
        const currentItem = items[currentIndex];
        const duration = (currentItem?.duration || 10) * 1000;
        
        const timer = setTimeout(() => {
            setCurrentIndex(prev => (prev + 1) % items.length);
        }, duration);

        return () => clearTimeout(timer);
    }, [items, currentIndex]);

    if (items.length === 0) return null;

    const item = items[currentIndex];

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden mx-1 animate-in fade-in transition-all duration-500">
            <div className="absolute top-0 right-0 p-3 opacity-10"><Quote size={40} className="text-slate-900 dark:text-white"/></div>
            <div className="relative z-10">
                <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-2 py-0.5 rounded-full mb-2 inline-block">
                    {item.type === 'hadith' ? 'حديث شريف' : item.type === 'zekr' ? 'ذكر' : 'حكمة'}
                </span>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-relaxed min-h-[3rem]">
                    {item.text}
                </p>
                {(item.source || item.explanation) && (
                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 flex flex-col gap-1">
                        {item.source && <span className="text-[10px] text-slate-400">{item.source}</span>}
                        {item.explanation && <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">{item.explanation}</p>}
                    </div>
                )}
            </div>
            {/* Progress Bar for Duration */}
            <div key={currentIndex} className="absolute bottom-0 left-0 h-1 bg-violet-500/20 w-full">
                <div 
                    className="h-full bg-violet-500 transition-all ease-linear" 
                    style={{ 
                        width: '100%', 
                        animationName: 'shrinkWidth', 
                        animationDuration: `${item.duration || 10}s`,
                        animationTimingFunction: 'linear',
                        animationFillMode: 'forwards'
                    }} 
                />
            </div>
            <style>{`
                @keyframes shrinkWidth {
                    from { width: 100%; }
                    to { width: 0%; }
                }
            `}</style>
        </div>
    );
};

export default DynamicContent;
