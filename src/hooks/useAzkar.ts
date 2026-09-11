import { useState, useEffect } from 'react';
import { getOfflineAthkar } from '../services/offlineData';
import { addXP } from '../services/xpService';

export interface Zikr {
  id: string;
  text: string;
  count: number;
  description?: string;
}

export interface AthkarData {
  [category: string]: Zikr[];
}

export function useAzkar() {
  const [data, setData] = useState<AthkarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<Record<string, number>>({});
  
  useEffect(() => {
    getOfflineAthkar<AthkarData>().then((res) => {
      setData(res);
      setLoading(false);
    }).catch(console.error);
  }, []);

  const handleZikrClick = (zikr: Zikr, userId: string) => {
    setProgress(prev => {
      const currentCount = prev[zikr.id] || 0;
      if (currentCount >= zikr.count) return prev; 

      const newCount = currentCount + 1;
      
      if (newCount === zikr.count) {
        addXP(userId, 30);
      }

      return {
        ...prev,
        [zikr.id]: newCount
      };
    });
  };

  const getCompletionPercentage = (category: string) => {
    if (!data || !data[category]) return 0;
    const azkar = data[category];
    if (azkar.length === 0) return 0;

    let completedAzkar = 0;
    azkar.forEach(z => {
      if ((progress[z.id] || 0) >= z.count) {
        completedAzkar++;
      }
    });

    return Math.round((completedAzkar / azkar.length) * 100);
  };

  return {
    data,
    loading,
    progress,
    handleZikrClick,
    getCompletionPercentage
  };
}
