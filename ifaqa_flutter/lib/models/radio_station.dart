enum RadioCategory { reciters, live }

class RadioStation {
  final int id;
  final String name;
  final String url;
  final String? subtitle;
  final RadioCategory category;

  const RadioStation({required this.id, required this.name, required this.url, this.subtitle, required this.category});
}

const List<RadioStation> liveStations = [
  RadioStation(id: 9004, name: 'إذاعة القرآن الكريم - القاهرة', subtitle: 'بث إذاعي مباشر من القاهرة على مدار الساعة', url: 'https://stream.radiojar.com/8s5u5tpdtwzuv', category: RadioCategory.live),
  RadioStation(id: 9001, name: 'تلاوات الحرم المكي (مباشر)', subtitle: 'بث مباشر من رحاب المسجد الحرام', url: 'https://stream.radiojar.com/0tpy1h0kxtzuv', category: RadioCategory.live),
  RadioStation(id: 9002, name: 'المسجد النبوي الشريف (مباشر)', subtitle: 'بث مباشر من المسجد النبوي بالمدينة المنورة', url: 'https://qurango.net/radio/salma', category: RadioCategory.live),
  RadioStation(id: 9005, name: 'إذاعة التراتيل القرآنية (24 ساعة)', subtitle: 'أجمل التلاوات الخاشعة المتواصلة', url: 'https://qurango.net/radio/tarateel', category: RadioCategory.live),
  RadioStation(id: 9006, name: 'إذاعة الأذكار والرقية الشرعية', subtitle: 'أذكار الصباح والمساء والرقية الشرعية', url: 'https://qurango.net/radio/athkar_sabah_masaa', category: RadioCategory.live),
  RadioStation(id: 9007, name: 'إذاعة كبار القراء (تلاوات خاشعة)', subtitle: 'تلاوات مختارة لأشهر قراء العالم الإسلامي', url: 'https://qurango.net/radio/mix', category: RadioCategory.live),
  RadioStation(id: 9008, name: 'إذاعة تفسير القرآن الكريم', subtitle: 'تفسير وبيان معاني الآيات العظيمة', url: 'https://qurango.net/radio/tafseer', category: RadioCategory.live),
];
