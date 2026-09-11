import localforage from 'localforage';

export interface AyahAnalysis {
  tafsir?: string;
  irab?: string;
  sarf?: string;
  balagha?: string;
  meanings?: string;
  theme?: string;
}

export const getAyahAnalysis = async (
  surahNum: number,
  ayahNum: number
): Promise<AyahAnalysis | null> => {
  try {
    const bundle = await localforage.getItem<Record<string, AyahAnalysis>>('quran_analysis_bundle');
    
    if (!bundle) {
      return null;
    }

    const key = `${surahNum}:${ayahNum}`;
    const analysis = bundle[key];

    if (!analysis) {
      return {
        tafsir: '',
        irab: '',
        sarf: '',
        balagha: '',
        meanings: '',
        theme: '',
      };
    }

    return {
      tafsir: analysis.tafsir || '',
      irab: analysis.irab || '',
      sarf: analysis.sarf || '',
      balagha: analysis.balagha || '',
      meanings: analysis.meanings || '',
      theme: analysis.theme || '',
    };
  } catch (error) {
    console.error('Failed to retrieve Ayah analysis:', error);
    return null;
  }
};
