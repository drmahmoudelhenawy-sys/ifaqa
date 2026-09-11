import { OutlineIcon, outlineContent } from '../src/components/OutlineIcon';
import React from 'react';
import { Zap, Target, Star, HelpCircle, Users, Clock, Award, Sparkles, Trophy } from 'lucide-react';

const EventChallengesPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Info */}
      <div className="text-center space-y-2 py-4">
        <div className="bg-gradient-to-br from-violet-600 via-indigo-600 to-fuchsia-600 p-4 rounded-[2rem] text-white shadow-xl shadow-violet-500/20 inline-flex mx-auto mb-1">
          <Zap size={32} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white drop-shadow-sm">دليل فعاليات ومسابقات معوان</h2>
        <p className="text-slate-400 dark:text-slate-400 text-xs font-bold max-w-xs mx-auto leading-relaxed">كل ما تحتاج معرفته لخوض التنافس وكسب أقصى قدر من الأجر والنقاط</p>
      </div>

      <div className="space-y-3.5">
        <InfoCard
          icon={Target}
          title="كيف أشارك في الفعاليات؟"
          description="ادخل إلى تبويب 'الفعاليات' واختر أي فعالية 'نشطة الآن'. اضغط 'انضمام للمسابقة' لتفتح لك ساحة التسبيح والتنافس المباشر."
          gradient="from-emerald-500 to-teal-600"
          badge="الخطوة 1"
        />
        <InfoCard
          icon={Clock}
          title="التسبيح وحساب النقاط"
          description="كل ضغطة على كروت الأذكار تحتسب لك نقاطاً فورية (+XP) وتُرفع تلقائياً إلى لوحة الصدارة وتضاف إلى رصيدك العام."
          gradient="from-sky-500 to-indigo-600"
          badge="الخطوة 2"
        />
        <InfoCard
          icon={Users}
          title="المنافسة ولوحة الصدارة"
          description="شاهد ترتيبك المباشر وترتيب بقية المتسابقين في منصة التتويج المباشرة، وتحدى إخوانك للوصول إلى المركز الأول ."
          gradient="from-amber-500 to-orange-600"
          badge="الخطوة 3"
        />
        <InfoCard
          icon={Trophy}
          title="أوسمة قاعة الأبطال"
          description="المراكز الثلاثة الأولى في كل فعالية يحصلون على أوسمة تميز حصرية تُعرض في ملفهم الشخصي وتخلد إنجازهم."
          gradient="from-purple-500 to-pink-600"
          badge="الجوائز"
        />
      </div>
    </div>
  );
};

interface InfoCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  gradient: string;
  badge: string;
}

const InfoCard: React.FC<InfoCardProps> = ({ icon: Icon, title, description, gradient, badge }) => (
  <div className="p-5 rounded-[2.2rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex items-start gap-4 text-right">
    <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${gradient} text-white flex-shrink-0 shadow-md`}>
      <Icon size={22} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-center mb-1">
        <h3 className="font-black text-sm text-slate-800 dark:text-white truncate">{title}</h3>
        <span className="text-[10px] font-black text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 px-2.5 py-0.5 rounded-full">{outlineContent(badge)}</span>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-bold">{description}</p>
    </div>
  </div>
);

export default EventChallengesPage;