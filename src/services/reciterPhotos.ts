import { EXTENDED_RECITER_PHOTOS } from './recitersMapping';
import { reciterCustomPhotosService } from './reciterCustomPhotosService';

export interface ReciterPhotoMeta {
  name: string;
  photoUrl: string;
  slug?: string;
  initials?: string;
}

export const RECITER_PHOTO_MAPPING: Record<string, string> = {
  // كبار قراء العصر الذهبي ودولة التلاوة المصرية
  'محمد صديق المنشاوي': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Elminshwey.jpg/330px-Elminshwey.jpg',
  'محمود خليل الحصري': 'https://upload.wikimedia.org/wikipedia/commons/7/70/Hussary.jpg',
  'عبد الباسط عبد الصمد': 'https://upload.wikimedia.org/wikipedia/ar/thumb/7/73/%D8%B5%D9%88%D8%B1%D8%A9_%D8%B4%D8%AE%D8%B5%D9%8A%D8%A9_%D8%B9%D8%A8%D8%AF_%D8%A7%D9%84%D8%A8%D8%A7%D8%B3%D8%B7_%D8%B9%D8%A8%D8%AF_%D8%A7%D9%84%D8%B5%D9%85%D8%AF.png/330px-%D8%B5%D9%88%D8%B1%D8%A9_%D8%B4%D8%AE%D8%B5%D9%8A%D8%A9_%D8%B9%D8%A8%D8%AF_%D8%A7%D9%84%D8%A8%D8%A7%D8%B3%D8%B7_%D8%B9%D8%A8%D8%AF_%D8%A7%D9%84%D8%B5%D9%85%D8%AF.png',
  'عبدالباسط عبدالصمد': 'https://upload.wikimedia.org/wikipedia/ar/thumb/7/73/%D8%B5%D9%88%D8%B1%D8%A9_%D8%B4%D8%AE%D8%B5%D9%8A%D8%A9_%D8%B9%D8%A8%D8%AF_%D8%A7%D9%84%D8%A8%D8%A7%D8%B3%D8%B7_%D8%B9%D8%A8%D8%AF_%D8%A7%D9%84%D8%B5%D9%85%D8%AF.png/330px-%D8%B5%D9%88%D8%B1%D8%A9_%D8%B4%D8%AE%D8%B5%D9%8A%D8%A9_%D8%B9%D8%A8%D8%AF_%D8%A7%D9%84%D8%A8%D8%A7%D8%B3%D8%B7_%D8%B9%D8%A8%D8%AF_%D8%A7%D9%84%D8%B5%D9%85%D8%AF.png',
  'محمد محمود الطبلاوي': 'https://upload.wikimedia.org/wikipedia/ar/0/08/%D9%85%D8%AD%D9%85%D8%AF_%D8%A7%D9%84%D8%B7%D8%A8%D9%84%D8%A7%D9%88%D9%8A.jpeg',
  'محمد الطبلاوي': 'https://upload.wikimedia.org/wikipedia/ar/0/08/%D9%85%D8%AD%D9%85%D8%AF_%D8%A7%D9%84%D8%B7%D8%A8%D9%84%D8%A7%D9%88%D9%8A.jpeg',
  'محمود علي البنا': 'https://upload.wikimedia.org/wikipedia/ar/2/21/%D9%85%D8%AD%D9%85%D8%AF_%D8%B9%D9%84%D9%8A_%D8%A7%D9%84%D8%A8%D9%86%D8%A7.jpg',
  'مصطفى إسماعيل': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Mostafa_Ismaeel.jpg/330px-Mostafa_Ismaeel.jpg',
  'محمد رفعت': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Great_Rifat.jpg/330px-Great_Rifat.jpg',
  'كامل يوسف البهتيمي': 'https://upload.wikimedia.org/wikipedia/ar/9/91/%D9%83%D8%A7%D9%85%D9%84_%D9%8A%D9%88%D8%B3%D9%81_%D8%A7%D9%84%D8%A8%D9%87%D8%AA%D9%8A%D9%85%D9%8A.jpg',
  'أحمد نعينع': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/DrAhmedNeinaa.jpg/330px-DrAhmedNeinaa.jpg',
  'شعبان الصياد': 'https://upload.wikimedia.org/wikipedia/ar/7/7c/%D8%B4%D8%B9%D8%A8%D8%A7%D9%86_%D8%A7%D9%84%D8%B5%D9%8A%D8%A7%D8%AF.jpg',
  'علي حجاج السويسي': 'https://upload.wikimedia.org/wikipedia/ar/thumb/f/fd/%D8%B9%D9%84%D9%8A_%D8%AD%D8%AC%D8%A7%D8%AC_%D8%A7%D9%84%D8%B3%D9%88%D9%8A%D8%B3%D9%8A.jpg/330px-%D8%B9%D9%84%D9%8A_%D8%AD%D8%AC%D8%A7%D8%AC_%D8%A7%D9%84%D8%B3%D9%88%D9%8A%D8%B3%D9%8A.jpg',
  'أحمد عيسى المعصراوي': 'https://upload.wikimedia.org/wikipedia/ar/e/e0/%D8%A3%D8%AD%D9%85%D8%AF_%D8%B9%D9%8A%D8%B3%D9%89_%D8%A7%D9%84%D9%85%D8%B9%D8%B5%D8%B1%D8%A7%D9%88%D9%8A.jpg',
  'عبدالله كامل': 'https://upload.wikimedia.org/wikipedia/ar/d/d8/%D8%B9%D8%A8%D8%AF_%D8%A7%D9%84%D9%84%D9%87_%D8%A7%D8%AD%D9%85%D8%AF_%D9%83%D8%A7%D9%85%D9%84.jpeg',
  'محمد رشاد الشريف': 'https://upload.wikimedia.org/wikipedia/ar/7/7d/%D9%85%D8%AD%D9%85%D8%AF_%D8%B1%D8%B4%D8%A7%D8%AF_%D8%A7%D9%84%D8%B4%D8%B1%D9%8A%D9%81.jpg',
  'محمد جبريل': 'https://upload.wikimedia.org/wikipedia/ar/9/96/%D9%85%D8%AD%D9%85%D8%AF_%D8%AC%D8%A8%D8%B1%D9%8A%D9%84.jpg',

  // قراء الحرمين الشريفين والخليج العربي
  'مشاري راشد العفاسي': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/%D0%9C%D0%B8%D1%88%D0%B0%D1%80%D0%B8_%D0%A0%D0%B0%D1%88%D0%B8%D0%B4.jpg/330px-%D0%9C%D0%B8%D1%88%D0%B0%D1%80%D0%B8_%D0%A0%D0%B0%D1%88%D0%B8%D0%B4.jpg',
  'مشاري العفاسي': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/%D0%9C%D0%B8%D1%88%D0%B0%D1%80%D0%B8_%D0%A0%D0%B0%D1%88%D0%B8%D0%B4.jpg/330px-%D0%9C%D0%B8%D1%88%D0%B0%D1%80%D0%B8_%D0%A0%D0%B0%D1%88%D0%B8%D0%B4.jpg',
  'عبد الرحمن السديس': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Abdul-Rahman_Al-Sudais_%28Cropped%2C_2011%29.jpg/330px-Abdul-Rahman_Al-Sudais_%28Cropped%2C_2011%29.jpg',
  'عبدالرحمن السديس': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Abdul-Rahman_Al-Sudais_%28Cropped%2C_2011%29.jpg/330px-Abdul-Rahman_Al-Sudais_%28Cropped%2C_2011%29.jpg',
  'سعود الشريم': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Saud_Shuraim_doing_the_Khutbah.png/330px-Saud_Shuraim_doing_the_Khutbah.png',
  'ماهر المعيقلي': 'https://upload.wikimedia.org/wikipedia/commons/9/90/Maher_Al_Mueaqly.png',
  'ياسر الدوسري': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Yasser_Al-Dosari_%28cropped%29.jpg/330px-Yasser_Al-Dosari_%28cropped%29.jpg',
  'عبد الله الجهني': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Abdullah_Al_Juhany_%28Cropped%29.png/330px-Abdullah_Al_Juhany_%28Cropped%29.png',
  'عبدالله عواد الجهني': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Abdullah_Al_Juhany_%28Cropped%29.png/330px-Abdullah_Al_Juhany_%28Cropped%29.png',
  'بندر بليلة': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Bandar_Baleela.jpg/330px-Bandar_Baleela.jpg',
  'بندر بليله': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Bandar_Baleela.jpg/330px-Bandar_Baleela.jpg',
  'عبد الله البعيجان': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Abdullah_Al-Baijan.jpg/330px-Abdullah_Al-Baijan.jpg',
  'عبدالله البعيجان': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Abdullah_Al-Baijan.jpg/330px-Abdullah_Al-Baijan.jpg',
  'علي الحذيفي': 'https://upload.wikimedia.org/wikipedia/commons/d/d7/Huthaify.jpg',
  'علي بن عبدالرحمن الحذيفي': 'https://upload.wikimedia.org/wikipedia/commons/d/d7/Huthaify.jpg',
  'عبد المحسن القاسم': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/%D8%A7%D9%84%D8%B4%D9%8A%D8%AE_%D8%B9%D8%A8%D8%AF%D8%A7%D9%84%D9%85%D8%AD%D8%B3%D9%86_%D8%A7%D9%84%D9%82%D8%A7%D8%B3%D9%85.jpg/330px-%D8%A7%D9%84%D8%B4%D9%8A%D8%AE_%D8%B9%D8%A8%D8%AF%D8%A7%D9%84%D9%85%D8%AD%D8%B3%D9%86_%D8%A7%D9%84%D9%82%D8%A7%D8%B3%D9%85.jpg',
  'عبدالمحسن القاسم': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/%D8%A7%D9%84%D8%B4%D9%8A%D8%AE_%D8%B9%D8%A8%D8%AF%D8%A7%D9%84%D9%85%D8%AD%D8%B3%D9%86_%D8%A7%D9%84%D9%82%D8%A7%D8%B3%D9%85.jpg/330px-%D8%A7%D9%84%D8%B4%D9%8A%D8%AE_%D8%B9%D8%A8%D8%AF%D8%A7%D9%84%D9%85%D8%AD%D8%B3%D9%86_%D8%A7%D9%84%D9%82%D8%A7%D8%B3%D9%85.jpg',
  'صلاح البدير': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Salah_Ibn_Mohammed_Al_Budair.jpg/330px-Salah_Ibn_Mohammed_Al_Budair.jpg',
  'صالح آل طالب': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/%D8%B5%D9%88%D8%B1%D8%A9_%D8%B4%D8%AE%D8%B5%D9%8A%D8%A9_%D8%B5%D8%A7%D9%84%D8%AD_%D8%A2%D9%84_%D8%B7%D8%A7%D9%84%D8%A8.jpg/330px-%D8%B5%D9%88%D8%B1%D8%A9_%D8%B4%D8%AE%D8%B5%D9%8A%D8%A9_%D8%B5%D8%A7%D9%84%D8%AD_%D8%A2%D9%84_%D8%B7%D8%A7%D9%84%D8%A8.jpg',
  'إبراهيم الأخضر': 'https://upload.wikimedia.org/wikipedia/commons/d/d7/Huthaify.jpg',
  'إبراهيم الجبرين': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Abdulaziz_alzahrani.jpg/330px-Abdulaziz_alzahrani.jpg',
  'علي جابر': 'https://upload.wikimedia.org/wikipedia/ar/9/9e/%D8%B9%D9%84%D9%8A_%D8%AC%D8%A7%D8%A8%D8%B1.jpg',
  'محمد أيوب': 'https://upload.wikimedia.org/wikipedia/ar/6/6f/Muhammad_ayop.jpeg',
  'محمد خليل القارئ': 'https://upload.wikimedia.org/wikipedia/ar/thumb/d/d9/%D9%85%D8%AD%D9%85%D8%AF_%D8%AE%D9%84%D9%8A%D9%84_%D8%A7%D9%84%D9%82%D8%A7%D8%B1%D8%A6.jpg/330px-%D9%85%D8%AD%D9%85%D8%AF_%D8%AE%D9%84%D9%8A%D9%84_%D8%A7%D9%84%D9%82%D8%A7%D8%B1%D8%A6.jpg',
  'عادل الكلباني': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Kalbani.jpg/330px-Kalbani.jpg',
  'عبدالله خياط': 'https://upload.wikimedia.org/wikipedia/ar/thumb/6/67/%D8%B9%D8%A8%D8%AF_%D8%A7%D9%84%D9%84%D9%88_%D8%B9%D8%A8%D8%AF_%D8%A7%D9%84%D8%BA%D9%86%D9%8A_%D8%AE%D9%8A%D8%A7%D8%B7.jpg/330px-%D8%B9%D8%A8%D8%AF_%D8%A7%D9%84%D9%84%D9%87_%D8%B9%D8%A8%D8%AF_%D8%A7%D9%84%D8%BA%D9%86%D9%8A_%D8%AE%D9%8A%D8%A7%D8%B7.jpg',
  'عبدالله المطرود': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Abdullah_Al_Matroud.jpg/330px-Abdullah_Al_Matroud.jpg',
  'عبدالعزيز الأحمد': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/%D8%B5%D9%88%D8%B1%D8%A9_%D8%B4%D8%AE%D8%B5%D9%8A%D8%A9_%D8%B9%D8%A8%D8%AF_%D8%A7%D9%84%D8%B9%D8%B2%D9%8A%D8%B2_%D8%A7%D9%84%D8%A3%D8%AD%D9%85%D8%AF.jpg/330px-%D8%B5%D9%88%D8%B1%D8%A9_%D8%B4%D8%AE%D8%B5%D9%8A%D8%A9_%D8%B9%D8%A8%D8%AF_%D8%A7%D9%84%D8%B9%D8%B2%D9%8A%D8%B2_%D8%A7%D9%84%D8%A3%D8%AD%D9%85%D8%AF.jpg',
  'عبدالعزيز الزهراني': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Abdulaziz_alzahrani.jpg/330px-Abdulaziz_alzahrani.jpg',
  'عادل ريان': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/%D8%A7%D9%84%D8%B4%D9%8A%D8%AE_%D8%B9%D8%A8%D8%AF%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D9%86_2013-11-02_16-56.jpg/330px-%D8%A7%D9%84%D8%B4%D9%8A%D8%AE_%D8%B9%D8%A8%D8%AF%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D9%86_2013-11-02_16-56.jpg',
  'سعد الغامدي': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Saad_al_Ghamdi.jpg/330px-Saad_al_Ghamdi.jpg',
  'أحمد العجمي': 'https://upload.wikimedia.org/wikipedia/ar/a/a7/%D8%A3%D8%AD%D9%85%D8%AF_%D8%A7%D9%84%D8%B9%D8%AC%D9%85%D9%8A.jpg',
  'أبو بكر الشاطري': 'https://upload.wikimedia.org/wikipedia/ar/2/24/%D8%A3%D8%A8%D9%88_%D8%A8%D9%83%D8%B1_%D8%A7%D9%84%D8%B4%D8%A7%D8%B7%D8%B1%D9%8A.jpg',
  'ناصر القطامي': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/%D8%B5%D9%88%D8%B1%D8%A9_%D8%B4%D8%AE%D8%B5%D9%8A%D8%A9_%D8%A7%D9%84%D8%B4%D9%8A%D8%AE_%D9%86%D8%A7%D8%B5%D8%B1_%D8%A7%D9%84%D9%82%D8%B7%D8%A7%D9%85%D9%8A.jpg/330px-%D8%B5%D9%88%D8%B1%D8%A9_%D8%B4%D8%AE%D8%B5%D9%8A%D8%A9_%D8%A7%D9%84%D8%B4%D9%8A%D8%AE_%D9%86%D8%A7%D8%B5%D8%B1_%D8%A7%D9%84%D9%82%D8%B7%D8%A7%D9%85%D9%8A.jpg',
  'إدريس أبكر': 'https://upload.wikimedia.org/wikipedia/ar/d/d4/%D8%A5%D8%AF%D8%B1%D9%8A%D8%B3_%D8%A3%D8%A8%D9%83%D8%B1.jpg',
  'خالد الجليل': 'https://upload.wikimedia.org/wikipedia/ar/9/90/%D8%AE%D8%A7%D9%84%D8%AF_%D8%A7%D9%84%D8%AC%D9%84%D9%8A%D9%84.jpg',
  'فارس عباد': 'https://upload.wikimedia.org/wikipedia/ar/1/16/%D9%81%D8%A7%D8%B1%D8%B3_%D8%B9%D8%A8%D8%A7%D8%AF.jpg',
  'صلاح بو خاطر': 'https://upload.wikimedia.org/wikipedia/ar/5/52/%D8%B5%D9%84%D8%A7%D8%AD_%D8%A8%D9%88_%D8%AE%D8%A7%D8%B7%D8%B1.jpg',
  'هزاع البلوشي': 'https://upload.wikimedia.org/wikipedia/commons/5/50/%D9%87%D8%B2%D8%A7%D8%B9_%D8%A7%D9%84%D8%A8%D9%84%D9%88%D8%B4%D9%8A.jpg',
  'بدر التركي': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Photo_of_badr_al-turki_in_2023.jpg/330px-Photo_of_badr_al-turki_in_2023.jpg',
  'سلمان المطيري': 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=400&q=80',
  'سلمان عبيد المطيري': 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=400&q=80',

  'فهد الكندري': 'https://upload.wikimedia.org/wikipedia/ar/1/12/%D9%81%D9%87%D8%AF_%D8%A7%D9%84%D9%83%D9%86%D8%AF%D8%B1%D9%8A.jpg',
  'شيرزاد عبدالرحمن طاهر': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/%D8%A7%D9%84%D8%B4%D9%8A%D8%AE_%D8%A7%D9%84%D9%85%D9%82%D8%B1%D8%A6_%D8%B4%D9%8A%D8%B1%D8%B2%D8%A7%D8%AF_%D8%B9%D8%A8%D8%AF%D8%A7%D9%84%D8%B1%D8%AD%D9%85%D9%86_%D8%B7%D8%A7%D9%87%D8%B1_%D8%A7%D9%84%D8%A3%D9%85%D9%8A%D9%86_%D8%A7%D9%84%D8%B9%D8%A7%D9%85_%D9%84%D9%85%D8%AC%D9%85%D8%B9_%D8%A7%D9%84%D9%82%D8%B1%D8%A7%D9%86_%D8%A7%D9%84%D9%83%D8%B1%D9%8A%D9%85_%D8%A8%D8%A7%D9%84%D8%B4%D8%A7%D8%B1%D9%82%D8%A9.jpg/330px-%D8%A7%D9%84%D8%B4%D9%8A%D8%AE_%D8%A7%D9%84%D9%85%D9%82%D8%B1%D8%A6_%D8%B4%D9%8A%D8%B1%D8%B2%D8%A7%D8%AF_%D8%B9%D8%A8%D8%AF%D8%A7%D9%84%D8%B1%D8%AD%D9%85%D9%86_%D8%B7%D8%A7%D9%87%D8%B1_%D8%A7%D9%84%D8%A3%D9%85%D9%8A%D9%86_%D8%A7%D9%84%D8%B9%D8%A7%D9%85_%D9%84%D9%85%D8%AC%D9%85%D8%B9_%D8%A7%D9%84%D9%82%D8%B1%D8%A7%D9%86_%D8%A7%D9%84%D9%83%D8%B1%D9%8A%D9%85_%D8%A8%D8%A7%D9%84%D8%B4%D8%A7%D8%B1%D9%82%D8%A9.jpg',

  // قراء المغرب العربي وروايتي ورش وقالون
  'العيون الكوشي': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/%D8%B5%D9%88%D8%B1%D8%A9_%D9%84%D9%84%D9%82%D8%A7%D8%B1%D8%A6_%D8%A7%D9%84%D8%B4%D9%8A%D8%AE_%D8%A7%D9%84%D8%B9%D9%8A%D9%88%D9%86_%D8%A7%D9%84%D9%83%D9%88%D8%B4%D9%8A.jpeg/330px-%D8%B5%D9%88%D8%B1%D8%A9_%D9%84%D9%84%D9%82%D8%A7%D8%B1%D8%A6_%D8%A7%D9%84%D8%B4%D9%8A%D8%AE_%D8%A7%D9%84%D8%B9%D9%8A%D9%88%D9%86_%D8%A7%D9%84%D9%83%D9%88%D8%B4%D9%8A.jpeg',
  'مصطفى رعد العزاوي': 'https://upload.wikimedia.org/wikipedia/ar/3/38/%D9%85%D8%B5%D8%B7%D9%81%D9%8A_%D8%B1%D8%B9%D8%AF_%D8%A7%D9%84%D8%B9%D8%B2%D8%A7%D9%88%D9%8A.jpg',

  // قراء السودان واليمن وإفريقيا والعالم
  'الزين محمد أحمد': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/%D8%A7%D9%84%D8%B2%D9%8A%D9%86_%D9%85%D8%AD%D9%85%D8%AF_%D8%A3%D8%AD%D9%85%D8%AF.png/330px-%D8%A7%D9%84%D8%B2%D9%8A%D9%86_%D9%85%D8%AD%D9%85%D8%AF_%D8%A3%D8%AD%D9%85%D8%AF.png',
  'عبد الرحمن مسعد': 'https://upload.wikimedia.org/wikipedia/commons/e/ec/Abdulrahman_Mossad.jpg',
  'إسلام صبحي': 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Islam_Sobhi.jpg',
  'وديع اليمني': 'https://upload.wikimedia.org/wikipedia/ar/4/4e/%D9%88%D8%AF%D9%8A%D8%B9_%D8%A7%D9%84%D9%8A%D9%85%D9%86%D9%8A.jpg',
  'عكاشة كميني': 'https://upload.wikimedia.org/wikipedia/commons/6/6b/Okasha_Kameny.jpg',
};

