# حالة تحويل إفاقة لفلاتر

قائمة بكل شاشات/مكونات التطبيق الأصلي (React) وحالة تحويلها لفلاتر. هتتحدث أول بأول.

الرموز: ✅ خلصت · 🟡 شغالين عليها / جزئي · ⬜ لسه ماتعملتش · ❌ ملغية

## الهيكل العام
| الشاشة/المكون الأصلي | الحالة | ملاحظات |
|---|---|---|
| `AppShell.tsx` (الهيدر + شريط الـXP + شريط التبويبات السفلي) | ✅ | `app_shell_screen.dart` — ومعاه شريط الإقامة، والمشغّل العائم، والتنبيه عند الفتح |
| `OnboardingFlow.tsx` | ✅ | `onboarding_screen.dart` |
| `SplashScreen.tsx` | ✅ | `screens/splash_screen.dart` |
| `AuthScreen.tsx` (تسجيل الدخول) | ✅ | `screens/auth_screen.dart` + `services/cloud_service.dart` — نفس مشروع Firebase (`elhenawy-lap`) ونفس المسارات. أندرويد والويب (iOS محتاج GoogleService-Info.plist) |
| تنبيهات الإدارة عند فتح التطبيق (`App.tsx`) | ✅ | `app_shell_screen.dart` — آخر تنبيه نشط، مرة واحدة لكل نص |

## يومي (Home)
| الشاشة/المكون الأصلي | الحالة | ملاحظات |
|---|---|---|
| `HomePage.tsx` | ✅ | `home_tab.dart` — الصلوات والسنن والقيام بـXP، والتنقل بين الأيام. زرار "المتصدرون" و"الصلاة على النبي" كانوا مش بيعملوا حاجة واتصلحوا |
| `PrayerCard.tsx` | ✅ | `widgets/prayer_card.dart` + `widgets/prayer_detail_sheet.dart` |
| `DynamicContent.tsx` | ✅ | `widgets/dynamic_content_card.dart` — حديث/ذكر/حكمة تتبدل من `dynamic_content` |
| `AIToast.tsx` | ❌ | ملغية بقرار صاحب التطبيق (ميزات الذكاء الاصطناعي مش هتتحول) |

## القرآن
| الشاشة/المكون الأصلي | الحالة | ملاحظات |
|---|---|---|
| `QuranDashboard.tsx` | ✅ | `screens/quran_tab.dart` + `services/quran_progress_service.dart` — الفهرس، متابعة القراءة، إحصائيات (اليوم، الأسبوع، أيام متتالية، رسم 7 أيام، الختمات)، وخطة ختمة بعدد أيام مع "متأخر/على الموعد" |
| `QuranReader.tsx` | ✅ | `screens/quran_reader_screen.dart` — مصحف المدينة 604 صفحة SVG. الصفحة بتتحسب بعد 20 ثانية قراءة زي React (+10 XP، تحديات الرَّكْب، وقراءة الكهف يوم الجمعة) |
| `src/components/MushafPage.tsx` وملحقاتها (Ayah*, Tafsir, Iraab, Maani, Mutashabihat...) | ✅ | زر "تفسير الصفحة": لكل آية تبويبات التفسير (6 تفاسير)، الإعراب والجذر لكل كلمة (api.qurani.ai)، معاني المفردات (alfurqan.online)، والمتشابهات. تظليل الآية بلمسها على صفحة الـSVG مش متاح لأن صفحات المصحف صور من غير إحداثيات آيات |
| `src/components/QuranSearchModal.tsx` | ✅ | `screens/quran_search_screen.dart` |
| `src/components/QuranAudioHub/*` (مكتبة الاستماع) | ✅ | `screens/quran_audio_hub_tab.dart` + `services/audio_service.dart` + `services/playlists_service.dart` + `widgets/playlists_view.dart` + `widgets/mini_player.dart` — مشغّل واحد للتطبيق، تشغيل في الخلفية بإشعار وأزرار تحكم وشاشة القفل (`just_audio_background`)، "قوائمي" (إنشاء وترتيب وتشغيل متتابع)، صور القراء، "تابع الاستماع"، دقائق الاستماع، والتنزيل |
| `src/components/RadioPlayer.tsx` | ✅ | `screens/radio_screen.dart` — على نفس المشغّل المشترك |

