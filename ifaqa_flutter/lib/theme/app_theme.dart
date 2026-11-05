import 'package:flutter/material.dart';
import 'app_colors.dart';

class AppTheme {
  AppTheme._();

  static ThemeData light() {
    return ThemeData(
      useMaterial3: true,
      fontFamily: 'Cairo',
      // Cairo has no ﷺ (U+FDFA) glyph; Amiri supplies it.
      fontFamilyFallback: const ['Amiri'],
      scaffoldBackgroundColor: AppColors.slate50,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.violet600,
        brightness: Brightness.light,
      ),
      splashFactory: NoSplash.splashFactory,
    );
  }
}
