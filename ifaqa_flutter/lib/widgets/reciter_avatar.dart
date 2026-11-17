import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Round reciter picture. Shows [photoUrl] when one is known (admin-managed
/// reciter photos), otherwise a person icon.
class ReciterAvatar extends StatelessWidget {
  final String? photoUrl;
  final double size;
  const ReciterAvatar({super.key, this.photoUrl, this.size = 42});

  @override
  Widget build(BuildContext context) {
    final fallback = Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(color: const Color(0xFFEEF2FF), borderRadius: BorderRadius.circular(size * 0.33)),
      child: Icon(Icons.person, color: AppColors.indigo600, size: size * 0.48),
    );
    final url = photoUrl;
    if (url == null || url.isEmpty) return fallback;
    return ClipRRect(
      borderRadius: BorderRadius.circular(size * 0.33),
      child: Image.network(url, width: size, height: size, fit: BoxFit.cover, errorBuilder: (_, _, _) => fallback),
    );
  }
}
