import { OutlineIcon, outlineContent } from './OutlineIcon';
import React, { useEffect, useState } from 'react';
import { ArrowRight, Bell, Clock3, MapPin, Settings, Sunrise, Sun, Sunset, Moon, Volume2 } from 'lucide-react';

const STORAGE_KEY = 'prayer_settings';

const PRAYER_OPTIONS = [
  { key: 'Fajr', label: 'الفجر', icon: Sunrise },
  { key: 'Sunrise', label: 'الشروق', icon: Sun },
  { key: 'Dhuhr', label: 'الظهر', icon: Sun },
  { key: 'Asr', label: 'العصر', icon: Clock3 },
  { key: 'Maghrib', label: 'المغرب', icon: Sunset },
  { key: 'Isha', label: 'العشاء', icon: Moon },
] as const;

type PrayerKey = typeof PRAYER_OPTIONS[number]['key'];
type AzanSound = 'makkah' | 'madinah' | 'alaqsa' | 'default';

type PrayerSettingsState = {
  autoLocation: boolean;
  country: string;
  city: string;
  calcMethod: number;
  asrMethod: number;
  azanSound: AzanSound;
  preAzanReminder: number;
  iqamaDelay: number;
  notifications: Record<PrayerKey, boolean>;
};

const DEFAULT_SETTINGS: PrayerSettingsState = {
  autoLocation: false,
  country: 'Egypt',
  city: 'Sohag',
  calcMethod: 5,
  asrMethod: 0,
  azanSound: 'makkah',
  preAzanReminder: 15,
  iqamaDelay: 20,
  notifications: {
    Fajr: true,
    Sunrise: false,
    Dhuhr: true,
    Asr: true,
    Maghrib: true,
    Isha: true,
  },
};

const COUNTRIES = ['Egypt', 'Saudi Arabia', 'United Arab Emirates', 'Kuwait'];
const CITIES = ['Sohag', 'Cairo', 'Alexandria', 'Makkah', 'Madinah', 'Dubai', 'Kuwait City'];
const AZAN_SOUND_OPTIONS: Array<{ value: AzanSound; label: string }> = [
  { value: 'makkah', label: 'Makkah' },
  { value: 'madinah', label: 'Madinah' },
  { value: 'alaqsa', label: 'Al-Aqsa' },
  { value: 'default', label: 'Default' },
];
const PRE_AZAN_REMINDER_OPTIONS = [0, 10, 15, 20, 30];
const IQAMA_DELAY_OPTIONS = [10, 15, 20, 30];

