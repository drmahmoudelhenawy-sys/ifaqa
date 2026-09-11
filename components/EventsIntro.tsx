
import React, { useEffect, useState } from 'react';
import { MAWAN_LOGO_WHITE } from '../constants';
import { ChevronLeft } from 'lucide-react';

interface EventsIntroProps {
  onFinish: () => void;
}

const EventsIntro: React.FC<EventsIntroProps> = ({ onFinish }) => {
  const [phase, setPhase] = useState(0); // 0: initial, 1: logo, 2: text, 3: fade out

  useEffect(() => {
    const timer1 = setTimeout(() => setPhase(1), 50);
    const timer2 = setTimeout(() => setPhase(2), 250);
    const timer3 = setTimeout(() => setPhase(3), 850);
    const timer4 = setTimeout(onFinish, 1150); // Total duration ~1.1s (was 2.8s)

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [onFinish]);

  const getContainerPhaseClasses = () => {
    if (phase === 3) return 'opacity-0';
    return 'opacity-100';
  };

  const getElementPhaseClasses = () => {
    if (phase === 3) return 'opacity-0 scale-105';
    if (phase >= 1) return 'opacity-100 scale-100';
    return 'opacity-0 scale-90';
  };

  return (
    <div 
      onClick={onFinish}
      className={`fixed inset-0 bg-slate-950 z-[100] flex flex-col items-center justify-center cursor-pointer transition-opacity duration-300 ${getContainerPhaseClasses()}`}
    >
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full bg-[url('/assets/patterns/cubes.png')] opacity-5" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-600 rounded-full blur-[120px] opacity-30 animate-pulse-slow" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-600 rounded-full blur-[120px] opacity-30 animate-pulse-slow" />

      {/* Skip button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onFinish();
        }}
        className="absolute top-[max(env(safe-area-inset-top,0px),1.25rem)] left-5 z-20 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-bold text-slate-200 backdrop-blur-md border border-white/15 transition flex items-center gap-1 shadow-lg"
      >
        <span>تخطي</span>
        <ChevronLeft size={14} className="rtl:rotate-180" />
      </button>

      <div className={`transition-all duration-400 ease-out transform ${getElementPhaseClasses()}`}>
        <img src={MAWAN_LOGO_WHITE} alt="Mawan Logo" className="w-40 h-40 object-contain drop-shadow-2xl mb-4 mx-auto" />
        <h2 
          className={`text-4xl font-black text-white text-center drop-shadow-lg transition-all duration-400 ease-out delay-100 ${phase >= 2 ? 'opacity-100' : 'opacity-0 -translate-y-3'}`}
        >
          فعاليات معوان
        </h2>
      </div>
    </div>
  );
};

export default EventsIntro;