## الأذكار والورد
| الشاشة/المكون الأصلي | الحالة | ملاحظات |
|---|---|---|
| `AthkarView.tsx` | ✅ | `screens/athkar_screen.dart` |
| `src/components/AzkarCategories.tsx` / `AzkarReader.tsx` | ✅ | ضمن `athkar_screen.dart` |
| `MasbahaPage.tsx` (المسبحة) | ✅ | `screens/masbaha_screen.dart` — ومعاها الاهتزاز والمساهمة في تحديات الرَّكْب |
| `WirdPage.tsx` + `src/components/WirdEvaluationModal.tsx` | ✅ | `screens/wird_screen.dart` |
| `src/components/AthkarReminderModal.tsx` | ✅ | `services/reminder_service.dart` + `reminder_plan.dart` — كل التذكيرات، وزرار "أجّلني ١٠ دقائق" (و٥ دقائق لمنبّه الفجر) بيشتغل والتطبيق مقفول |

## الصلاة
| الشاشة/المكون الأصلي | الحالة | ملاحظات |
|---|---|---|
| `PrayerTimesPage.tsx` | ✅ | `screens/prayer_times_tab.dart` — المواقيت، منبّه الفجر وتخصيصه، و"أيقظني" (`screens/fajr_wake_team_tab.dart`) على فريق فجر الرَّكْب (`ifaqa_fajr_teams`): الرقم يظهر لرفقاء الرَّكْب بس، اتصال وواتساب، و"أنا صحيت" |
| `src/components/FajrWakeGroupsView.tsx` | ❌ | بيستخدم `fajr_wake_groups` اللي القواعد قافلاها على الأدمن (الوثائق فيها الرقم السري)، فهي مش شغالة لغير الأدمن في React كمان. فريق فجر الرَّكْب بيغطي نفس الفكرة |
| `src/components/IqamahBanner.tsx` | ✅ | `widgets/iqamah_banner.dart` |
| `src/components/QiblaCompassPage.tsx` | ✅ | `screens/qibla_compass_tab.dart` |
| `src/components/FajrAlarmHubView.tsx` وملحقاتها | ✅ | `widgets/fajr_alarm_panel.dart` — قبل الأذان أو وقت ثابت، 4 ثيمات (زمردي، ليلي، أرجواني، كهرماني) بمعاينة، والأصوات |
| `FajrCallPage.tsx` | ❌ | الملف في React 5 سطور ومش مستخدم |

## التحديات والمنافسة
| الشاشة/المكون الأصلي | الحالة | ملاحظات |
|---|---|---|
| `ChallengesPage.tsx` | ✅ | `screens/challenges_tab.dart` — اليومية، بانر الصلاة على النبي، الفعاليات، حائط آمين، والغرف |
| `ProphetChallengeModal.tsx` | ✅ | `screens/prophet_challenge_screen.dart` + `services/prophet_challenge_service.dart` — العداد اليومي وتحدي الجمعة (فجر الخميس لمغرب الجمعة بمواقيت الموقع)، هدف شخصي، هدف جماعي، أفضل 10، 4 ثيمات، وXP. الإجمالي الجماعي بيتحسب بمجموع المشاركين لأن `global/totals` مقفول على الأدمن. شغال كضيف محليًا |
| `LeaderboardPage.tsx` | ✅ | `screens/leaderboard_tab.dart` |
| `ClansView.tsx` + `src/components/ClanChat.tsx` | ✅ | `screens/clans_tab.dart`, `clan_features_panels.dart`, `clan_form_screen.dart`, `clan_chat_screen.dart`, `services/clan_service.dart`, `services/clan_features.dart` — كل ما سبق، والختمة الموزعة (حجز الأجزاء وتتبع الصفحات من المصحف)، فوانيس السحر، والتآخي بين الركائب مع المشروع المشترك. ناقص: "علامة الوقوف" اليدوية في الختمة الموزعة |
| `EventsShell.tsx` / `EventCompetitionView.tsx` / `EventLeaderboardPage.tsx` / `MawanEventsPage.tsx` وباقي ملفات الفعاليات | ✅ | `screens/mawan_events_tab.dart`, `event_competition_screen.dart`, `event_editor_screen.dart`, `services/events_service.dart` |

