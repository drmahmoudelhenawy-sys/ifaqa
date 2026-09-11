export type RadioCategory = 'reciters' | 'live';

export interface RadioStation {
  id: number;
  name: string;
  url: string;
  fallbackUrls?: string[];
  category?: RadioCategory;
  subtitle?: string;
  source?: string;
}

const RECITERS_API_URL = 'https://www.mp3quran.net/api/v3/radios?language=ar';

const LIVE_STATIONS: RadioStation[] = [
  {
    id: 9004,
    name: 'إذاعة القرآن الكريم - القاهرة',
    subtitle: 'بث إذاعي مباشر من القاهرة على مدار الساعة',
    url: 'https://stream.radiojar.com/8s5u5tpdtwzuv',
    fallbackUrls: [
      'https://n01.radiojar.com/8s5u5tpdtwzuv',
      'https://n09.radiojar.com/8s5u5tpdtwzuv',
      'https://n0c.radiojar.com/8s5u5tpdtwzuv',
      'https://stream.zeno.fm/f3wvbbqmdg8uv'
    ],
    category: 'live',
    source: 'إذاعة القرآن الكريم من القاهرة',
  },
  {
    id: 9001,
    name: 'تلاوات الحرم المكي (مباشر)',
    subtitle: 'بث مباشر من رحاب المسجد الحرام',
    url: 'https://stream.radiojar.com/0tpy1h0kxtzuv',
    fallbackUrls: [
      'https://n01.radiojar.com/0tpy1h0kxtzuv',
      'https://n09.radiojar.com/0tpy1h0kxtzuv',
      'https://qurango.net/radio/mix'
    ],
    category: 'live',
    source: 'إذاعة القرآن الكريم',
  },
  {
    id: 9002,
    name: 'المسجد النبوي الشريف (مباشر)',
    subtitle: 'بث مباشر من المسجد النبوي بالمدينة المنورة',
    url: 'https://qurango.net/radio/salma',
    fallbackUrls: [
      'https://backup.qurango.net/radio/salma',
      'https://stream.radiojar.com/0tpy1h0kxtzuv'
    ],
    category: 'live',
    source: 'قناة السنة النبوية',
  },
  {
    id: 9005,
    name: 'إذاعة التراتيل القرآنية (24 ساعة)',
    subtitle: 'أجمل التلاوات الخاشعة المتواصلة',
    url: 'https://qurango.net/radio/tarateel',
    fallbackUrls: [
      'https://backup.qurango.net/radio/tarateel',
      'https://qurango.net/radio/mix'
    ],
    category: 'live',
    source: 'شبكة قراء القرآن',
  },
  {
    id: 9006,
    name: 'إذاعة الأذكار والرقية الشرعية',
    subtitle: 'أذكار الصباح والمساء والرقية الشرعية',
    url: 'https://qurango.net/radio/athkar_sabah_masaa',
    fallbackUrls: [
      'https://qurango.net/radio/roqiah',
      'https://backup.qurango.net/radio/athkar_sabah_masaa'
    ],
    category: 'live',
    source: 'إذاعة إفاقة للأذكار',
  },
  {
    id: 9007,
    name: 'إذاعة كبار القراء (تلاوات خاشعة)',
    subtitle: 'تلاوات مختارة لأشهر قراء العالم الإسلامي',
    url: 'https://qurango.net/radio/mix',
    fallbackUrls: [
      'https://backup.qurango.net/radio/mix',
      'https://qurango.net/radio/tarateel'
    ],
    category: 'live',
    source: 'إذاعة إفاقة للقرآن الكريم',
  },
  {
    id: 9008,
    name: 'إذاعة تفسير القرآن الكريم',
    subtitle: 'تفسير وبيان معاني الآيات العظيمة',
    url: 'https://qurango.net/radio/tafseer',
    fallbackUrls: [
      'https://backup.qurango.net/radio/tafseer'
    ],
    category: 'live',
    source: 'إذاعة القرآن والتفسير',
  },
];

export async function fetchRadios(): Promise<RadioStation[]> {
  try {
    const response = await fetch(RECITERS_API_URL);
    if (!response.ok) {
      throw new Error('Failed to fetch radios');
    }

    const data = await response.json();
    return (data.radios || []).map((station: RadioStation) => ({
      ...station,
      category: 'reciters' as const,
      subtitle: 'إذاعة قارئ',
      source: 'mp3quran.net',
    }));
  } catch (error) {
    console.error('Error fetching radios:', error);
    return [];
  }
}

export function getLiveRadioStations(): RadioStation[] {
  return LIVE_STATIONS;
}
