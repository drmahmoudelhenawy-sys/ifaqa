# حالة تحويل إفاقة لفلاتر

قائمة بكل شاشات/مكونات التطبيق الأصلي (React) وحالة تحويلها لفلاتر. هتتحدث أول بأول.

الرموز: ✅ خلصت · 🟡 شغالين عليها / جزئي · ⬜ لسه ماتعملتش · ❌ ملغية

## الهيكل العام
| الشاشة/المكون الأصلي | الحالة | ملاحظات |
|---|---|---|
| `AppShell.tsx` (الهيدر + شريط الـXP + شريط التبويبات السفلي) | ✅ | `app_shell_screen.dart` |
| `OnboardingFlow.tsx` | ✅ | `onboarding_screen.dart` |
| `SplashScreen.tsx` | ✅ | `screens/splash_screen.dart` — أول شاشة تفتح، تختفي تلقائيًا أو بالنقر |
| `AuthScreen.tsx` (تسجيل الدخول) | ⬜ | يحتاج ربط Firebase Auth فعلي |

## يومي (Home)
| الشاشة/المكون الأصلي | الحالة | ملاحظات |
|---|---|---|
| `HomePage.tsx` | ✅ | `home_tab.dart` — الصلوات والسنن والقيام بتتحفظ لكل يوم وبتحسب XP (نفس قواعد `XP_RULES`)، والتنقل بين الأيام بيعرض سجل اليوم ده |
| `PrayerCard.tsx` | ✅ | `widgets/prayer_card.dart` + `widgets/prayer_detail_sheet.dart` |
| `DynamicContent.tsx` | ⬜ | |
| `AIToast.tsx` | ❌ | ملغية بقرار صاحب التطبيق (ميزات الذكاء الاصطناعي مش هتتحول) |

