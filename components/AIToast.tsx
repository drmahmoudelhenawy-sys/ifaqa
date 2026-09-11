

import React, { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';

interface AIToastProps {
  message: string;
  onClose: () => void;
}

const AIToast: React.FC<AIToastProps> = ({ message, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Small delay for entry animation
    const timer = setTimeout(() => setVisible(true), 10);
    // Auto close after 6 seconds
    const closeTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 500); // Wait for exit animation
    }, 6000);

    return () => {
      clearTimeout(timer);
      clearTimeout(closeTimer);
    };
  }, [onClose]);

  return (
    <div className={`fixed top-24 left-4 right-4 z-50 transition-all duration-500 transform ${visible ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0'}`}>
      <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-violet-200 dark:border-violet-800 p-4 rounded-2xl shadow-xl flex gap-4 items-start max-w-md mx-auto">
        <div className="bg-gradient-to-br from-violet-500 to-fuchsia-600 p-2 rounded-xl text-white shadow-lg shrink-0 animate-pulse">
          <Sparkles size={20} fill="currentColor" />
        </div>
        <div className="flex-1">
           <h4 className="font-bold text-sm text-violet-700 dark:text-violet-300 mb-1">رفيقك الإيماني</h4>
           <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
             {message}
           </p>
        </div>
        <button onClick={() => { setVisible(false); setTimeout(onClose, 300); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default AIToast;