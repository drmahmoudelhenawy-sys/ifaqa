import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class ComingSoonTab extends StatelessWidget {
  final IconData icon;
  final String title;

  const ComingSoonTab({super.key, required this.icon, required this.title});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 84,
              height: 84,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: const Color(0xFFEDE9FE),
                borderRadius: BorderRadius.circular(28),
              ),
              child: Icon(icon, size: 36, color: AppColors.violet600),
            ),
            const SizedBox(height: 20),
            Text(
              title,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppColors.slate800),
            ),
            const SizedBox(height: 8),
            const Text(
              'هذه الشاشة قيد التحويل لفلاتر حاليًا',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate400),
            ),
          ],
        ),
      ),
    );
  }
}