## القرآن
| الشاشة/المكون الأصلي | الحالة | ملاحظات |
|---|---|---|
| `QuranDashboard.tsx` | 🟡 | `screens/quran_tab.dart` — فهرس 114 سورة + بحث بالاسم، بطاقة "متابعة القراءة" من آخر صفحة، زر البحث في الآيات. ناقص: وضع الختمة والإحصائيات |
| `QuranReader.tsx` / `src/components/QuranReader.tsx` | ✅ | `screens/quran_reader_screen.dart` — مصحف المدينة 604 صفحة SVG من [batoulapps/quran-svg](https://github.com/batoulapps/quran-svg) (MIT، مثبت على commit) عبر jsDelivr؛ تقليب، تكبير، انتقال لصفحة، السورة والجزء في الهيدر، حفظ آخر صفحة، تخزين على الجهاز في الموبايل. حل محل `qcf_quran_plus` اللي كانت بتفشل على الويب. ناقص: لمس الآية لعرض تفسيرها داخل الصفحة |
| `src/components/MushafPage.tsx` وملحقاتها (Ayah*, Tafsir, Iraab, Maani, Mutashabihat...) | ⬜ | |
| `src/components/QuranSearchModal.tsx` | ✅ | `screens/quran_search_screen.dart` — بحث في نص القرآن (alquran.cloud، نسخة `quran-simple-clean` بدل `all/ar` اللي كانت بترجّع نصوص تفسير)، التفسير الميسر (quran.com)، وفتح الآية في صفحتها بالمصحف |
| `src/components/QuranAudioHub/*` (مكتبة الاستماع) | ✅ | `screens/quran_audio_hub_tab.dart` — قائمة قراء حقيقية من mp3quran.net API، تشغيل صوت حقيقي لأي سورة عبر `just_audio`. لسه ناقص: قوائم تشغيل مخصصة، إحصائيات الاستماع، والمشغل العائم |
| `src/components/RadioPlayer.tsx` | ✅ | `screens/radio_screen.dart` — تشغيل صوت حقيقي عبر `just_audio` (نفس روابط البث المباشر الأصلية + قراء mp3quran.net API)، بحث، تبويبين (قراء/مباشر). البث المباشر اتأكد إنه بيحمّل ويوصل الاتصال؛ استعلام API القراء قد يحتاج فحص CORS على الويب |

## الأذكار والورد
| الشاشة/المكون الأصلي | الحالة | ملاحظات |
|---|---|---|
| `AthkarView.tsx` | ✅ | `screens/athkar_screen.dart` + `widgets/zekr_card.dart` + `data/athkar_data.dart` — صباح/مساء/أحوال، كروت وقائمة، تكبير خط، نسخ. مربوطة بأزرار الأذكار في Home |
| `src/components/AzkarCategories.tsx` / `AzkarReader.tsx` | ✅ | مغطاة ضمن `athkar_screen.dart` (شبكة الفئات + قارئ الفئة) |
| `MasbahaPage.tsx` (المسبحة) | ✅ | `screens/masbaha_screen.dart` — العداد والثيم والأذكار المخصصة بتتحفظ |
| `WirdPage.tsx` + `src/components/WirdEvaluationModal.tsx` | ✅ | `screens/wird_screen.dart` — الورد ونقاط الضعف بيتحفظوا، والإنجاز بيتصفر كل يوم جديد، وكل ورد مكتمل +150 XP |
| `src/components/AthkarReminderModal.tsx` | ⬜ | |

## الصلاة
| الشاشة/المكون الأصلي | الحالة | ملاحظات |
|---|---|---|
| `PrayerTimesPage.tsx` | 🟡 | `screens/prayer_times_tab.dart` — مواقيت حقيقية بمكتبة `adhan` (طريقة الهيئة المصرية) حسب موقع GPS أو القاهرة افتراضيًا، عداد للصلاة القادمة (مع الانتقال لفجر اليوم التالي)، التسجيل مشترك مع الرئيسية. ناقص: منبّه الفجر/التخصيص/أيقظني |
| `src/components/IqamahBanner.tsx` | ⬜ | |
| `src/components/QiblaCompassPage.tsx` | 🟡 | `screens/qibla_compass_tab.dart` — اتجاه القبلة والمسافة من موقع GPS الحقيقي. ناقص: دوران البوصلة مع حساس الاتجاه في الموبايل |
| `src/components/FajrAlarmHubView.tsx` وملحقاتها (Customize/Preview/Settings/WakeGroups/WakeSync) | ⬜ | placeholder داخل تبويبات الصلاة |
| `FajrCallPage.tsx` | ⬜ | |

## التحديات والمنافسة
| الشاشة/المكون الأصلي | الحالة | ملاحظات |
|---|---|---|
| `ChallengesPage.tsx` | 🟡 | `screens/challenges_tab.dart` — التحديات اليومية بتتحفظ لكل يوم وبتضيف XP؛ الفعاليات والغرف لسه placeholder (محتاجين Firebase) |
| `ProphetChallengeModal.tsx` | ⬜ | |
| `LeaderboardPage.tsx` | ✅ | `screens/leaderboard_tab.dart` — 3 تبويبات: المتصدرين (بوديوم + قائمة، بيانات وهمية)، الأوسمة (شبكة أوسمة مقفولة/مفتوحة)، الدروع والرتب (كل الرتب الـ6 مع وصفها وتمييز رتبتك الحالية) |
| `ClansView.tsx` + `src/components/ClanChat.tsx` | ⬜ | |
| `EventsShell.tsx` / `EventsIntro.tsx` / `EventCompetitionView.tsx` / `EventDetailView.tsx` / `EventLeaderboardPage.tsx` / `EventProfilePage.tsx` / `EventChallengesPage.tsx` / `MawanEventsPage.tsx` | ⬜ | مناسبات/فعاليات مؤقتة |

## الحساب والإعدادات
| الشاشة/المكون الأصلي | الحالة | ملاحظات |
|---|---|---|
| `ProfilePage.tsx` | 🟡 | `screens/profile_tab.dart` — الاسم واللقب والنمط وكل التفضيلات بتتحفظ؛ "عرض شاشة الترحيب" و"فتح المصحف تلقائيًا" شغالين فعلًا؛ تصفير النقاط شغال. الإشعارات بتتحفظ بس لسه مش بتتبعت (محتاجة `flutter_local_notifications`) |
| `SupportModal.tsx` | ✅ | `screens/support_sheet.dart` — شات دعم محلي مع رد تلقائي، إرسال باسمك/مجهول. مربوطة بزرار في البروفايل |
| `OfflineSetup.tsx` / `src/components/DownloadsManager.tsx` | 🟡 | `screens/downloads_screen.dart` — تنزيل المصحف كامل للقراءة أوفلاين (موبايل)، مع إيقاف ومتابعة. ناقص: التفاسير والتلاوات وكتب الحديث |
| `AdminPanel.tsx` + `AdminEventModal.tsx` | ⬜ | (للأدمن فقط، أولوية أقل) |
| `AIAnalyst.tsx` / `AIRafiq.tsx` | ❌ | ملغية بقرار صاحب التطبيق (ميزات الذكاء الاصطناعي مش هتتحول) |

## الأدوات والويدجتس
| الشاشة/المكون الأصلي | الحالة | ملاحظات |
|---|---|---|
| `src/components/ToolsPage.tsx` | ✅ | `screens/tools_tab.dart` — بحث حي + قائمة الأدوات؛ "المسبحة" بتفتح الشاشة الحقيقية، الباقي بوتوم شيت "قيد التحويل" |
| `src/components/HadithReader.tsx` + `HadithDownloadModal.tsx` | ✅ | `screens/hadith_screen.dart` — يجيب بيانات حقيقية من نفس API (hadith-api عبر jsDelivr): 6 كتب (البخاري/مسلم/أبو داود/الترمذي/النسائي/ابن ماجه)، بحث، وعرض تفصيلي مع نسخ. جُرّب وشغال فعليًا. التنزيل للأوفلاين لسه مش متحول |
| `src/services/hadithService.ts` / `hadithConfig.ts` | ✅ | `services/hadith_service.dart` |
| `src/components/IslamicCalendarPage.tsx` | ✅ | `screens/islamic_calendar_screen.dart` — تحويل هجري/ميلادي حقيقي (خوارزمية تقويمية)، شبكة شهر تفاعلية، تمييز الجمعة والأيام البيض، قائمة المناسبات القادمة بالعد التنازلي، وضبط الإزاحة. مربوطة بـ"التقويم والمناسبات" في الأدوات |
| `OccasionsPage.tsx` | ✅ | مغطاة ضمن `islamic_calendar_screen.dart` (قائمة "المناسبات القادمة" بحساب حقيقي بدل تواريخ ثابتة) |
| `WidgetSelectionPage.tsx` + `*WidgetPreview.tsx` (Azkar/Counter/Prayer/Radio/Salat/Tracker) | ⬜ | ويدجتس الشاشة الرئيسية للموبايل |
| `AmeenWall.tsx` | ✅ | `screens/ameen_wall_tab.dart` — نشر دعاء (باسمك/مجهول)، تأمين، عداد المؤمّنين. مربوطة بتبويب "حائط آمين" داخل التحديات |

---
**آخر تحديث:** المصحف بقى شغال (مصحف المدينة SVG)، والبيانات بتتحفظ على الجهاز (`services/app_state.dart`)، والمواقيت والقبلة بقت حقيقية بالموقع. اتصلحت إعدادات أندرويد: إذن الإنترنت (كان ناقص فكل الشبكة كانت هتفشل في نسخة release)، إذن الموقع، اسم التطبيق، و`applicationId` رجع `com.ifaqa.app` زي نسخة Capacitor، والتوقيع بيقرا من `android/key.properties`. زر الوضع الليلي اتشال لحد ما يتعمل ثيم ليلي حقيقي. المتبقي: الإشعارات ومنبّه الفجر، حساس البوصلة، وكل اللي محتاج Firebase (تسجيل الدخول، المتصدرين الحقيقيين، حائط آمين المشترك، العشائر والفعاليات، لوحة الإدارة).