function loadStoredSettings(): PrayerSettingsState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(stored) as Partial<PrayerSettingsState>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      notifications: {
        ...DEFAULT_SETTINGS.notifications,
        ...parsed.notifications,
      },
    };
  } catch (error) {
    console.error('Failed to load prayer settings:', error);
    return DEFAULT_SETTINGS;
  }
}

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 rounded-full transition-colors ${
        checked ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-700'
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'right-6' : 'right-1'
        }`}
      />
    </button>
  );
}

function SettingsCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-300 flex items-center justify-center">
          {outlineContent(icon)}
        </div>
        <h2 className="text-sm font-black text-slate-900 dark:text-white">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function PrayerSettings({ onBack }: { onBack?: () => void }) {
  const [settings, setSettings] = useState<PrayerSettingsState>(() => loadStoredSettings());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSettings = <K extends keyof PrayerSettingsState>(key: K, value: PrayerSettingsState[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const updateNotification = (prayer: PrayerKey, enabled: boolean) => {
    setSettings((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [prayer]: enabled,
      },
    }));
  };

  const controlClass = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <section className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-black text-violet-600 dark:text-violet-300">إعدادات</p>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">مواقيت الصلاة</h1>
        </div>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="w-11 h-11 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-white"
            aria-label="رجوع"
            title="رجوع"
          >
            <ArrowRight size={20} />
          </button>
        )}
      </div>

      <SettingsCard icon={<MapPin size={18} />} title="الموقع">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black text-slate-900 dark:text-white">Auto-Location</p>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">استخدام GPS لتحديد المواقيت تلقائيًا</p>
          </div>
          <ToggleSwitch
            checked={settings.autoLocation}
            onChange={(checked) => updateSettings('autoLocation', checked)}
            label="Auto-Location"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <label className="space-y-2">
            <span className="text-xs font-black text-slate-500 dark:text-slate-400">Country</span>
            <select
              className={controlClass}
              value={settings.country}
              onChange={(event) => updateSettings('country', event.target.value)}
              disabled={settings.autoLocation}
            >
              {COUNTRIES.map((country) => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black text-slate-500 dark:text-slate-400">City</span>
            <select
              className={controlClass}
              value={settings.city}
              onChange={(event) => updateSettings('city', event.target.value)}
              disabled={settings.autoLocation}
            >
              {CITIES.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </label>
        </div>
      </SettingsCard>

      <SettingsCard icon={<Settings size={18} />} title="الحساب الفلكي">
        <label className="space-y-2 block">
          <span className="text-xs font-black text-slate-500 dark:text-slate-400">Calculation Method</span>
          <select
            className={controlClass}
            value={settings.calcMethod}
            onChange={(event) => updateSettings('calcMethod', Number(event.target.value))}
          >
            <option value={5}>Egyptian General Authority</option>
            <option value={4}>Umm Al-Qura</option>
            <option value={3}>Muslim World League</option>
          </select>
        </label>

        <label className="space-y-2 block mt-4">
          <span className="text-xs font-black text-slate-500 dark:text-slate-400">Asr Method</span>
          <select
            className={controlClass}
            value={settings.asrMethod}
            onChange={(event) => updateSettings('asrMethod', Number(event.target.value))}
          >
            <option value={0}>Standard</option>
            <option value={1}>Hanafi</option>
          </select>
        </label>
      </SettingsCard>

      <SettingsCard icon={<Volume2 size={18} />} title="Audio Settings">
        <label className="space-y-2 block">
          <span className="text-xs font-black text-slate-500 dark:text-slate-400">Azan Sound</span>
          <select
            className={controlClass}
            value={settings.azanSound}
            onChange={(event) => updateSettings('azanSound', event.target.value as AzanSound)}
          >
            {AZAN_SOUND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </SettingsCard>

      <SettingsCard icon={<Bell size={18} />} title="Pre-Azan Reminder">
        <label className="space-y-2 block">
          <span className="text-xs font-black text-slate-500 dark:text-slate-400">
            Minutes before Azan
          </span>
          <select
            className={controlClass}
            value={settings.preAzanReminder}
            onChange={(event) => updateSettings('preAzanReminder', Number(event.target.value))}
          >
            {PRE_AZAN_REMINDER_OPTIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes === 0 ? 'Off' : `${minutes} minutes`}
              </option>
            ))}
          </select>
        </label>
      </SettingsCard>

      <SettingsCard icon={<Clock3 size={18} />} title="Iqama Settings">
        <label className="space-y-2 block">
          <span className="text-xs font-black text-slate-500 dark:text-slate-400">
            Minutes after Azan
          </span>
          <select
            className={controlClass}
            value={settings.iqamaDelay}
            onChange={(event) => updateSettings('iqamaDelay', Number(event.target.value))}
          >
            {IQAMA_DELAY_OPTIONS.map((minutes) => (
              <option key={minutes} value={minutes}>{minutes} minutes</option>
            ))}
          </select>
        </label>
      </SettingsCard>

      <SettingsCard icon={<Bell size={18} />} title="تنبيهات الصلوات">
        <div className="space-y-3">
          {PRAYER_OPTIONS.map(({ key, label, icon: Icon }) => (
            <div key={key} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 dark:bg-slate-900 p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-300 flex items-center justify-center">
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-white">{label}</p>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
                    {settings.notifications[key] ? 'التنبيه مفعل' : 'التنبيه متوقف'}
                  </p>
                </div>
              </div>
              <ToggleSwitch
                checked={settings.notifications[key]}
                onChange={(checked) => updateNotification(key, checked)}
                label={`${label} notification`}
              />
            </div>
          ))}
        </div>
      </SettingsCard>
    </section>
  );
}
