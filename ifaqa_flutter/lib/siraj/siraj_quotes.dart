/// Bundled short nafahat shown by Siraj when no dynamic content is available.
enum SirajQuoteSource { quran, hadith }

class SirajQuote {
  final SirajQuoteSource source;
  final String text;
  final String reference;
  const SirajQuote(this.source, this.text, this.reference);
}

const List<SirajQuote> sirajBundledQuotes = [
  SirajQuote(
    SirajQuoteSource.quran,
    '﴿أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ﴾',
    'الرعد ٢٨',
  ),
  SirajQuote(
    SirajQuoteSource.quran,
    '﴿فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ۝ إِنَّ مَعَ الْعُسْرِ يُسْرًا﴾',
    'الشرح ٥-٦',
  ),
  SirajQuote(
    SirajQuoteSource.quran,
    '﴿وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ﴾',
    'الطلاق ٣',
  ),
  SirajQuote(
    SirajQuoteSource.quran,
    '﴿فَاذْكُرُونِي أَذْكُرْكُمْ﴾',
    'البقرة ١٥٢',
  ),
  SirajQuote(
    SirajQuoteSource.quran,
    '﴿وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ﴾',
    'البقرة ٤٥',
  ),
  SirajQuote(
    SirajQuoteSource.quran,
    '﴿رَبِّ اشْرَحْ لِي صَدْرِي ۝ وَيَسِّرْ لِي أَمْرِي﴾',
    'طه ٢٥-٢٦',
  ),
  SirajQuote(
    SirajQuoteSource.quran,
    '﴿وَقُل رَّبِّ زِدْنِي عِلْمًا﴾',
    'طه ١١٤',
  ),
  SirajQuote(
    SirajQuoteSource.quran,
    '﴿إِنَّ اللَّهَ مَعَ الصَّابِرِينَ﴾',
    'البقرة ١٥٣',
  ),
  SirajQuote(
    SirajQuoteSource.quran,
    '﴿وَهُوَ مَعَكُمْ أَيْنَ مَا كُنتُمْ﴾',
    'الحديد ٤',
  ),
  SirajQuote(
    SirajQuoteSource.quran,
    '﴿لَا تَحْزَنْ إِنَّ اللَّهَ مَعَنَا﴾',
    'التوبة ٤٠',
  ),
  SirajQuote(
    SirajQuoteSource.quran,
    '﴿وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰ﴾',
    'الضحى ٥',
  ),
  SirajQuote(
    SirajQuoteSource.quran,
    '﴿حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ﴾',
    'آل عمران ١٧٣',
  ),
  SirajQuote(SirajQuoteSource.hadith, '«إنما الأعمال بالنيات»', 'متفق عليه'),
  SirajQuote(SirajQuoteSource.hadith, '«الكلمة الطيبة صدقة»', 'متفق عليه'),
  SirajQuote(
    SirajQuoteSource.hadith,
    '«تبسمك في وجه أخيك صدقة»',
    'رواه الترمذي',
  ),
  SirajQuote(
    SirajQuoteSource.hadith,
    '«خيركم من تعلم القرآن وعلمه»',
    'رواه البخاري',
  ),
  SirajQuote(
    SirajQuoteSource.hadith,
    '«أحب الأعمال إلى الله أدومها وإن قل»',
    'متفق عليه',
  ),
  SirajQuote(SirajQuoteSource.hadith, '«الدين النصيحة»', 'رواه مسلم'),
  SirajQuote(SirajQuoteSource.hadith, '«الطهور شطر الإيمان»', 'رواه مسلم'),
  SirajQuote(
    SirajQuoteSource.hadith,
    '«اتق الله حيثما كنت، وأتبع السيئة الحسنة تمحها»',
    'رواه الترمذي',
  ),
  SirajQuote(
    SirajQuoteSource.hadith,
    '«المسلم من سلم المسلمون من لسانه ويده»',
    'متفق عليه',
  ),
  SirajQuote(
    SirajQuoteSource.hadith,
    '«كلمتان خفيفتان على اللسان، ثقيلتان في الميزان: سبحان الله وبحمده، سبحان الله العظيم»',
    'متفق عليه',
  ),
];