// Slugs matching Quran.com image repository
export const RECITER_SLUG_MAPPING: Record<string, string> = {
  'محمد صديق المنشاوي': 'minshawi',
  'مشاري راشد العفاسي': 'afasy',
  'مشاري العفاسي': 'afasy',
  'محمود خليل الحصري': 'husary',
  'عبد الباسط عبد الصمد': 'abdulbaset',
  'عبدالباسط عبدالصمد': 'abdulbaset',
  'عبد الرحمن السديس': 'sudais',
  'عبدالرحمن السديس': 'sudais',
  'سعود الشريم': 'shuraym',
  'ماهر المعيقلي': 'muaiqly',
  'ياسر الدوسري': 'dosari',
  'سعد الغامدي': 'ghamadi',
  'أحمد العجمي': 'ajmy',
  'أبو بكر الشاطري': 'shatri',
  'علي جابر': 'jaber',
  'محمد أيوب': 'ayyoub',
  'عبد الله الجهني': 'juhany',
  'عبدالله عواد الجهني': 'juhany',
  'بندر بليلة': 'baleela',
  'بندر بليله': 'baleela',
  'ناصر القطامي': 'qatami',
  'صلاح البدير': 'budair',
  'عبد المحسن القاسم': 'qasim',
  'عبدالمحسن القاسم': 'qasim',
  'علي الحذيفي': 'huthaify',
  'علي بن عبدالرحمن الحذيفي': 'huthaify',
  'عادل الكلباني': 'kalbani',
  'محمد الطبلاوي': 'tablawi',
  'محمد محمود الطبلاوي': 'tablawi',
};

