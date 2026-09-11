import { OutlineIcon, outlineContent } from './OutlineIcon';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Compass, LocateFixed, MapPin, RefreshCw, ChevronRight, CheckCircle2, AlertCircle, Info, Sparkles } from 'lucide-react';
import { Geolocation } from '@capacitor/geolocation';
import { calculateQiblaDirection, normalizeCompassHeading, smoothAngle } from '../services/qiblaService';

interface QiblaCompassPageProps {
  onBack: () => void;
}

interface CoordinatesState {
  latitude: number;
  longitude: number;
  sourceLabel?: string;
}

const DEFAULT_COORDS: CoordinatesState = {
  latitude: 30.0444,
  longitude: 31.2357,
  sourceLabel: 'القاهرة (موقع افتراضي)'
};

const QiblaCompassPage: React.FC<QiblaCompassPageProps> = ({ onBack }) => {
  const [coords, setCoords] = useState<CoordinatesState | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [requestingHeading, setRequestingHeading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasVibrated, setHasVibrated] = useState(false);
  const [showCalibrationGuide, setShowCalibrationGuide] = useState(false);
  
  // Smoothing and Animation Frame References
  const latestRawHeadingRef = useRef<number | null>(null);
  const smoothedHeadingRef = useRef<number | null>(null);
  const lastDispatchedHeadingRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const orientationListenerRef = useRef<((event: DeviceOrientationEvent) => void) | null>(null);
  const absoluteListenerRef = useRef<((event: DeviceOrientationEvent) => void) | null>(null);

  const qiblaData = useMemo(() => {
    if (!coords) return null;
    return calculateQiblaDirection(coords.latitude, coords.longitude);
  }, [coords]);

  const loadLocation = async () => {
    setLoadingLocation(true);
    setError(null);

    // 1. Try Native Capacitor Geolocation
    try {
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 8000,
      });
      setCoords({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        sourceLabel: 'تحديد دقيق عبر الـ GPS'
      });
      setLoadingLocation(false);
      return;
    } catch {
      // Fall through to browser navigator.geolocation
    }

    // 2. Try Browser Geolocation
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            sourceLabel: 'تحديد عبر المتصفح'
          });
          setLoadingLocation(false);
        },
        () => {
          // 3. Fallback to cached prayer location
          tryFallbackCachedLocation();
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    } else {
      tryFallbackCachedLocation();
    }
  };

  const tryFallbackCachedLocation = () => {
    try {
      const cached = localStorage.getItem('prayer_timings_cache_v2');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.location?.latitude && parsed.location?.longitude) {
          setCoords({
            latitude: parsed.location.latitude,
            longitude: parsed.location.longitude,
            sourceLabel: 'الموقع المحفوظ لمواقيت الصلاة'
          });
          setLoadingLocation(false);
          return;
        }
      }
    } catch {}

    // Fallback to default
    setCoords(DEFAULT_COORDS);
    setLoadingLocation(false);
  };

  useEffect(() => {
    void loadLocation();
  }, []);

  // Continuous animation loop for buttery smooth, jitter-free needle updates
  const startAnimationLoop = () => {
    if (animationFrameRef.current !== null) return;

    const loop = () => {
      const target = latestRawHeadingRef.current;
      if (target !== null) {
        if (smoothedHeadingRef.current === null) {
          smoothedHeadingRef.current = target;
        } else {
          // Exponential Vector Smoothing (alpha = 0.12 gives stable yet responsive feel)
          smoothedHeadingRef.current = smoothAngle(smoothedHeadingRef.current, target, 0.12);
        }

        // Only dispatch state update when difference is meaningful to prevent excessive renders
        const currentSmooth = smoothedHeadingRef.current;
        const lastDispatched = lastDispatchedHeadingRef.current;
        if (
          lastDispatched === null ||
          Math.abs(currentSmooth - lastDispatched) > 0.35 ||
          (lastDispatched > 355 && currentSmooth < 5) ||
          (lastDispatched < 5 && currentSmooth > 355)
        ) {
          lastDispatchedHeadingRef.current = currentSmooth;
          setHeading(currentSmooth);
        }
      }
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
  };

  const stopAnimationLoop = () => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const enableDeviceDirection = async () => {
    setRequestingHeading(true);
    setError(null);

    try {
      const orientationWithPermission = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
        requestPermission?: () => Promise<'granted' | 'denied'>;
      };

      if (typeof orientationWithPermission.requestPermission === 'function') {
        const result = await orientationWithPermission.requestPermission();
        if (result !== 'granted') {
          setError('يرجى منح إذن حساس البوصلة لتحديد اتجاه القبلة بدقة.');
          setRequestingHeading(false);
          return;
        }
      }

      cleanupListeners();

      const handleOrientation = (event: DeviceOrientationEvent) => {
        const webkitHeading = (event as unknown as { webkitCompassHeading?: number }).webkitCompassHeading;
        const nextHeading = normalizeCompassHeading(
          event.alpha ?? null,
          webkitHeading ?? null,
          event.beta ?? null,
          event.gamma ?? null
        );

        if (nextHeading !== null && !Number.isNaN(nextHeading)) {
          latestRawHeadingRef.current = nextHeading;
        }
      };

      orientationListenerRef.current = handleOrientation;
      absoluteListenerRef.current = handleOrientation;

      // Android absolute orientation
      if ('ondeviceorientationabsolute' in window) {
        window.addEventListener('deviceorientationabsolute', handleOrientation as EventListener, true);
      }
      // Standard orientation for iOS and other devices
      window.addEventListener('deviceorientation', handleOrientation, true);

      startAnimationLoop();
      setTimeout(() => setRequestingHeading(false), 600);
    } catch {
      setError('حساس البوصلة غير مدعوم في هذا المتصفح. يمكنك استخدام السهم حسب الدرجة الموضحة.');
      setRequestingHeading(false);
    }
  };

  const cleanupListeners = () => {
    if (orientationListenerRef.current) {
      window.removeEventListener('deviceorientation', orientationListenerRef.current, true);
      orientationListenerRef.current = null;
    }
    if (absoluteListenerRef.current) {
      window.removeEventListener('deviceorientationabsolute', absoluteListenerRef.current as EventListener, true);
      absoluteListenerRef.current = null;
    }
    stopAnimationLoop();
  };

  useEffect(() => {
    void enableDeviceDirection();
    return () => cleanupListeners();
  }, []);

  // Calculate rotations
  const compassRotation = heading !== null ? -heading : 0;
  const pointerRotation = qiblaData ? qiblaData.bearing - (heading ?? 0) : 0;
  
  // Check if we are facing the Qibla (tolerance of 5 degrees)
  const normalizedDiff = Math.abs((((pointerRotation % 360) + 540) % 360) - 180);
  const isCorrectDirection = qiblaData && heading !== null && normalizedDiff < 6;

  // Vibrate when reaching Qibla
  useEffect(() => {
    if (isCorrectDirection && !hasVibrated) {
      if (navigator.vibrate) {
        try {
          navigator.vibrate([120, 60, 120]);
        } catch {}
      }
      setHasVibrated(true);
    } else if (!isCorrectDirection) {
      setHasVibrated(false);
    }
  }, [isCorrectDirection, hasVibrated]);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 animate-in fade-in duration-500 overflow-hidden font-sans">
      {/* Header with Safe Area top padding */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 pb-3 pt-[max(env(safe-area-inset-top,0px),12px)] flex items-center justify-between z-30 shadow-sm">
        <button 
          onClick={onBack} 
          className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-95 text-slate-700 dark:text-slate-300"
          aria-label="رجوع"
        >
          <ChevronRight size={22} />
        </button>
        <div className="text-center">
          <h2 className="text-lg font-black text-slate-800 dark:text-white">بوصلة القبلة</h2>
          <p className="text-[10px] text-slate-400 font-bold">تحديد مباشر لاتجاه الكعبة المشرفة</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => setShowCalibrationGuide(true)} 
            title="معايرة البوصلة"
            className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-violet-600 dark:text-slate-400 flex items-center justify-center transition active:scale-95"
            aria-label="معايرة"
          >
            <Info size={18} />
          </button>
          <button 
            onClick={() => void loadLocation()} 
            title="تحديث الموقع"
            className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-emerald-600 dark:text-slate-400 flex items-center justify-center transition active:scale-95"
            aria-label="تحديث"
          >
            <RefreshCw size={18} className={loadingLocation ? 'animate-spin text-emerald-500' : ''} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-12 max-w-lg mx-auto w-full">
        
        {/* Compass Visual Container */}
        <div className={`relative overflow-hidden rounded-[2.5rem] p-6 text-white shadow-2xl transition-colors duration-700 border ${
          isCorrectDirection 
            ? 'bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-900 border-emerald-400/40 shadow-emerald-600/30' 
            : 'bg-gradient-to-br from-slate-900 via-violet-950/80 to-slate-950 border-white/10 shadow-slate-950/60'
        }`}>
          {/* Background Ambient Orbs */}
          <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-44 h-44 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center">
            
            {/* Status Badge */}
            <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black border transition-all duration-500 mb-6 shadow-md ${
                isCorrectDirection 
                  ? 'bg-white text-emerald-700 border-white scale-105 shadow-emerald-500/30' 
                  : 'bg-white/10 text-white border-white/20 backdrop-blur-md'
            }`}>
              {isCorrectDirection ? (
                <>
                  <CheckCircle2 size={16} className="text-emerald-600 animate-bounce" />
                  <span>أنت باتجاه القبلة تماماً <OutlineIcon name="sparkles" /></span>
                </>
              ) : (
                <>
                  <Compass size={16} className="text-amber-300 animate-spin-slow" />
                  <span>{heading !== null ? 'دوّر الهاتف ليطابق السهم اتجاه الكعبة' : 'وجّه هاتفك نحو زاوية القبلة'}</span>
                </>
              )}
            </div>

            {/* The Compass Dial UI */}
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 my-2 flex items-center justify-center">
              
              {/* Phone Top Indicator Needle Guide */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-3.5 h-6 bg-gradient-to-b from-amber-300 to-amber-500 rounded-full shadow-[0_0_15px_rgba(251,191,36,0.8)] z-30 border border-white/60" />
              
              {/* Outer Glow Ring */}
              <div className="absolute inset-0 rounded-full border border-white/15 shadow-inner pointer-events-none" />

              {/* Main Compass Dial (Rotates smoothly with device) */}
              <div 
                className="absolute inset-0 rounded-full bg-white/5 border-2 border-white/25 backdrop-blur-md flex items-center justify-center will-change-transform"
                style={{ 
                  transform: `rotate(${compassRotation}deg) translateZ(0)`,
                  transition: 'transform 0.08s linear'
                }}
              >
                {/* Dial Markings */}
                <div className="absolute top-2.5 text-[13px] font-black tracking-widest text-emerald-400 drop-shadow-sm">ش (N)</div>
                <div className="absolute bottom-2.5 text-[13px] font-black tracking-widest text-white/50">ج (S)</div>
                <div className="absolute right-3.5 text-[13px] font-black tracking-widest text-white/50">ق (E)</div>
                <div className="absolute left-3.5 text-[13px] font-black tracking-widest text-white/50">غ (W)</div>
                
                {/* Subtle Circular Lines & Degrees ticks */}
                <div className="absolute inset-7 rounded-full border border-dashed border-white/20 pointer-events-none" />
                <div className="absolute inset-14 rounded-full border border-white/10 pointer-events-none" />
              </div>

              {/* Qibla Direction Arrow & Kaaba */}
              <div 
                className="absolute inset-0 flex items-center justify-center will-change-transform z-20"
                style={{ 
                  transform: `rotate(${pointerRotation}deg) translateZ(0)`,
                  transition: 'transform 0.08s linear'
                }}
              >
                {/* Arrow pointing to Kaaba */}
                <div className="absolute top-2 flex flex-col items-center">
                  <div className="w-0 h-0 border-l-[14px] border-r-[14px] border-b-[36px] border-l-transparent border-r-transparent border-b-emerald-400 drop-shadow-[0_0_14px_rgba(52,211,153,0.9)]" />
                  <div className="w-1.5 h-10 bg-gradient-to-b from-emerald-400 to-transparent rounded-full -mt-1 opacity-75" />
                </div>
                
                {/* Center Kaaba Cube */}
                <div className={`w-20 h-20 rounded-[1.4rem] flex flex-col items-center justify-center relative overflow-hidden transition-all duration-500 ${
                  isCorrectDirection 
                    ? 'bg-slate-950 border-4 border-amber-300 shadow-[0_0_35px_rgba(251,191,36,0.8)] scale-105' 
                    : 'bg-slate-950/90 border-2 border-amber-400/80 shadow-[0_10px_25px_rgba(0,0,0,0.6)]'
                }`}>
                  <div className="absolute top-0 left-0 right-0 h-3.5 bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400" />
                  <div className="absolute inset-x-3 top-5 h-[1.5px] bg-amber-300/60" />
                  <div className="mt-2.5 text-[11px] font-black text-amber-200 tracking-wide">الكعبة</div>
                  <div className="text-[8px] font-mono text-slate-400">مكة المكرمة</div>
                </div>
              </div>
            </div>
            
            {/* Live Angle Degrees Display */}
            <div className="text-center mt-3 flex items-center justify-center gap-5 bg-black/25 px-5 py-3 rounded-2xl border border-white/15 backdrop-blur-md">
              <div className="text-right">
                <span className="text-[11px] text-slate-300 block font-bold">زاوية هاتفك</span>
                <span className="text-2xl font-black tabular-nums font-mono text-white">
                  {heading !== null ? `${Math.round(heading)}°` : '--°'}
                </span>
              </div>
              <div className="w-[1px] h-8 bg-white/20" />
              <div className="text-left">
                <span className="text-[11px] text-amber-300 block font-bold">زاوية القبلة</span>
                <span className="text-2xl font-black tabular-nums font-mono text-amber-300">
                  {qiblaData ? `${Math.round(qiblaData.bearing)}°` : '--°'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Data Cards Grid */}
        <div className="grid grid-cols-2 gap-3.5">
          <div className="bg-white dark:bg-slate-900 p-4.5 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-2.5 text-blue-500 shadow-sm">
              <MapPin size={20} />
            </div>
            <span className="text-[10px] font-black text-slate-400 mb-0.5">الموقع المعتمد</span>
            <p className="text-xs font-bold text-slate-800 dark:text-white truncate max-w-full">
              {coords?.sourceLabel || (coords ? `${coords.latitude.toFixed(2)}, ${coords.longitude.toFixed(2)}` : 'جاري التحديد...')}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4.5 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center mb-2.5 text-amber-500 shadow-sm">
              <LocateFixed size={20} />
            </div>
            <span className="text-[10px] font-black text-slate-400 mb-0.5">الانحراف عن الشمال</span>
            <p className="text-sm font-black text-slate-800 dark:text-white font-mono">
              {qiblaData ? `${Math.round(qiblaData.bearing)}°` : '--'}
            </p>
          </div>
        </div>
        
        {qiblaData && (
          <div className="bg-emerald-50/80 dark:bg-emerald-950/20 p-4 rounded-[1.8rem] border border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-center gap-2.5 text-emerald-800 dark:text-emerald-300 font-bold text-xs shadow-sm">
             <MapPin size={16} className="text-emerald-600" />
             <span>المسافة المباشرة إلى الكعبة المشرفة: <strong className="font-mono text-emerald-700 dark:text-emerald-400 font-black">{qiblaData.distanceKm.toLocaleString('ar-EG', {maximumFractionDigits: 0})}</strong> كم تقريباً</span>
          </div>
        )}

        {/* Permission / Sensor Activation Hint */}
        {heading === null && (
          <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/40 p-5 rounded-[2rem] flex flex-col items-center gap-3 text-center shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <AlertCircle size={18} className="text-amber-500 shrink-0" />
              <span>لحساب الاتجاه الحي والمباشر، يرجى تفعيل حساس بوصلة الهاتف</span>
            </div>
            <button
              onClick={() => void enableDeviceDirection()}
              disabled={requestingHeading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-600/20 active:scale-95"
            >
              <RefreshCw size={16} className={requestingHeading ? 'animate-spin' : ''} />
              <span>تنشيط حساس البوصلة الآن</span>
            </button>
          </div>
        )}
      </div>

      {/* Compass Calibration Guide Modal */}
      {showCalibrationGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.2rem] max-w-sm w-full text-center border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 flex items-center justify-center mx-auto shadow-sm">
              <Sparkles size={28} />
            </div>
            <h3 className="text-lg font-black text-slate-800 dark:text-white">معايرة بوصلة الهاتف</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              إذا لاحظت عدم دقة الاتجاه أو تأثره بالمجالات المغناطيسية، حرّك هاتفك في الهواء على شكل <strong>رقم 8 بالإنجليزية (∞)</strong> لعدة ثوانٍ لإعادة ضبط المعايرة الدقيقة للحساس.
            </p>
            <button 
              onClick={() => setShowCalibrationGuide(false)}
              className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black rounded-xl shadow-md active:scale-95 transition"
            >
              فهمت ذلك
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QiblaCompassPage;
