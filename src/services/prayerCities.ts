export interface CityLocation {
  id: string;
  nameAr: string;
  nameEn: string;
  countryAr: string;
  countryEn: string;
  latitude: number;
  longitude: number;
  defaultMethod: number; // 5 = Egyptian, 4 = UmmAlQura, etc.
}

export const ARAB_CITIES_LOCATIONS: CityLocation[] = [
  // مصر - كافة المحافظات والمدن الرئيسية
  { id: 'cairo', nameAr: 'القاهرة والجيزة', nameEn: 'Cairo', countryAr: 'مصر', countryEn: 'Egypt', latitude: 30.0444, longitude: 31.2357, defaultMethod: 5 },
  { id: 'alexandria', nameAr: 'الإسكندرية', nameEn: 'Alexandria', countryAr: 'مصر', countryEn: 'Egypt', latitude: 31.2001, longitude: 29.9187, defaultMethod: 5 },
  { id: 'sohag', nameAr: 'سوهاج', nameEn: 'Sohag', countryAr: 'مصر', countryEn: 'Egypt', latitude: 26.5569, longitude: 31.6948, defaultMethod: 5 },
  { id: 'assiut', nameAr: 'أسيوط', nameEn: 'Assiut', countryAr: 'مصر', countryEn: 'Egypt', latitude: 27.1809, longitude: 31.1837, defaultMethod: 5 },
  { id: 'mansoura', nameAr: 'المنصورة (الدقهلية)', nameEn: 'Mansoura', countryAr: 'مصر', countryEn: 'Egypt', latitude: 31.0409, longitude: 31.3785, defaultMethod: 5 },
  { id: 'tanta', nameAr: 'طنطا (الغربية)', nameEn: 'Tanta', countryAr: 'مصر', countryEn: 'Egypt', latitude: 30.7865, longitude: 31.0004, defaultMethod: 5 },
  { id: 'zagazig', nameAr: 'الزقازيق (الشرقية)', nameEn: 'Zagazig', countryAr: 'مصر', countryEn: 'Egypt', latitude: 30.5877, longitude: 31.5020, defaultMethod: 5 },
  { id: 'minya', nameAr: 'المنيا', nameEn: 'Minya', countryAr: 'مصر', countryEn: 'Egypt', latitude: 28.1099, longitude: 30.7503, defaultMethod: 5 },
  { id: 'qena', nameAr: 'قنا', nameEn: 'Qena', countryAr: 'مصر', countryEn: 'Egypt', latitude: 26.1551, longitude: 32.7160, defaultMethod: 5 },
  { id: 'luxor', nameAr: 'الأقصر', nameEn: 'Luxor', countryAr: 'مصر', countryEn: 'Egypt', latitude: 25.6872, longitude: 32.6396, defaultMethod: 5 },
  { id: 'aswan', nameAr: 'أسوان', nameEn: 'Aswan', countryAr: 'مصر', countryEn: 'Egypt', latitude: 24.0889, longitude: 32.8998, defaultMethod: 5 },
  { id: 'portsaid', nameAr: 'بورسعيد', nameEn: 'Port Said', countryAr: 'مصر', countryEn: 'Egypt', latitude: 31.2653, longitude: 32.3019, defaultMethod: 5 },
  { id: 'suez', nameAr: 'السويس', nameEn: 'Suez', countryAr: 'مصر', countryEn: 'Egypt', latitude: 29.9668, longitude: 32.5498, defaultMethod: 5 },
  { id: 'ismailia', nameAr: 'الإسماعيلية', nameEn: 'Ismailia', countryAr: 'مصر', countryEn: 'Egypt', latitude: 30.5965, longitude: 32.2715, defaultMethod: 5 },
  { id: 'benisuef', nameAr: 'بني سويف', nameEn: 'Beni Suef', countryAr: 'مصر', countryEn: 'Egypt', latitude: 29.0661, longitude: 31.0994, defaultMethod: 5 },
  { id: 'fayoum', nameAr: 'الفيوم', nameEn: 'Fayoum', countryAr: 'مصر', countryEn: 'Egypt', latitude: 29.3084, longitude: 30.8428, defaultMethod: 5 },
  { id: 'damietta', nameAr: 'دمياط', nameEn: 'Damietta', countryAr: 'مصر', countryEn: 'Egypt', latitude: 31.4175, longitude: 31.8144, defaultMethod: 5 },
  { id: 'kafr_el_sheikh', nameAr: 'كفر الشيخ', nameEn: 'Kafr El Sheikh', countryAr: 'مصر', countryEn: 'Egypt', latitude: 31.1107, longitude: 30.9388, defaultMethod: 5 },
  { id: 'damanhur', nameAr: 'دمنهور (البحيرة)', nameEn: 'Damanhur', countryAr: 'مصر', countryEn: 'Egypt', latitude: 31.0435, longitude: 30.4704, defaultMethod: 5 },
  { id: 'shibin', nameAr: 'شبين الكوم (المنوفية)', nameEn: 'Shibin El Kom', countryAr: 'مصر', countryEn: 'Egypt', latitude: 30.5560, longitude: 31.0084, defaultMethod: 5 },
  { id: 'banha', nameAr: 'بنها (القليوبية)', nameEn: 'Banha', countryAr: 'مصر', countryEn: 'Egypt', latitude: 30.4660, longitude: 31.1853, defaultMethod: 5 },
  { id: 'hurghada', nameAr: 'الغردقة (البحر الأحمر)', nameEn: 'Hurghada', countryAr: 'مصر', countryEn: 'Egypt', latitude: 27.2579, longitude: 33.8116, defaultMethod: 5 },
  { id: 'sharm', nameAr: 'شرم الشيخ (جنوب سيناء)', nameEn: 'Sharm El Sheikh', countryAr: 'مصر', countryEn: 'Egypt', latitude: 27.9158, longitude: 34.3299, defaultMethod: 5 },
  { id: 'arish', nameAr: 'العريش (شمال سيناء)', nameEn: 'Arish', countryAr: 'مصر', countryEn: 'Egypt', latitude: 31.1325, longitude: 33.8033, defaultMethod: 5 },
  { id: 'matrouh', nameAr: 'مرسى مطروح', nameEn: 'Marsa Matruh', countryAr: 'مصر', countryEn: 'Egypt', latitude: 31.3543, longitude: 27.2373, defaultMethod: 5 },
  { id: 'kharga', nameAr: 'الخارجة (الوادي الجديد)', nameEn: 'Kharga', countryAr: 'مصر', countryEn: 'Egypt', latitude: 25.4514, longitude: 30.5464, defaultMethod: 5 },

  // المملكة العربية السعودية
  { id: 'makkah', nameAr: 'مكة المكرمة', nameEn: 'Makkah', countryAr: 'السعودية', countryEn: 'Saudi Arabia', latitude: 21.4225, longitude: 39.8262, defaultMethod: 4 },
  { id: 'madinah', nameAr: 'المدينة المنورة', nameEn: 'Madinah', countryAr: 'السعودية', countryEn: 'Saudi Arabia', latitude: 24.5247, longitude: 39.5692, defaultMethod: 4 },
  { id: 'riyadh', nameAr: 'الرياض', nameEn: 'Riyadh', countryAr: 'السعودية', countryEn: 'Saudi Arabia', latitude: 24.7136, longitude: 46.6753, defaultMethod: 4 },
  { id: 'jeddah', nameAr: 'جدة', nameEn: 'Jeddah', countryAr: 'السعودية', countryEn: 'Saudi Arabia', latitude: 21.4858, longitude: 39.1925, defaultMethod: 4 },
  { id: 'dammam', nameAr: 'الدمام والخبر', nameEn: 'Dammam', countryAr: 'السعودية', countryEn: 'Saudi Arabia', latitude: 26.4207, longitude: 50.0888, defaultMethod: 4 },
  { id: 'qassim', nameAr: 'القصيم (بريدة وعنيزة)', nameEn: 'Buraidah', countryAr: 'السعودية', countryEn: 'Saudi Arabia', latitude: 26.3260, longitude: 43.9750, defaultMethod: 4 },
  { id: 'abha', nameAr: 'أبها وعسير', nameEn: 'Abha', countryAr: 'السعودية', countryEn: 'Saudi Arabia', latitude: 18.2164, longitude: 42.5053, defaultMethod: 4 },
  { id: 'tabuk', nameAr: 'تبوك', nameEn: 'Tabuk', countryAr: 'السعودية', countryEn: 'Saudi Arabia', latitude: 28.3835, longitude: 36.5662, defaultMethod: 4 },
  { id: 'taif', nameAr: 'الطائف', nameEn: 'Taif', countryAr: 'السعودية', countryEn: 'Saudi Arabia', latitude: 21.2854, longitude: 40.4222, defaultMethod: 4 },

  // الإمارات
  { id: 'dubai', nameAr: 'دبي', nameEn: 'Dubai', countryAr: 'الإمارات', countryEn: 'United Arab Emirates', latitude: 25.2048, longitude: 55.2708, defaultMethod: 8 },
  { id: 'abudhabi', nameAr: 'أبو ظبي', nameEn: 'Abu Dhabi', countryAr: 'الإمارات', countryEn: 'United Arab Emirates', latitude: 24.4539, longitude: 54.3773, defaultMethod: 8 },
  { id: 'sharjah', nameAr: 'الشارقة', nameEn: 'Sharjah', countryAr: 'الإمارات', countryEn: 'United Arab Emirates', latitude: 25.3463, longitude: 55.4209, defaultMethod: 8 },

  // الكويت
  { id: 'kuwait', nameAr: 'مدينة الكويت', nameEn: 'Kuwait City', countryAr: 'الكويت', countryEn: 'Kuwait', latitude: 29.3759, longitude: 47.9774, defaultMethod: 9 },

  // قطر
  { id: 'doha', nameAr: 'الدوحة', nameEn: 'Doha', countryAr: 'قطر', countryEn: 'Qatar', latitude: 25.2854, longitude: 51.5310, defaultMethod: 10 },

  // الأردن وفلسطين
  { id: 'amman', nameAr: 'عمّان', nameEn: 'Amman', countryAr: 'الأردن', countryEn: 'Jordan', latitude: 31.9522, longitude: 35.2332, defaultMethod: 3 },
  { id: 'jerusalem', nameAr: 'القدس الشريف', nameEn: 'Jerusalem', countryAr: 'فلسطين', countryEn: 'Palestine', latitude: 31.7683, longitude: 35.2137, defaultMethod: 3 },
  { id: 'gaza', nameAr: 'غزة', nameEn: 'Gaza', countryAr: 'فلسطين', countryEn: 'Palestine', latitude: 31.5017, longitude: 34.4668, defaultMethod: 3 }
];

export function findCityById(id: string): CityLocation | undefined {
  return ARAB_CITIES_LOCATIONS.find(c => c.id === id);
}

export function findNearestCity(latitude: number, longitude: number): CityLocation {
  let nearest = ARAB_CITIES_LOCATIONS[0];
  let minDistance = Infinity;

  for (const city of ARAB_CITIES_LOCATIONS) {
    const dLat = (city.latitude - latitude) * (Math.PI / 180);
    const dLon = (city.longitude - longitude) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(latitude * (Math.PI / 180)) * Math.cos(city.latitude * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = 6371 * c; // in KM
    if (dist < minDistance) {
      minDistance = dist;
      nearest = city;
    }
  }

  return nearest;
}
