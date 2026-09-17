class SurahInfo {
  final int number;
  final String name;
  final String englishName;
  final int ayahCount;
  final int startPage;
  final bool isMeccan;

  const SurahInfo({
    required this.number,
    required this.name,
    required this.englishName,
    required this.ayahCount,
    required this.startPage,
    required this.isMeccan,
  });
}

class JuzInfo {
  final int number;
  final int startPage;

  const JuzInfo({
    required this.number,
    required this.startPage,
  });
}

class QuranMetadata {
  static const List<SurahInfo> surahs = [
    SurahInfo(number: 1, name: 'الفاتحة', englishName: 'Al-Fatihah', ayahCount: 7, startPage: 1, isMeccan: true),
    SurahInfo(number: 2, name: 'البقرة', englishName: 'Al-Baqarah', ayahCount: 286, startPage: 2, isMeccan: false),
    SurahInfo(number: 3, name: 'آل عمران', englishName: 'Ali Imran', ayahCount: 200, startPage: 50, isMeccan: false),
    SurahInfo(number: 4, name: 'النساء', englishName: 'An-Nisa', ayahCount: 176, startPage: 77, isMeccan: false),
    SurahInfo(number: 5, name: 'المائدة', englishName: 'Al-Ma’idah', ayahCount: 120, startPage: 106, isMeccan: false),
    SurahInfo(number: 6, name: 'الأنعام', englishName: 'Al-An’am', ayahCount: 165, startPage: 128, isMeccan: true),
    SurahInfo(number: 7, name: 'الأعراف', englishName: 'Al-A’raf', ayahCount: 206, startPage: 151, isMeccan: true),
    SurahInfo(number: 8, name: 'الأنفال', englishName: 'Al-Anfal', ayahCount: 75, startPage: 177, isMeccan: false),
    SurahInfo(number: 9, name: 'التوبة', englishName: 'At-Tawbah', ayahCount: 129, startPage: 187, isMeccan: false),
    SurahInfo(number: 10, name: 'يونس', englishName: 'Yunus', ayahCount: 109, startPage: 208, isMeccan: true),
    SurahInfo(number: 11, name: 'هود', englishName: 'Hud', ayahCount: 123, startPage: 221, isMeccan: true),
    SurahInfo(number: 12, name: 'يوسف', englishName: 'Yusuf', ayahCount: 111, startPage: 235, isMeccan: true),
    SurahInfo(number: 13, name: 'الرعد', englishName: 'Ar-Ra’d', ayahCount: 43, startPage: 249, isMeccan: false),
    SurahInfo(number: 14, name: 'إبراهيم', englishName: 'Ibrahim', ayahCount: 52, startPage: 255, isMeccan: true),
    SurahInfo(number: 15, name: 'الحجر', englishName: 'Al-Hijr', ayahCount: 99, startPage: 262, isMeccan: true),
    SurahInfo(number: 16, name: 'النحل', englishName: 'An-Nahl', ayahCount: 128, startPage: 267, isMeccan: true),
    SurahInfo(number: 17, name: 'الإسراء', englishName: 'Al-Isra', ayahCount: 111, startPage: 282, isMeccan: true),
    SurahInfo(number: 18, name: 'الكهف', englishName: 'Al-Kahf', ayahCount: 110, startPage: 293, isMeccan: true),
    SurahInfo(number: 19, name: 'مريم', englishName: 'Maryam', ayahCount: 98, startPage: 305, isMeccan: true),
    SurahInfo(number: 20, name: 'طه', englishName: 'Taha', ayahCount: 135, startPage: 312, isMeccan: true),
    SurahInfo(number: 21, name: 'الأنبياء', englishName: 'Al-Anbiya', ayahCount: 112, startPage: 322, isMeccan: true),
    SurahInfo(number: 22, name: 'الحج', englishName: 'Al-Hajj', ayahCount: 78, startPage: 332, isMeccan: false),
    SurahInfo(number: 23, name: 'المؤمنون', englishName: 'Al-Mu’minun', ayahCount: 118, startPage: 342, isMeccan: true),
    SurahInfo(number: 24, name: 'النور', englishName: 'An-Nur', ayahCount: 64, startPage: 350, isMeccan: false),
    SurahInfo(number: 25, name: 'الفرقان', englishName: 'Al-Furqan', ayahCount: 77, startPage: 359, isMeccan: true),
    SurahInfo(number: 26, name: 'الشعراء', englishName: 'Ash-Shu’ara', ayahCount: 227, startPage: 367, isMeccan: true),
    SurahInfo(number: 27, name: 'النمل', englishName: 'An-Naml', ayahCount: 93, startPage: 377, isMeccan: true),
    SurahInfo(number: 28, name: 'القصص', englishName: 'Al-Qasas', ayahCount: 88, startPage: 385, isMeccan: true),
    SurahInfo(number: 29, name: 'العنكبوت', englishName: 'Al-Ankabut', ayahCount: 69, startPage: 396, isMeccan: true),
    SurahInfo(number: 30, name: 'الروم', englishName: 'Ar-Rum', ayahCount: 60, startPage: 404, isMeccan: true),
    SurahInfo(number: 31, name: 'لقمان', englishName: 'Luqman', ayahCount: 34, startPage: 411, isMeccan: true),
    SurahInfo(number: 32, name: 'السجدة', englishName: 'As-Sajdah', ayahCount: 30, startPage: 415, isMeccan: true),
    SurahInfo(number: 33, name: 'الأحزاب', englishName: 'Al-Ahzab', ayahCount: 73, startPage: 418, isMeccan: false),
    SurahInfo(number: 34, name: 'سبأ', englishName: 'Saba', ayahCount: 54, startPage: 428, isMeccan: true),
    SurahInfo(number: 35, name: 'فاطر', englishName: 'Fatir', ayahCount: 45, startPage: 434, isMeccan: true),
    SurahInfo(number: 36, name: 'يس', englishName: 'Ya-Sin', ayahCount: 83, startPage: 440, isMeccan: true),
    SurahInfo(number: 37, name: 'الصافات', englishName: 'As-Saffat', ayahCount: 182, startPage: 446, isMeccan: true),
    SurahInfo(number: 38, name: 'ص', englishName: 'Sad', ayahCount: 88, startPage: 453, isMeccan: true),
    SurahInfo(number: 39, name: 'الزمر', englishName: 'Az-Zumar', ayahCount: 75, startPage: 458, isMeccan: true),
    SurahInfo(number: 40, name: 'غافر', englishName: 'Ghafir', ayahCount: 85, startPage: 467, isMeccan: true),
    SurahInfo(number: 41, name: 'فصلت', englishName: 'Fussilat', ayahCount: 54, startPage: 477, isMeccan: true),
    SurahInfo(number: 42, name: 'الشورى', englishName: 'Ash-Shura', ayahCount: 53, startPage: 483, isMeccan: true),
    SurahInfo(number: 43, name: 'الزخرف', englishName: 'Az-Zukhruf', ayahCount: 89, startPage: 489, isMeccan: true),
    SurahInfo(number: 44, name: 'الدخان', englishName: 'Ad-Dukhan', ayahCount: 59, startPage: 496, isMeccan: true),
    SurahInfo(number: 45, name: 'الجاثية', englishName: 'Al-Jathiyah', ayahCount: 37, startPage: 499, isMeccan: true),
    SurahInfo(number: 46, name: 'الأحقاف', englishName: 'Al-Ahqaf', ayahCount: 35, startPage: 502, isMeccan: true),
    SurahInfo(number: 47, name: 'محمد', englishName: 'Muhammad', ayahCount: 38, startPage: 507, isMeccan: false),
    SurahInfo(number: 48, name: 'الفتح', englishName: 'Al-Fath', ayahCount: 29, startPage: 511, isMeccan: false),
    SurahInfo(number: 49, name: 'الحجرات', englishName: 'Al-Hujurat', ayahCount: 18, startPage: 515, isMeccan: false),
    SurahInfo(number: 50, name: 'ق', englishName: 'Qaf', ayahCount: 45, startPage: 518, isMeccan: true),
    SurahInfo(number: 51, name: 'الذاريات', englishName: 'Adh-Dhariyat', ayahCount: 60, startPage: 520, isMeccan: true),
    SurahInfo(number: 52, name: 'الطور', englishName: 'At-Tur', ayahCount: 49, startPage: 523, isMeccan: true),
    SurahInfo(number: 53, name: 'النجم', englishName: 'An-Najm', ayahCount: 62, startPage: 526, isMeccan: true),
    SurahInfo(number: 54, name: 'القمر', englishName: 'Al-Qamar', ayahCount: 55, startPage: 528, isMeccan: true),
    SurahInfo(number: 55, name: 'الرحمن', englishName: 'Ar-Rahman', ayahCount: 78, startPage: 531, isMeccan: false),
    SurahInfo(number: 56, name: 'الواقعة', englishName: 'Al-Waqi’ah', ayahCount: 96, startPage: 534, isMeccan: true),
    SurahInfo(number: 57, name: 'الحديد', englishName: 'Al-Hadid', ayahCount: 29, startPage: 537, isMeccan: false),
    SurahInfo(number: 58, name: 'المجادلة', englishName: 'Al-Mujadilah', ayahCount: 22, startPage: 542, isMeccan: false),
    SurahInfo(number: 59, name: 'الحشر', englishName: 'Al-Hashr', ayahCount: 24, startPage: 545, isMeccan: false),
    SurahInfo(number: 60, name: 'الممتحنة', englishName: 'Al-Mumtahanah', ayahCount: 13, startPage: 549, isMeccan: false),
    SurahInfo(number: 61, name: 'الصف', englishName: 'As-Saff', ayahCount: 14, startPage: 551, isMeccan: false),
    SurahInfo(number: 62, name: 'الجمعة', englishName: 'Al-Jumu’ah', ayahCount: 11, startPage: 553, isMeccan: false),
    SurahInfo(number: 63, name: 'المنافقون', englishName: 'Al-Munafiqun', ayahCount: 11, startPage: 554, isMeccan: false),
    SurahInfo(number: 64, name: 'التغابن', englishName: 'At-Taghabun', ayahCount: 18, startPage: 556, isMeccan: false),
    SurahInfo(number: 65, name: 'الطلاق', englishName: 'At-Talaq', ayahCount: 12, startPage: 558, isMeccan: false),
    SurahInfo(number: 66, name: 'التحريم', englishName: 'At-Tahrim', ayahCount: 12, startPage: 560, isMeccan: false),
    SurahInfo(number: 67, name: 'الملك', englishName: 'Al-Mulk', ayahCount: 30, startPage: 562, isMeccan: true),
    SurahInfo(number: 68, name: 'القلم', englishName: 'Al-Qalam', ayahCount: 52, startPage: 564, isMeccan: true),
    SurahInfo(number: 69, name: 'الحاقة', englishName: 'Al-Haqqah', ayahCount: 52, startPage: 566, isMeccan: true),
    SurahInfo(number: 70, name: 'المعارج', englishName: 'Al-Ma’arij', ayahCount: 44, startPage: 568, isMeccan: true),
    SurahInfo(number: 71, name: 'نوح', englishName: 'Nuh', ayahCount: 28, startPage: 570, isMeccan: true),
    SurahInfo(number: 72, name: 'الجن', englishName: 'Al-Jinn', ayahCount: 28, startPage: 572, isMeccan: true),
    SurahInfo(number: 73, name: 'المزمل', englishName: 'Al-Muzzammil', ayahCount: 20, startPage: 574, isMeccan: true),
    SurahInfo(number: 74, name: 'المدثر', englishName: 'Al-Muddaththir', ayahCount: 56, startPage: 575, isMeccan: true),
    SurahInfo(number: 75, name: 'القيامة', englishName: 'Al-Qiyamah', ayahCount: 40, startPage: 577, isMeccan: true),
    SurahInfo(number: 76, name: 'الإنسان', englishName: 'Al-Insan', ayahCount: 31, startPage: 578, isMeccan: false),
    SurahInfo(number: 77, name: 'المرسلات', englishName: 'Al-Mursalat', ayahCount: 50, startPage: 580, isMeccan: true),
    SurahInfo(number: 78, name: 'النبأ', englishName: 'An-Naba', ayahCount: 40, startPage: 582, isMeccan: true),
    SurahInfo(number: 79, name: 'النازعات', englishName: 'An-Nazi’at', ayahCount: 46, startPage: 583, isMeccan: true),
    SurahInfo(number: 80, name: 'عبس', englishName: 'Abasa', ayahCount: 42, startPage: 585, isMeccan: true),
    SurahInfo(number: 81, name: 'التكوير', englishName: 'At-Takwir', ayahCount: 29, startPage: 586, isMeccan: true),
    SurahInfo(number: 82, name: 'الانفطار', englishName: 'Al-Infitar', ayahCount: 19, startPage: 587, isMeccan: true),
    SurahInfo(number: 83, name: 'المطففين', englishName: 'Al-Mutaffifin', ayahCount: 36, startPage: 587, isMeccan: true),
    SurahInfo(number: 84, name: 'الانشقاق', englishName: 'Al-Inshiqaq', ayahCount: 25, startPage: 589, isMeccan: true),
    SurahInfo(number: 85, name: 'البروج', englishName: 'Al-Buruj', ayahCount: 22, startPage: 590, isMeccan: true),
    SurahInfo(number: 86, name: 'الطارق', englishName: 'At-Tariq', ayahCount: 17, startPage: 591, isMeccan: true),
    SurahInfo(number: 87, name: 'الأعلى', englishName: 'Al-A’la', ayahCount: 19, startPage: 591, isMeccan: true),
    SurahInfo(number: 88, name: 'الغاشية', englishName: 'Al-Ghashiyah', ayahCount: 26, startPage: 592, isMeccan: true),
    SurahInfo(number: 89, name: 'الفجر', englishName: 'Al-Fajr', ayahCount: 30, startPage: 593, isMeccan: true),
    SurahInfo(number: 90, name: 'البلد', englishName: 'Al-Balad', ayahCount: 20, startPage: 594, isMeccan: true),
    SurahInfo(number: 91, name: 'الشمس', englishName: 'Ash-Shams', ayahCount: 15, startPage: 595, isMeccan: true),
    SurahInfo(number: 92, name: 'الليل', englishName: 'Al-Layl', ayahCount: 21, startPage: 595, isMeccan: true),
    SurahInfo(number: 93, name: 'الضحى', englishName: 'Ad-Duha', ayahCount: 11, startPage: 596, isMeccan: true),
    SurahInfo(number: 94, name: 'الشرح', englishName: 'Ash-Sharh', ayahCount: 8, startPage: 596, isMeccan: true),
    SurahInfo(number: 95, name: 'التين', englishName: 'At-Tin', ayahCount: 8, startPage: 597, isMeccan: true),
    SurahInfo(number: 96, name: 'العلق', englishName: 'Al-Alaq', ayahCount: 19, startPage: 597, isMeccan: true),
    SurahInfo(number: 97, name: 'القدر', englishName: 'Al-Qadr', ayahCount: 5, startPage: 598, isMeccan: true),
    SurahInfo(number: 98, name: 'البينة', englishName: 'Al-Bayyinah', ayahCount: 8, startPage: 598, isMeccan: false),
    SurahInfo(number: 99, name: 'الزلزلة', englishName: 'Az-Zalzalah', ayahCount: 8, startPage: 599, isMeccan: false),
    SurahInfo(number: 100, name: 'العاديات', englishName: 'Al-Adiyat', ayahCount: 11, startPage: 599, isMeccan: true),
    SurahInfo(number: 101, name: 'القارعة', englishName: 'Al-Qari’ah', ayahCount: 11, startPage: 600, isMeccan: true),
    SurahInfo(number: 102, name: 'التكاثر', englishName: 'At-Takathur', ayahCount: 8, startPage: 600, isMeccan: true),
    SurahInfo(number: 103, name: 'العصر', englishName: 'Al-Asr', ayahCount: 3, startPage: 601, isMeccan: true),
    SurahInfo(number: 104, name: 'الهمزة', englishName: 'Al-Humazah', ayahCount: 9, startPage: 601, isMeccan: true),
    SurahInfo(number: 105, name: 'الفيل', englishName: 'Al-Fil', ayahCount: 5, startPage: 601, isMeccan: true),
    SurahInfo(number: 106, name: 'قريش', englishName: 'Quraysh', ayahCount: 4, startPage: 602, isMeccan: true),
    SurahInfo(number: 107, name: 'الماعون', englishName: 'Al-Ma’un', ayahCount: 7, startPage: 602, isMeccan: true),
    SurahInfo(number: 108, name: 'الكوثر', englishName: 'Al-Kawthar', ayahCount: 3, startPage: 602, isMeccan: true),
    SurahInfo(number: 109, name: 'الكافرون', englishName: 'Al-Kafirun', ayahCount: 6, startPage: 603, isMeccan: true),
    SurahInfo(number: 110, name: 'النصر', englishName: 'An-Nasr', ayahCount: 3, startPage: 603, isMeccan: false),
    SurahInfo(number: 111, name: 'المسد', englishName: 'Al-Masad', ayahCount: 5, startPage: 603, isMeccan: true),
    SurahInfo(number: 112, name: 'الإخلاص', englishName: 'Al-Ikhlas', ayahCount: 4, startPage: 604, isMeccan: true),
    SurahInfo(number: 113, name: 'الفلق', englishName: 'Al-Falaq', ayahCount: 5, startPage: 604, isMeccan: true),
    SurahInfo(number: 114, name: 'الناس', englishName: 'An-Nas', ayahCount: 6, startPage: 604, isMeccan: true),
  ];

