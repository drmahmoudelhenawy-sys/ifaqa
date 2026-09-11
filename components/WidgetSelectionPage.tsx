import React from 'react';
import { registerPlugin } from '@capacitor/core';
import { User } from 'firebase/auth';
import { ArrowRight, Sparkles } from 'lucide-react';
import AzkarWidgetPreview from './AzkarWidgetPreview';
import CounterWidgetPreview from './CounterWidgetPreview';
import PrayerWidgetPreview from './PrayerWidgetPreview';
import RadioWidgetPreview from './RadioWidgetPreview';
import SalatWidgetPreview from './SalatWidgetPreview';
import SupportModal from './SupportModal';
import TrackerWidgetPreview from './TrackerWidgetPreview';
import WirdWidgetPreview from './WirdWidgetPreview';

const WidgetPlugin = registerPlugin<any>('WidgetPlugin');

interface WidgetSelectionPageProps {
  user: User;
  onBack: () => void;
}

type WidgetCardProps = {
  children: React.ReactNode;
  buttonColor: string;
  buttonText: string;
  buttonTextColor?: string;
};

const WidgetSelectionPage: React.FC<WidgetSelectionPageProps> = ({ user, onBack }) => {
  const [showSuggestionsModal, setShowSuggestionsModal] = React.useState(false);

  const installWidget = async () => {
    try {
      await WidgetPlugin.pinWidget({ widgetType: 'PrayerWidget' });
    } catch (error) {
      console.log('Pin widget not supported on this platform/device yet', error);
      alert('سيتم توفير هذه الميزة قريبًا على جهازك.');
    }
  };

  const WidgetCard: React.FC<WidgetCardProps> = ({
    children,
    buttonColor,
    buttonText,
    buttonTextColor = 'text-white',
  }) => (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="flex w-full items-center justify-center overflow-hidden rounded-[32px] bg-slate-100/70 p-2 shadow-xl dark:bg-slate-900/50">
        {children}
      </div>
      <button
        onClick={installWidget}
        className={`w-full rounded-full px-3 py-2.5 text-center text-xs font-black transition-all shadow-lg hover:shadow-xl active:scale-95 ${buttonColor} ${buttonTextColor}`}
      >
        {buttonText}
      </button>
    </div>
  );

  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-50 animate-in fade-in duration-500 dark:bg-slate-950">
      {showSuggestionsModal ? <SupportModal user={user} onClose={() => setShowSuggestionsModal(false)} /> : null}

      <div className="safe-top sticky top-0 z-50 border-b border-slate-200 bg-white/80 p-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="rounded-full p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800">
            <ArrowRight size={24} className="text-slate-600 dark:text-slate-400" />
          </button>
          <h2 className="text-xl font-black text-slate-800 dark:text-white">متجر الويدجتات</h2>
          <div className="w-10" />
        </div>
      </div>

      <div className="flex-1 space-y-16 overflow-y-auto p-4 pb-32 sm:p-6 lg:p-10">
        <div className="space-y-6">
          <h3 className="inline-block border-b-2 border-emerald-500 pb-1 text-lg font-black text-slate-800 dark:text-white">
            أوقات الصلاة والإذاعة
          </h3>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <WidgetCard buttonText="الصلاة (داكن)" buttonColor="bg-[#064e3b]">
              <PrayerWidgetPreview mode="emerald" />
            </WidgetCard>
            <WidgetCard buttonText="الصلاة (فاتح)" buttonColor="bg-white border-2 border-slate-200" buttonTextColor="text-slate-800">
              <PrayerWidgetPreview mode="white" />
            </WidgetCard>
            <WidgetCard buttonText="الإذاعة (داكن)" buttonColor="bg-[#064e3b]">
              <RadioWidgetPreview mode="emerald" />
            </WidgetCard>
            <WidgetCard buttonText="الإذاعة (فاتح)" buttonColor="bg-white border-2 border-slate-200" buttonTextColor="text-slate-800">
              <RadioWidgetPreview mode="white" />
            </WidgetCard>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="inline-block border-b-2 border-indigo-500 pb-1 text-lg font-black text-slate-800 dark:text-white">
            الورد القرآني
          </h3>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <WidgetCard buttonText="الورد (داكن)" buttonColor="bg-[#312e81]">
              <WirdWidgetPreview mode="indigo" />
            </WidgetCard>
            <WidgetCard buttonText="الورد (فاتح)" buttonColor="bg-white border-2 border-slate-200" buttonTextColor="text-slate-800">
              <WirdWidgetPreview mode="white" />
            </WidgetCard>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="inline-block border-b-2 border-amber-500 pb-1 text-lg font-black text-slate-800 dark:text-white">
            الأذكار والصلوات
          </h3>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <WidgetCard buttonText="الأذكار (داكن)" buttonColor="bg-[#78350f]">
              <AzkarWidgetPreview mode="amber" />
            </WidgetCard>
            <WidgetCard buttonText="الأذكار (فاتح)" buttonColor="bg-white border-2 border-slate-200" buttonTextColor="text-slate-800">
              <AzkarWidgetPreview mode="white" />
            </WidgetCard>
            <WidgetCard buttonText="الصلاة على النبي (داكن)" buttonColor="bg-[#0f172a]">
              <SalatWidgetPreview mode="slate" />
            </WidgetCard>
            <WidgetCard buttonText="الصلاة على النبي (فاتح)" buttonColor="bg-white border-2 border-slate-200" buttonTextColor="text-slate-800">
              <SalatWidgetPreview mode="white" />
            </WidgetCard>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="inline-block border-b-2 border-teal-500 pb-1 text-lg font-black text-slate-800 dark:text-white">
            المسبحة وتتبع الصلوات
          </h3>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <WidgetCard buttonText="المسبحة (داكن)" buttonColor="bg-[#064e3b]">
              <CounterWidgetPreview mode="emerald" />
            </WidgetCard>
            <WidgetCard buttonText="المسبحة (فاتح)" buttonColor="bg-white border-2 border-slate-200" buttonTextColor="text-slate-800">
              <CounterWidgetPreview mode="white" />
            </WidgetCard>
            <WidgetCard buttonText="تتبع الصلوات (داكن)" buttonColor="bg-[#064e3b]">
              <TrackerWidgetPreview mode="emerald" />
            </WidgetCard>
            <WidgetCard buttonText="تتبع الصلوات (فاتح)" buttonColor="bg-white border-2 border-slate-200" buttonTextColor="text-slate-800">
              <TrackerWidgetPreview mode="white" />
            </WidgetCard>
          </div>
        </div>

        <div className="mt-10 space-y-4 rounded-[32px] bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-center shadow-2xl">
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
            <Sparkles className="text-emerald-400" size={32} />
          </div>
          <h2 className="text-xl font-black text-white">للاقتراحات أو طلب ويدجت</h2>
          <p className="mx-auto max-w-sm text-xs leading-relaxed text-slate-400">
            اكتب اقتراحك أو اطلب ويدجت جديد، وستصل الرسالة مباشرة إلى لوحة التحكم لمراجعته والرد عليك.
          </p>
          <button
            onClick={() => setShowSuggestionsModal(true)}
            className="rounded-xl bg-emerald-500 px-8 py-3 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400"
          >
            ارسل اقتراحك
          </button>
        </div>
      </div>
    </div>
  );
};

export default WidgetSelectionPage;
