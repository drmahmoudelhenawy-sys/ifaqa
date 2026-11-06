import 'package:flutter/material.dart';
import '../models/app_mode.dart';
import '../services/app_state.dart';
import '../theme/app_colors.dart';
import 'app_shell_screen.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  int step = 0;
  AppMode mode = AppMode.full;

  void _finish() {
    AppState.instance.completeOnboarding(mode);
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const AppShellScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    switch (step) {
      case 0:
        return _buildWelcomeStep();
      case 1:
        return _buildSadqaStep();
      default:
        return _buildCommitmentStep();
    }
  }

  Widget _buildWelcomeStep() {
    return Scaffold(
      backgroundColor: AppColors.slate50,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),
              Image.asset(
                'assets/images/logo-colored.png',
                width: 140,
                height: 140,
              ),
              const SizedBox(height: 16),
              const Text(
                'أهلاً بك في إفاقة',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.w900,
                  color: AppColors.slate800,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'اختر نمط الاستخدام المفضل لديك',
                style: TextStyle(color: AppColors.slate500),
              ),
              const SizedBox(height: 32),
              _ModeCard(
                selected: mode == AppMode.full,
                accent: AppColors.violet600,
                accentBg: const Color(0xFFEDE9FE),
                icon: Icons.bolt,
                badgeText: 'موصى به',
                title: 'النمط الكامل',
                description:
                    'تحديات يومية، نقاط XP، مستويات، لوحة متصدرين، ومنافسة في الخير.',
                onTap: () => setState(() => mode = AppMode.full),
              ),
              const SizedBox(height: 16),
              _ModeCard(
                selected: mode == AppMode.lite,
                accent: AppColors.emerald500,
                accentBg: AppColors.emerald50,
                icon: Icons.dark_mode,
                badgeText: 'تم الاختيار',
                title: 'النمط الهادئ',
                description: 'تركيز خالص على العبادة بدون أي مشتتات، أرقام، أو منافسة.',
                onTap: () => setState(() => mode = AppMode.lite),
              ),
              const Spacer(),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.slate900,
                    padding: const EdgeInsets.symmetric(vertical: 18),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(18),
                    ),
                  ),
                  onPressed: () => setState(() => step = 1),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        'حفظ والمتابعة',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      SizedBox(width: 8),
                      Icon(Icons.arrow_back, color: Colors.white, size: 20),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSadqaStep() {
    return Scaffold(
      backgroundColor: AppColors.emerald900,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.08),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.favorite, size: 80, color: AppColors.emerald400),
              ),
              const SizedBox(height: 32),
              const Text(
                'صدقة جارية',
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'هذا التطبيق وقف لله تعالى عن أموات المسلمين والأحياء. نسأل الله أن يتقبله خالصاً لوجهه الكريم.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 18,
                  height: 1.8,
                  color: AppColors.emerald100,
                ),
              ),
              const SizedBox(height: 48),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 18),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(18),
                    ),
                  ),
                  onPressed: () => setState(() => step = 2),
                  child: const Text(
                    'تقبل الله',
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.bold,
                      color: AppColors.emerald900,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCommitmentStep() {
    return Scaffold(
      backgroundColor: AppColors.slate900,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(28),
                decoration: BoxDecoration(
                  color: AppColors.orange500.withValues(alpha: 0.2),
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.orange500.withValues(alpha: 0.3)),
                ),
                child: const Icon(Icons.error_outline, size: 80, color: AppColors.orange500),
              ),
              const SizedBox(height: 32),
              const Text(
                'أنت رقيب نفسك',
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFFFB923C),
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                '"ألم يعلم بأن الله يرى"\nالغش لن يفيدك في الآخرة.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 18,
                  height: 1.8,
                  color: AppColors.slate300,
                ),
              ),
              const SizedBox(height: 48),
              SizedBox(
                width: double.infinity,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(18),
                    gradient: const LinearGradient(
                      colors: [AppColors.orange500, AppColors.rose600],
                    ),
                  ),
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      borderRadius: BorderRadius.circular(18),
                      onTap: _finish,
                      child: const Padding(
                        padding: EdgeInsets.symmetric(vertical: 18),
                        child: Text(
                          'عاهدت نفسي',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ModeCard extends StatelessWidget {
  final bool selected;
  final Color accent;
  final Color accentBg;
  final IconData icon;
  final String badgeText;
  final String title;
  final String description;
  final VoidCallback onTap;

  const _ModeCard({
    required this.selected,
    required this.accent,
    required this.accentBg,
    required this.icon,
    required this.badgeText,
    required this.title,
    required this.description,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(24),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: selected ? accent : Colors.transparent,
            width: 2,
          ),
          boxShadow: selected
              ? [
                  BoxShadow(
                    color: accent.withValues(alpha: 0.15),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ]
              : null,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                if (selected)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: accent,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.check_circle, size: 10, color: Colors.white),
                        const SizedBox(width: 4),
                        Text(
                          badgeText,
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  )
                else
                  const SizedBox.shrink(),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: accentBg,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Icon(icon, color: accent, size: 24),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              title,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w900,
                color: AppColors.slate800,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              description,
              textAlign: TextAlign.right,
              style: const TextStyle(
                fontSize: 12,
                height: 1.6,
                color: AppColors.slate500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