  static const List<JuzInfo> juzs = [
    JuzInfo(number: 1, startPage: 1),
    JuzInfo(number: 2, startPage: 22),
    JuzInfo(number: 3, startPage: 42),
    JuzInfo(number: 4, startPage: 62),
    JuzInfo(number: 5, startPage: 82),
    JuzInfo(number: 6, startPage: 102),
    JuzInfo(number: 7, startPage: 121),
    JuzInfo(number: 8, startPage: 142),
    JuzInfo(number: 9, startPage: 162),
    JuzInfo(number: 10, startPage: 182),
    JuzInfo(number: 11, startPage: 201),
    JuzInfo(number: 12, startPage: 222),
    JuzInfo(number: 13, startPage: 242),
    JuzInfo(number: 14, startPage: 262),
    JuzInfo(number: 15, startPage: 282),
    JuzInfo(number: 16, startPage: 302),
    JuzInfo(number: 17, startPage: 322),
    JuzInfo(number: 18, startPage: 342),
    JuzInfo(number: 19, startPage: 362),
    JuzInfo(number: 20, startPage: 382),
    JuzInfo(number: 21, startPage: 402),
    JuzInfo(number: 22, startPage: 422),
    JuzInfo(number: 23, startPage: 442),
    JuzInfo(number: 24, startPage: 462),
    JuzInfo(number: 25, startPage: 482),
    JuzInfo(number: 26, startPage: 502),
    JuzInfo(number: 27, startPage: 522),
    JuzInfo(number: 28, startPage: 542),
    JuzInfo(number: 29, startPage: 562),
    JuzInfo(number: 30, startPage: 582),
  ];

  static SurahInfo getSurahByPage(int page) {
    for (int i = surahs.length - 1; i >= 0; i--) {
      if (surahs[i].startPage <= page) {
        return surahs[i];
      }
    }
    return surahs.first;
  }

  static int getJuzByPage(int page) {
    for (int i = juzs.length - 1; i >= 0; i--) {
      if (juzs[i].startPage <= page) {
        return juzs[i].number;
      }
    }
    return 1;
  }
}