/**
 * Resolves the most accurate photo URL for a given reciter name
 */
export function getReciterPhotoByName(name: string): string {
  if (!name) return '';
  const cleanName = name.trim();

  // 0. Cloud Custom Admin Photo Override (takes highest precedence)
  const custom = reciterCustomPhotosService.getCustomPhoto(cleanName);
  if (custom) {
    return custom;
  }

  // 1. Direct verified match in local dictionary
  if (RECITER_PHOTO_MAPPING[cleanName]) {
    return RECITER_PHOTO_MAPPING[cleanName];
  }
  if (EXTENDED_RECITER_PHOTOS[cleanName]) {
    return EXTENDED_RECITER_PHOTOS[cleanName];
  }

  // 2. Substring match
  for (const [key, url] of Object.entries(RECITER_PHOTO_MAPPING)) {
    if (cleanName.includes(key) || key.includes(cleanName)) {
      return url;
    }
  }
  for (const [key, url] of Object.entries(EXTENDED_RECITER_PHOTOS)) {
    if (cleanName.includes(key) || key.includes(cleanName)) {
      return url;
    }
  }

  // 3. Quran.com image CDN slug match
  for (const [key, slug] of Object.entries(RECITER_SLUG_MAPPING)) {
    if (cleanName.includes(key) || key.includes(cleanName)) {
      return `https://raw.githubusercontent.com/quran/quran.com-images/master/reciters/${slug}.jpg`;
    }
  }

  return '';
}

/**
 * Extracts initials for monogram fallback
 */
export function getReciterInitials(name: string): string {
  if (!name) return 'ق';
  const clean = name
    .replace(/الشيخ\s+/g, '')
    .replace(/القارئ\s+/g, '')
    .replace(/د\.\s*/g, '')
    .trim();

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]} ${parts[1][0]}`;
  }
  return clean[0] || 'ق';
}

/**
 * Returns clean 1-2 words for Islamic Calligraphic Badge fallback
 */
export function getReciterBadgeName(name: string): { title: string; subtitle?: string } {
  if (!name) return { title: 'قارئ' };
  const clean = name
    .replace(/الشيخ\s+/g, '')
    .replace(/القارئ\s+/g, '')
    .replace(/د\.\s*/g, '')
    .trim();

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return { title: parts[0] };
  }
  if (parts[0] === 'عبد' && parts.length >= 2) {
    const abdulName = `عبد ${parts[1]}`;
    const rest = parts.slice(2, 3).join(' ');
    return { title: abdulName, subtitle: rest || undefined };
  }
  return { title: parts[0], subtitle: parts.slice(1, 2).join(' ') || undefined };
}
