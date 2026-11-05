import 'package:flutter/material.dart';
import '../models/nav_page.dart';
import '../services/app_state.dart';
import 'app_shell_screen.dart';
import 'onboarding_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  bool _left = false;

  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(seconds: 2), _proceed);
  }

  void _proceed() {
    if (!mounted || _left) return;
    _left = true;
    final state = AppState.instance;
    final Widget next = state.onboarded
        ? AppShellScreen(initialPage: state.flag('start_with_quran') ? NavPage.quran : NavPage.home)
        : const OnboardingScreen();
    Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => next));
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _proceed,
      child: Directionality(
        textDirection: TextDirection.rtl,
        child: Scaffold(
          body: Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Color(0xFF1E1B4B), Color(0xFF0F172A), Color(0xFF020617)],
              ),
            ),
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 140,
                    height: 140,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white.withValues(alpha: 0.08),
                    ),
                    child: Image.asset('assets/images/logo-colored.png', width: 100, height: 100),
                  ),
                  const SizedBox(height: 20),
                  const Text('إفاقة', style: TextStyle(color: Colors.white, fontSize: 40, fontWeight: FontWeight.w900)),
                  const SizedBox(height: 10),
                  Text('أيقظ قلبك', style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 4)),
                  const SizedBox(height: 30),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.05),
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                    ),
                    child: Text('أهلاً بك في إفاقة', style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 11, fontWeight: FontWeight.bold)),
                  ),
                  const SizedBox(height: 8),
                  Text('انقر في أي مكان للمتابعة فورًا', style: TextStyle(color: Colors.white.withValues(alpha: 0.4), fontSize: 9, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
