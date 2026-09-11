
import React, { useState } from 'react';
import { Heart, AlertCircle, ArrowLeft, Zap, Moon, CheckCircle } from 'lucide-react';
import { LOGO_COLORED } from '../constants';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { auth } from '../services/firebase';

interface OnboardingFlowProps {
  onFinish: () => void;
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onFinish }) => {
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<'lite' | 'full'>('full');

  const finishOnboarding = async () => {
      // Save preference if user is already created (AuthScreen comes after usually, but if flow is reversed/mixed)
      if (auth.currentUser) {
          await updateDoc(doc(db, 'artifacts', 'ifaqa-app-production-release', 'users', auth.currentUser.uid, 'stats', 'profile'), {
              appMode: mode
          });
      } else {
          // Store locally to apply after auth
          localStorage.setItem('temp_app_mode', mode);
      }
      onFinish();
  };

  // Step 0: Welcome & Mode Selection
  if (step === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700">
        <div className="mb-8">
             <img src={LOGO_COLORED} alt="Logo" className="w-40 h-40 object-contain drop-shadow-xl mx-auto mb-4" />
             <h2 className="text-4xl font-black text-slate-800 dark:text-white mb-2">أهلاً بك في إفاقة</h2>
             <p className="text-slate-500 dark:text-slate-400">اختر نمط الاستخدام المفضل لديك</p>
        </div>

        <div className="grid gap-4 w-full max-w-md mb-8">
            {/* Full Mode Card */}
            <button 
                onClick={() => setMode('full')}
                className={`relative p-6 rounded-3xl border-2 text-right transition-all duration-300 group overflow-hidden ${mode === 'full' ? 'border-violet-500 bg-white dark:bg-slate-800 shadow-xl shadow-violet-500/10 scale-[1.02]' : 'border-transparent bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800'}`}
            >
                <div className="flex justify-between items-start mb-2">
                    <div className="bg-violet-100 dark:bg-violet-900/30 p-3 rounded-2xl text-violet-600 dark:text-violet-400">
                        <Zap size={24} fill="currentColor" />
                    </div>
                    {mode === 'full' && <div className="bg-violet-500 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1"><CheckCircle size={10}/> موصى به</div>}
                </div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white mb-1">النمط الكامل</h3>
                <p className="text-xs text-slate-500 leading-relaxed">تحديات يومية، نقاط XP، مستويات، لوحة متصدرين، ومنافسة في الخير.</p>
            </button>

            {/* Lite Mode Card */}
            <button 
                onClick={() => setMode('lite')}
                className={`relative p-6 rounded-3xl border-2 text-right transition-all duration-300 group overflow-hidden ${mode === 'lite' ? 'border-emerald-500 bg-white dark:bg-slate-800 shadow-xl shadow-emerald-500/10 scale-[1.02]' : 'border-transparent bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800'}`}
            >
                <div className="flex justify-between items-start mb-2">
                    <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-2xl text-emerald-600 dark:text-emerald-400">
                        <Moon size={24} fill="currentColor" />
                    </div>
                    {mode === 'lite' && <div className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1"><CheckCircle size={10}/> تم الاختيار</div>}
                </div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white mb-1">النمط الهادئ</h3>
                <p className="text-xs text-slate-500 leading-relaxed">تركيز خالص على العبادة بدون أي مشتتات، أرقام، أو منافسة.</p>
            </button>
        </div>

        <button onClick={() => setStep(1)} className="w-full max-w-md bg-slate-900 dark:bg-white dark:text-slate-900 text-white py-4 rounded-2xl font-bold text-lg hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
            حفظ والمتابعة <ArrowLeft size={20} className="rtl:rotate-180"/>
        </button>
      </div>
    );
  }

  // Step 1: Sadqa
  if (step === 1) {
    return (
        <div className="min-h-screen bg-emerald-900 text-white p-8 flex flex-col items-center justify-center text-center animate-in slide-in-from-right duration-500">
          <div className="bg-emerald-800/50 p-6 rounded-full mb-8">
             <Heart size={80} className="text-emerald-400 animate-pulse-slow" fill="currentColor" />
          </div>
          <h2 className="text-4xl font-black mb-6">صدقة جارية</h2>
          <p className="text-emerald-100 text-xl leading-loose mb-12 max-w-sm">
            هذا التطبيق وقف لله تعالى عن أموات المسلمين والأحياء. نسأل الله أن يتقبله خالصاً لوجهه الكريم.
          </p>
          <button onClick={() => setStep(2)} className="bg-white text-emerald-900 w-full max-w-sm py-4 rounded-2xl font-bold text-lg hover:bg-emerald-50 transition shadow-xl">تقبل الله</button>
        </div>
      );
  }

  // Step 2: Commitment
  if (step === 2) {
      return (
        <div className="min-h-screen bg-slate-900 text-white p-8 flex flex-col items-center justify-center text-center animate-in slide-in-from-right duration-500">
          <div className="bg-orange-500/20 p-8 rounded-full mb-8 border border-orange-500/30"><AlertCircle size={80} className="text-orange-500" /></div>
          <h2 className="text-4xl font-black mb-6 text-orange-400">أنت رقيب نفسك</h2>
          <p className="text-slate-300 text-xl leading-loose mb-12 max-w-sm">
            "ألم يعلم بأن الله يرى". <br/> الغش لن يفيدك في الآخرة.
          </p>
          <button onClick={finishOnboarding} className="bg-gradient-to-r from-orange-500 to-red-500 text-white w-full max-w-sm py-4 rounded-2xl font-bold text-lg hover:shadow-orange-500/40 shadow-xl transition">عاهدت نفسي</button>
        </div>
      );
  }

  return null;
};

export default OnboardingFlow;
