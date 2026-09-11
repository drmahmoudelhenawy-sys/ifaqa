import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, ChevronRight, Radio, Volume2, Search, RefreshCw, Music2, Share2, RadioTower } from 'lucide-react';
import { fetchRadios, getLiveRadioStations, type RadioCategory, type RadioStation } from '../services/radioService';
import { radioPlaybackService, type RadioPlaybackState } from '../services/radioPlaybackService';
import toast from 'react-hot-toast';
import { clanService } from '../services/clanService';
import { auth } from '../../services/firebase';

interface RadioPlayerProps {
  onBack: () => void;
}

const RadioPlayer: React.FC<RadioPlayerProps> = ({ onBack }) => {
  const [reciterStations, setReciterStations] = useState<RadioStation[]>([]);
  const [playbackState, setPlaybackState] = useState<RadioPlaybackState>(radioPlaybackService.getState());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<RadioCategory>('reciters');

  const liveStations = useMemo(() => getLiveRadioStations(), []);
  const visibleStations = activeCategory === 'live' ? liveStations : reciterStations;

  useEffect(() => {
    const unsubscribe = radioPlaybackService.subscribe((state) => {
      setPlaybackState(state);
      if (state.error) {
        toast.error(state.error);
      }
    });

    return unsubscribe;
  }, []);



  useEffect(() => {
    const loadRadios = async () => {
      setLoading(true);
      const data = await fetchRadios();
      setReciterStations(data);
      radioPlaybackService.setStations([...liveStations, ...data]);

      const serviceState = radioPlaybackService.getState();
      if (!serviceState.currentStation) {
        const fallbackStation = liveStations[0] || data[0];
        if (fallbackStation) {
          await radioPlaybackService.selectStation(fallbackStation, false);
        }
      }

      setLoading(false);
    };

    void loadRadios();
  }, [liveStations]);

  const togglePlay = async () => {
    try {
      await radioPlaybackService.togglePlay();
    } catch (error) {
      console.error('Playback toggle error:', error);
    }
  };

  const handleStationSelect = async (station: RadioStation) => {
    try {
      await radioPlaybackService.selectStation(station, true);
    } catch (error) {
      console.error('Station selection error:', error);
    }
  };

  const filteredStations = visibleStations.filter((station) => station.name.includes(searchQuery));

  const handleShare = () => {
    if (playbackState.currentStation && navigator.share) {
      void navigator.share({
        title: 'استمع إلى إذاعة القرآن الكريم',
        text: `أستمع الآن إلى ${playbackState.currentStation.name} عبر تطبيق إفاقة.`,
        url: playbackState.currentStation.url,
      });
    }
  };

  const isPlaying = playbackState.isPlaying;
  const isBusy = playbackState.isBuffering;
  const currentStation = playbackState.currentStation;

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 animate-in fade-in duration-500 overflow-hidden">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 safe-top relative z-20">
        <div className="flex items-center justify-between mb-2">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <ChevronRight size={24} className="text-slate-600 dark:text-slate-400" />
          </button>
          <h2 className="text-xl font-black text-slate-800 dark:text-white">إذاعة القرآن الكريم</h2>
          <button onClick={handleShare} className="p-2 text-slate-400 hover:text-violet-600 transition">
            <Share2 size={20} />
          </button>
        </div>
      </div>

      <div className="p-6 relative">
        <div className="bg-gradient-to-br from-violet-600 via-indigo-700 to-indigo-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-indigo-500/20 relative overflow-hidden group">
          <div className="absolute inset-0 bg-[url('/assets/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>

          <div className="absolute -bottom-4 left-0 right-0 h-24 flex items-end justify-around gap-1 px-8 opacity-20 group-hover:opacity-40 transition-opacity">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className={`w-1 bg-white rounded-full ${isPlaying ? 'animate-visualizer' : 'h-2'}`}
                style={{
                  height: isPlaying ? `${Math.random() * 60 + 20}%` : '8px',
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: `${0.5 + Math.random()}s`,
                }}
              />
            ))}
          </div>

          <div className="relative z-10 flex flex-col items-center text-center space-y-6">
            <div className={`w-24 h-24 flex items-center justify-center rounded-[2rem] bg-white/20 backdrop-blur-xl border border-white/20 shadow-xl ${isPlaying ? 'animate-pulse-slow' : ''}`}>
              {currentStation?.category === 'live' ? <RadioTower size={48} className="text-white" /> : <Radio size={48} className="text-white" />}
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black leading-tight h-14 flex items-center justify-center">
                {currentStation?.name || 'اختر إذاعة للتشغيل'}
              </h3>
              <div className="flex items-center justify-center gap-2 text-indigo-200">
                <Music2 size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {isBusy ? 'جارٍ الاتصال بالبث' : isPlaying ? 'بث مباشر الآن' : 'جاهز للتشغيل'}
                </span>
              </div>
            </div>

            <button
              onClick={() => void togglePlay()}
              disabled={isBusy && !isPlaying}
              className="w-16 h-16 flex items-center justify-center rounded-full bg-white text-indigo-700 shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-70"
            >
              {isBusy && !isPlaying ? <RefreshCw size={28} className="animate-spin" /> : isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 mb-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 flex items-center justify-between gap-4">
          <div className="text-right">
            <p className="text-xs font-black text-slate-700 dark:text-slate-200">{currentStation?.name || 'لا يوجد بث محدد'}</p>
            <p className="text-[10px] font-bold text-slate-400 mt-1">
              {currentStation?.subtitle || (isPlaying ? 'التشغيل سيستمر عند مغادرة هذا القسم' : 'اختر إذاعة أو بثًا مباشرًا')}
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-[10px] font-black ${currentStation?.category === 'live' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'}`}>
            {currentStation?.category === 'live' ? 'بث مباشر' : 'إذاعة قارئ'}
          </div>
        </div>
      </div>

      <div className="px-6 mb-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {[
            { key: 'reciters' as const, label: 'إذاعات القراء' },
            { key: 'live' as const, label: 'بث مباشر' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveCategory(tab.key)}
              className={`px-4 py-3 rounded-2xl text-sm font-black transition-all ${
                activeCategory === tab.key
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder={activeCategory === 'live' ? 'ابحث عن بث مباشر...' : 'ابحث عن قارئ...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-2.5 pr-10 pl-4 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-violet-500 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-24 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <RefreshCw className="animate-spin text-violet-600" size={32} />
            <p className="text-slate-500 text-sm font-bold">جارٍ تحميل الإذاعات...</p>
          </div>
        ) : filteredStations.length > 0 ? (
          filteredStations.map((station) => (
            <button
              key={station.id}
              onClick={() => void handleStationSelect(station)}
              className={`w-full group flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${
                currentStation?.id === station.id
                  ? 'bg-violet-50 border-violet-200 dark:bg-violet-900/10 dark:border-violet-900/30'
                  : 'bg-white border-slate-100 hover:border-violet-100 dark:bg-slate-900 dark:border-slate-800/50 dark:hover:border-slate-700'
              }`}
            >
              <div
                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
                  currentStation?.id === station.id
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 group-hover:bg-violet-100 group-hover:text-violet-500'
                }`}
              >
                {currentStation?.id === station.id && isPlaying ? (
                  <div className="flex gap-0.5 items-end h-4">
                    <div className="w-0.5 h-full bg-white animate-visualizer-sm"></div>
                    <div className="w-0.5 h-2/3 bg-white animate-visualizer-sm" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-0.5 h-full bg-white animate-visualizer-sm" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                ) : station.category === 'live' ? (
                  <RadioTower size={18} />
                ) : (
                  <Play size={18} fill={currentStation?.id === station.id ? 'currentColor' : 'none'} />
                )}
              </div>

              <div className="flex-1 text-right">
                <h4 className={`text-sm font-black transition-colors ${currentStation?.id === station.id ? 'text-violet-700 dark:text-violet-400' : 'text-slate-700 dark:text-slate-300'}`}>
                  {station.name}
                </h4>
                <div className="flex items-center gap-1 mt-0.5">
                  <Volume2 size={10} className="text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-400">
                    {currentStation?.id === station.id && isBusy ? 'جارٍ التحميل...' : station.subtitle || 'بث مباشر'}
                  </span>
                </div>
              </div>

              {currentStation?.id === station.id && <div className="w-2 h-2 rounded-full bg-violet-600 animate-pulse"></div>}
            </button>
          ))
        ) : (
          <div className="text-center py-20 text-slate-400 font-bold">لا يوجد نتائج</div>
        )}
      </div>
    </div>
  );
};

export default RadioPlayer;
