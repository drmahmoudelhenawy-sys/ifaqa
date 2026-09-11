import React, { useState, useEffect } from 'react';
import { X, MapPin, Save, Settings2, Bell, Clock, Compass, CheckCircle2, ChevronDown, Sparkles, Navigation, Search, Check } from 'lucide-react';
import {
  getPrayerSettings,
  savePrayerSettings,
  fetchAndSchedulePrayers,
  PrayerSettings,
  FUNDAMENTAL_PRAYERS,
  PrayerName,
  requestDeviceLocation
} from '../services/prayerTimes';
import { ARAB_CITIES_LOCATIONS, findCityById, findNearestCity, CityLocation } from '../services/prayerCities';

interface PrayerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const calcMethods = [
  { id: 5, name: 'الهيئة العامة المصرية للمساحة (مصر والدول المجاورة - زاوية 19.5°)' },
  { id: 4, name: 'جامعة أم القرى (مكة المكرمة والمملكة العربية السعودية)' },
  { id: 3, name: 'رابطة العالم الإسلامي (معظم الدول الإسلامية)' },
  { id: 8, name: 'دائرة الشؤون الإسلامية (دولة الإمارات العربية المتحدة)' },
  { id: 9, name: 'وزارة الأوقاف والشؤون الإسلامية (دولة الكويت)' },
  { id: 10, name: 'وزارة الأوقاف (دولة قطر)' },
  { id: 13, name: 'رئاسة الشؤون الدينية التركية (Diyanet)' },
  { id: 2, name: 'ISNA (أمريكا الشمالية وأوروبا)' }
];

const namesAr: Record<string, { name: string; desc: string; icon: string }> = {
  Fajr: { name: 'الفجر', desc: 'تنبيه الفجر وصلاة الصبح', icon: '🌅' },
  Dhuhr: { name: 'الظهر', desc: 'أذان الظهر والنافلة', icon: '☀️' },
  Asr: { name: 'العصر', desc: 'أذان العصر والذكر', icon: '🌤️' },
  Maghrib: { name: 'المغرب', desc: 'أذان المغرب والإفطار', icon: '🌇' },
  Isha: { name: 'العشاء', desc: 'أذان العشاء والوتر', icon: '🌙' }
};

