import 'dart:async';
import 'package:flutter/gestures.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:just_audio_background/just_audio_background.dart';
import 'models/nav_page.dart';
import 'screens/app_shell_screen.dart';
import 'screens/splash_screen.dart';
import 'services/app_state.dart';
import 'services/home_widget_sync.dart';
import 'services/cloud_service.dart';
import 'services/reminder_service.dart';
import 'siraj/siraj_live_service.dart';
import 'theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AppState.init();
  // Lock-screen / notification controls and background playback.
  if (!kIsWeb) {
    await JustAudioBackground.init(
      androidNotificationChannelId: 'com.ifaqa.app.audio',
      androidNotificationChannelName: 'تلاوات إفاقة',
      androidNotificationOngoing: true,
    );
  }
  // Not awaited: the app must open even when Firebase is slow or offline.
  unawaited(CloudService.instance.init());
  unawaited(ReminderService.instance.init().then((_) => SirajLiveService.instance.init()));
  unawaited(HomeWidgetSync.instance.init());
  runApp(const IfaqaApp());
}

/// Returning users who turned the intro off skip straight to the app.
Widget _firstScreen() {
  final state = AppState.instance;
  if (state.onboarded && !state.flag('show_intro', fallback: true)) {
    return AppShellScreen(initialPage: state.flag('start_with_quran') ? NavPage.quran : NavPage.home);
  }
  return const SplashScreen();
}

class IfaqaApp extends StatelessWidget {
  const IfaqaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'إفاقة',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      // Lets mouse and trackpad users drag horizontal lists (tab rows, logo pickers) on web and desktop.
      scrollBehavior: const MaterialScrollBehavior().copyWith(dragDevices: PointerDeviceKind.values.toSet()),
      locale: const Locale('ar'),
      builder: (context, child) {
        return Directionality(
          textDirection: TextDirection.rtl,
          child: child!,
        );
      },
      home: _firstScreen(),
    );
  }
}