## الحساب والإعدادات
| الشاشة/المكون الأصلي | الحالة | ملاحظات |
|---|---|---|
| `ProfilePage.tsx` | ✅ | `screens/profile_tab.dart` — والإشعارات بتتجدول فعلًا، وزر لوحة الإدارة للأدمن |
| `SupportModal.tsx` | ✅ | `screens/support_sheet.dart` |
| `OfflineSetup.tsx` / `src/components/DownloadsManager.tsx` | ✅ | `screens/downloads_screen.dart` + `services/offline_store/` + `services/tafsir_offline_service.dart` — المصحف، كتب الحديث، التلاوات، والتفاسير الستة (بتكمل من مكان ما وقفت) |
| `AdminPanel.tsx` + `AdminEventModal.tsx` | ✅ | `screens/admin_panel_screen.dart` — المستخدمون، الدعم، الفعاليات، المحتوى، التنبيهات، صور القراء (برابط، من غير رفع ملفات)، والتحديات اليومية (`app_config/daily_challenges`، والتطبيق بيقراها) |
| `AIAnalyst.tsx` / `AIRafiq.tsx` | ❌ | ملغية بقرار صاحب التطبيق |

## الأدوات والويدجتس
| الشاشة/المكون الأصلي | الحالة | ملاحظات |
|---|---|---|
| `src/components/ToolsPage.tsx` | ✅ | `screens/tools_tab.dart` — كل الأدوات بتفتح شاشاتها |
| `src/components/HadithReader.tsx` + `HadithDownloadModal.tsx` | ✅ | `screens/hadith_screen.dart` — والكتب المنزّلة بتشتغل بدون إنترنت |
| `src/components/IslamicCalendarPage.tsx` / `OccasionsPage.tsx` | ✅ | `screens/islamic_calendar_screen.dart` |
| `WidgetSelectionPage.tsx` + `*WidgetPreview.tsx` | ✅ | `android/.../HomeWidgets.kt` + `services/home_widget_sync.dart` — 7 ويدجتس أندرويد: المواقيت، الصلاة على النبي، الختمة، الأذكار، الورد، متابعة الصلوات، والراديو. iOS محتاج Mac وXcode |
| `AmeenWall.tsx` | ✅ | `screens/ameen_wall_tab.dart` |

## أخطاء اتصلحت أثناء التحويل (في المشروع كله)
- **قواعد Firestore:** مساهمات تحديات الرَّكْب كانت بتترفض لأن `members/{uid}/questTotals` و`contributions` مالهمش قاعدة (في React كمان). واتضافت قراءة `dynamic_content` و`announcements` لكل مستخدم مسجّل. **لازم تتنشر:** `firebase deploy --only firestore:rules`.
- **React:** التنبيهات الفورية من لوحة الإدارة كانت بتتسجل `status: 'sent'` فالـCloud Function كانت بتتخطاها وما بيوصلش إشعار.
- **React:** قبول طلب انضمام كان بيحاول يمسح مستند خاص بالمتقدم ممنوع على القائد، فالعملية كلها بتفشل. في Flutter المتقدم بيمسحه بنفسه.
- **سعة الرَّكْب:** `pointsUpdate` في React بيزوّد سعة المعالم على السعة الحالية كل مرة فبتكبر بلا حد؛ في Flutter بتتحسب من 10.
- **التآخي في React:** الطلب والقبول والإلغاء بيكتبوا في مستند الركب التاني، والقواعد بتمنع ده فالعملية بتقف في النص. في Flutter كل قائد بيكتب في ركبه بس ومستند `clan_twins`. ملحوظة: `clan_twins` مفتوح للكتابة لأي مستخدم مسجّل، وده محتاج تشديد.
- **الختمة الموزعة في React:** المستند كان بيتعمل جوه الاشتراك فممكن عضوين يكتبوا فوق بعض، و`completedCount` بيزيد من غير ما يتحسب. اتصلحوا في Flutter.
- **الإحصائيات:** رسم الأيام في تبويب المصحف كان بيطلع برا مساحته لما يكون فيه قراءة.

---
**آخر تحديث (2026-11-17):** اتحول كل المتبقي: أدوات الآية، التفاسير أوفلاين، التشغيل في الخلفية وقوائم التشغيل، منبّه الفجر بوقت ثابت وثيمات، التأجيل، الختمة الموزعة والسحر والتآخي، صور القراء والتحديات في الإدارة، و4 ويدجتس جديدة. 46 اختبار ناجح، وبناء الأندرويد ناجح. المتبقي خارج الكود: نشر قواعد Firestore، الـpush، إعداد iOS، والتجربة على موبايل حقيقي.
