import React, { useEffect, useState } from 'react';
import './RadioWidget.css';
import { Radio, Play, Pause, SkipForward, SkipBack } from 'lucide-react';
import { radioPlaybackService, type RadioPlaybackState } from '../src/services/radioPlaybackService';
import { fetchRadios, getLiveRadioStations, type RadioStation } from '../src/services/radioService';

interface RadioWidgetPreviewProps {
  mode?: 'white' | 'emerald';
}

const RadioWidgetPreview: React.FC<RadioWidgetPreviewProps> = ({ mode = 'emerald' }) => {
  const [playbackState, setPlaybackState] = useState<RadioPlaybackState>(radioPlaybackService.getState());
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const unsubscribe = radioPlaybackService.subscribe((state) => {
      if (mounted) setPlaybackState(state);
    });

    const initializeStations = async () => {
      try {
        const liveStations = getLiveRadioStations();
        const reciters = await fetchRadios();
        const allStations = [...liveStations, ...reciters];
        
        if (mounted) {
          setStations(allStations);
          
          if (!radioPlaybackService.getState().currentStation) {
            radioPlaybackService.setStations(allStations);
            await radioPlaybackService.selectStation(liveStations[0], false);
          }
        }
      } catch (error) {
        console.error('Failed to load stations', error);
      } finally {
        if (mounted) setIsInitializing(false);
      }
    };

    initializeStations();

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const handleTogglePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await radioPlaybackService.togglePlay();
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    radioPlaybackService.playAdjacentStation(1);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    radioPlaybackService.playAdjacentStation(-1);
  };

  const handleStationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = Number(e.target.value);
    const station = stations.find(s => s.id === selectedId);
    if (station) {
      radioPlaybackService.selectStation(station, true);
    }
  };

  const themeClass = mode === 'white' ? 'theme-white' : 'theme-emerald';
  const isPlaying = playbackState.isPlaying;
  const isBuffering = playbackState.isBuffering;
  const currentStation = playbackState.currentStation;

  return (
    <div className={`radio-widget-main ${themeClass}`}>
      {/* Header */}
      <div className="radio-widget-header">
        <div className="radio-icon-box">
          <Radio size={20} className={mode === 'white' ? 'text-emerald-700' : 'text-white'} />
        </div>
        <h3>إذاعة إفاقة</h3>
      </div>

      {/* Main Content */}
      <div className="radio-content">
        <div className="station-name-wrapper" style={{ width: '100%', position: 'relative' }}>
          <select 
            className="station-selector"
            value={currentStation?.id || ''}
            onChange={handleStationChange}
            onClick={(e) => e.stopPropagation()}
            disabled={isInitializing}
          >
            {isInitializing && <option value="">جاري التحميل...</option>}
            {stations.map(st => (
              <option key={st.id} value={st.id}>
                {st.name}
              </option>
            ))}
          </select>
          {/* Custom dropdown arrow to hint it's clickable */}
          <div className="dropdown-hint">▼</div>
        </div>
        
        <div className="radio-controls">
          <button onClick={handleNext} className="nav-btn" disabled={isInitializing} title="التالي">
             <SkipForward size={18} fill="currentColor" />
          </button>

          <button onClick={handleTogglePlay} className="play-btn" disabled={isInitializing}>
            {isPlaying ? (
              <Pause size={24} fill="currentColor" />
            ) : (
              <Play size={24} fill="currentColor" className="ml-1" />
            )}
          </button>

          <button onClick={handlePrev} className="nav-btn" disabled={isInitializing} title="السابق">
             <SkipBack size={18} fill="currentColor" />
          </button>
        </div>
        
        <div className="status-badge" style={{ marginTop: 'auto' }}>
            <div className={`live-dot ${isPlaying || isBuffering ? '' : 'paused'}`}></div>
            <span>{isBuffering ? 'جاري التحميل' : (isPlaying ? 'مباشر' : 'متوقف')}</span>
        </div>
      </div>
    </div>
  );
};

export default RadioWidgetPreview;