export const PrayerSettingsModal: React.FC<PrayerSettingsModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<PrayerSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationSuccessMsg, setLocationSuccessMsg] = useState('');
  const [showManualCoords, setShowManualCoords] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(getPrayerSettings());
      setLocationSuccessMsg('');
    }
  }, [isOpen]);

  if (!isOpen || !settings) return null;

  const handleDetectGPS = async () => {
    setIsLocating(true);
    setLocationSuccessMsg('');
    try {
      const loc = await requestDeviceLocation();
      const nearest = findNearestCity(loc.latitude, loc.longitude);
      
      setSettings(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          autoLocation: true,
          selectedCityId: nearest.id,
          cityNameAr: nearest.nameAr,
          city: nearest.nameEn,
          country: nearest.countryEn,
          latitude: Number(loc.latitude.toFixed(4)),
          longitude: Number(loc.longitude.toFixed(4)),
          calcMethod: nearest.defaultMethod || prev.calcMethod
        };
      });

      setLocationSuccessMsg(`تم تحديد موقعك بدقة فائقة: ${nearest.nameAr} (${loc.latitude.toFixed(3)}, ${loc.longitude.toFixed(3)})`);
    } catch (err) {
      console.warn('GPS detection failed:', err);
      setLocationSuccessMsg('تعذر الوصول للـ GPS، يرجى اختيار مدينتك يدوياً من القائمة أدناه.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleSelectCity = (cityId: string) => {
    const city = findCityById(cityId);
    if (!city) return;

    setSettings(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        autoLocation: false,
        selectedCityId: city.id,
        cityNameAr: city.nameAr,
        city: city.nameEn,
        country: city.countryEn,
        latitude: city.latitude,
        longitude: city.longitude,
        calcMethod: city.defaultMethod || prev.calcMethod
      };
    });
    setLocationSuccessMsg(`تم ضبط المدينة: ${city.nameAr} (${city.countryAr})`);
  };

  const handleSave = async () => {
    setIsLoading(true);
    savePrayerSettings(settings);
    await fetchAndSchedulePrayers(true);
    setIsLoading(false);
    onClose();
  };

  const updateOffset = (prayer: PrayerName, field: 'preAzan' | 'iqama', value: number) => {
    const safeVal = Math.max(0, Math.min(120, isNaN(value) ? 0 : value));
    setSettings(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        offsets: {
          ...prev.offsets,
          [prayer]: {
            ...prev.offsets[prayer],
            [field]: safeVal
          }
        }
      };
    });
  };

  const toggleNotification = (prayer: PrayerName) => {
    setSettings(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        notifications: {
          ...prev.notifications,
          [prayer]: !prev.notifications[prayer]
        }
      };
    });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200" dir="rtl">
      <div className="relative w-full max-w-lg max-h-[92vh] rounded-3xl bg-slate-900 border border-white/10 shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Sticky Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-900/95 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-violet-950">
              <Settings2 size={20} />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">إعدادات مواقيت الصلاة</h2>
              <p className="text-xs text-slate-400 font-bold">تحديد دقيق للموقع فلكياً أو عبر GPS</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
          
          {/* Location Detection Section */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-800/80 border border-white/10 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-violet-400 font-black text-sm">
                <MapPin size={18} />
                <span>تحديد موقعك الجغرافي</span>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-violet-950 text-violet-300 border border-violet-800/50">
                {settings.cityNameAr || settings.city || 'غير محدد'}
              </span>
            </div>

            {/* GPS Detection Button */}
            <button
              type="button"
              disabled={isLocating}
              onClick={handleDetectGPS}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-98 disabled:opacity-50"
            >
              <Navigation size={16} className={isLocating ? 'animate-spin' : ''} />
              <span>{isLocating ? 'جاري تحديد موقعك بالأقمار الصناعية...' : '📍 تحديد موقعي الآن بدقة فائقة عبر GPS'}</span>
            </button>

            {locationSuccessMsg && (
              <p className="text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 p-2.5 rounded-xl text-center animate-in fade-in">
                {locationSuccessMsg}
              </p>
            )}

            {/* Manual City Dropdown */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-bold text-slate-300">
                أو اختر محافظتك / مدينتك يدوياً (مصر والدول العربية):
              </label>
              <div className="relative">
                <select
                  value={settings.selectedCityId || ''}
                  onChange={(e) => handleSelectCity(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold outline-none focus:border-violet-500 appearance-none pr-3 pl-8"
                >
                  <option value="" disabled>-- اختر المحافظة أو المدينة --</option>
                  
                  <optgroup label="جمهورية مصر العربية">
                    {ARAB_CITIES_LOCATIONS.filter(c => c.countryEn === 'Egypt').map(c => (
                      <option key={c.id} value={c.id}>{c.nameAr}</option>
                    ))}
                  </optgroup>

                  <optgroup label="المملكة العربية السعودية">
                    {ARAB_CITIES_LOCATIONS.filter(c => c.countryEn === 'Saudi Arabia').map(c => (
                      <option key={c.id} value={c.id}>{c.nameAr}</option>
                    ))}
                  </optgroup>

                  <optgroup label="الإمارات والكويت وقطر وباقي الدول">
                    {ARAB_CITIES_LOCATIONS.filter(c => !['Egypt', 'Saudi Arabia'].includes(c.countryEn)).map(c => (
                      <option key={c.id} value={c.id}>{c.nameAr} ({c.countryAr})</option>
                    ))}
                  </optgroup>
                </select>
                <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Toggle manual Coordinates */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowManualCoords(!showManualCoords)}
                className="text-xs font-bold text-violet-400 hover:text-violet-300 flex items-center gap-1"
              >
                <span>{showManualCoords ? '− إخفاء الإحداثيات المتقدمة' : '+ إدخال إحداثيات خط الطول والعرض يدوياً (لقريتك أو منطقتك)'}</span>
              </button>

              {showManualCoords && (
                <div className="grid grid-cols-2 gap-3 mt-2.5 p-3 rounded-xl bg-slate-900/80 border border-slate-700/60 animate-in fade-in">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">خط العرض (Latitude)</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={settings.latitude ?? ''}
                      onChange={(e) => setSettings({ ...settings, latitude: parseFloat(e.target.value) || 0, autoLocation: false })}
                      placeholder="مثال: 26.55"
                      dir="ltr"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">خط الطول (Longitude)</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={settings.longitude ?? ''}
                      onChange={(e) => setSettings({ ...settings, longitude: parseFloat(e.target.value) || 0, autoLocation: false })}
                      placeholder="مثال: 31.69"
                      dir="ltr"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white font-mono outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Calculation Method */}
            <div className="pt-2 border-t border-slate-700/50">
              <label className="block text-xs font-bold text-slate-300 mb-1.5">طريقة الحساب الفلكي للمواقيت:</label>
              <div className="relative">
                <select 
                  value={settings.calcMethod}
                  onChange={e => setSettings({...settings, calcMethod: Number(e.target.value)})}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold outline-none focus:border-violet-500 appearance-none pr-3 pl-8"
                >
                  {calcMethods.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Per-Prayer Settings */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-xs font-black text-slate-300">
                <Bell size={16} className="text-amber-400" />
                <span>تخصيص الصلوات والتنبيهات (بالدقائق)</span>
              </div>
            </div>

            {FUNDAMENTAL_PRAYERS.map(prayer => {
              const meta = namesAr[prayer] || { name: prayer, desc: '', icon: '🕌' };
              const isEnabled = !!settings.notifications[prayer];

              return (
                <div 
                  key={prayer} 
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isEnabled 
                      ? 'bg-slate-800/80 border-slate-700 shadow-md' 
                      : 'bg-slate-800/40 border-slate-800 opacity-60'
                  }`}
                >
                  {/* Prayer Header & Switch */}
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-700/40">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <span className="text-base">{meta.icon}</span>
                      <div>
                        <div className="text-sm font-black text-white">صلاة {meta.name}</div>
                        <div className="text-[10px] text-slate-400 font-bold">{meta.desc}</div>
                      </div>
                    </label>
                    <button
                      type="button"
                      onClick={() => toggleNotification(prayer)}
                      className={`px-3 py-1 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                        isEnabled 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-slate-700/50 text-slate-400 border border-slate-600/30'
                      }`}
                    >
                      {isEnabled ? <><CheckCircle2 size={13} /> مفعّل</> : 'معطّل'}
                    </button>
                  </div>
                  
                  {/* Inputs Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-700/40">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1.5">
                        <span className="flex items-center gap-1">
                          <Clock size={12} className="text-violet-400" />
                          <span>تنبيه قبل الأذان</span>
                        </span>
                        <span className="text-violet-300 font-mono">دقيقة</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={!isEnabled}
                          onClick={() => updateOffset(prayer, 'preAzan', (settings.offsets[prayer]?.preAzan ?? 15) - 5)}
                          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center disabled:opacity-30"
                        >
                          -
                        </button>
                        <input 
                          type="number" 
                          min="0"
                          max="60"
                          value={settings.offsets[prayer]?.preAzan ?? 15}
                          onChange={e => updateOffset(prayer, 'preAzan', Number(e.target.value))}
                          disabled={!isEnabled}
                          className="w-full text-center py-1 rounded-lg bg-slate-800 text-white text-xs font-black font-mono outline-none border border-slate-700 disabled:opacity-40"
                        />
                        <button
                          type="button"
                          disabled={!isEnabled}
                          onClick={() => updateOffset(prayer, 'preAzan', (settings.offsets[prayer]?.preAzan ?? 15) + 5)}
                          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center disabled:opacity-30"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-700/40">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1.5">
                        <span className="flex items-center gap-1">
                          <Clock size={12} className="text-amber-400" />
                          <span>وقت الإقامة</span>
                        </span>
                        <span className="text-amber-300 font-mono">دقيقة</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={!isEnabled}
                          onClick={() => updateOffset(prayer, 'iqama', (settings.offsets[prayer]?.iqama ?? 20) - 5)}
                          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center disabled:opacity-30"
                        >
                          -
                        </button>
                        <input 
                          type="number" 
                          min="0"
                          max="90"
                          value={settings.offsets[prayer]?.iqama ?? 20}
                          onChange={e => updateOffset(prayer, 'iqama', Number(e.target.value))}
                          disabled={!isEnabled}
                          className="w-full text-center py-1 rounded-lg bg-slate-800 text-white text-xs font-black font-mono outline-none border border-slate-700 disabled:opacity-40"
                        />
                        <button
                          type="button"
                          disabled={!isEnabled}
                          onClick={() => updateOffset(prayer, 'iqama', (settings.offsets[prayer]?.iqama ?? 20) + 5)}
                          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center disabled:opacity-30"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-900/95 backdrop-blur-md sticky bottom-0 z-20 flex items-center gap-3">
          <button 
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className="flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 transition active:scale-98 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save size={18} />
                <span>حفظ وتحديث المواقيت الآن</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-3.5 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs transition"
          >
            إلغاء
          </button>
        </div>

      </div>
    </div>
  );
};
