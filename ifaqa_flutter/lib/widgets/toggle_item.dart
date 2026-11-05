import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class ToggleItem extends StatelessWidget {
  final String label;
  final bool isOn;
  final IconData icon;
  final VoidCallback onTap;

  const ToggleItem({super.key, required this.label, required this.isOn, required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(16)),
        child: Row(
          children: [
            Icon(icon, size: 18, color: isOn ? AppColors.violet600 : AppColors.slate400),
            const SizedBox(width: 10),
            Expanded(child: Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: AppColors.slate700))),
            Switch(
              value: isOn,
              onChanged: (_) => onTap(),
              activeTrackColor: AppColors.violet600,
            ),
          ],
        ),
      ),
    );
  }
}
