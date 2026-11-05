import 'package:flutter/material.dart';
import '../models/masbaha_theme.dart';
import '../services/app_state.dart';
import '../theme/app_colors.dart';

const List<String> _defaultZekrList = [
  'سبحان الله',
  'الحمد لله',
  'الله أكبر',
  'لا إله إلا الله',
  'أستغفر الله',
  'اللهم صل على محمد',
  'لا حول ولا قوة إلا بالله',
];

class MasbahaScreen extends StatefulWidget {
  const MasbahaScreen({super.key});

  @override
  State<MasbahaScreen> createState() => _MasbahaScreenState();
}

class _MasbahaScreenState extends State<MasbahaScreen> {
  final AppState _state = AppState.instance;
  late int count = _state.number('masbaha_count');
  late MasbahaTheme theme = masbahaThemes[_state.number('masbaha_theme').clamp(0, masbahaThemes.length - 1)];
  late List<String> customList = List<String>.of(_state.strings('masbaha_custom'));
  late String selectedZekr = _initialZekr();
  bool animate = false;
  final TextEditingController newZekrController = TextEditingController();

  List<String> get activeList => [..._defaultZekrList, ...customList];

  String _initialZekr() {
    final saved = _state.text('masbaha_zekr');
    return saved != null && activeList.contains(saved) ? saved : _defaultZekrList.first;
  }

  /// Saves after every change so nothing is lost if the app is killed mid-tasbih.
  @override
  void setState(VoidCallback fn) {
    super.setState(fn);
    _state.setNumber('masbaha_count', count);
    _state.setNumber('masbaha_theme', masbahaThemes.indexOf(theme));
    _state.setStrings('masbaha_custom', customList);
    _state.setText('masbaha_zekr', selectedZekr);
  }

  @override
  void dispose() {
    newZekrController.dispose();
    super.dispose();
  }

  void _handleTap() {
    setState(() {
      count++;
      animate = true;
    });
    Future.delayed(const Duration(milliseconds: 150), () {
      if (mounted) setState(() => animate = false);
    });
  }

  Future<void> _resetCounter() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => Directionality(
        textDirection: TextDirection.rtl,
        child: AlertDialog(
          title: const Text('تصفير العداد؟'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('إلغاء')),
            TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('تصفير')),
          ],
        ),
      ),
    );
    if (confirmed == true) setState(() => count = 0);
  }

  void _openSettings() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => StatefulBuilder(
        builder: (context, setSheetState) => Directionality(
          textDirection: TextDirection.rtl,
          child: DraggableScrollableSheet(
            initialChildSize: 0.85,
            minChildSize: 0.5,
            maxChildSize: 0.95,
            expand: false,
            builder: (context, scrollController) => Container(
              decoration: const BoxDecoration(
                color: Color(0xFF0B1120),
                borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
              ),
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      InkWell(
                        onTap: () => Navigator.pop(context),
                        borderRadius: BorderRadius.circular(999),
                        child: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(color: AppColors.slate800, shape: BoxShape.circle),
                          child: const Icon(Icons.arrow_forward, color: Colors.white70, size: 18),
                        ),
                      ),
                      const Text('إعدادات المسبحة', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 18)),
                    ],
                  ),
                  const SizedBox(height: 20),
                  const Text('المظهر والثيم', style: TextStyle(color: AppColors.slate400, fontWeight: FontWeight.w900, fontSize: 11)),
                  const SizedBox(height: 10),
                  GridView.count(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisCount: 2,
                    mainAxisSpacing: 8,
                    crossAxisSpacing: 8,
                    childAspectRatio: 3,
                    children: masbahaThemes.map((t) {
                      final selected = theme.id == t.id;
                      return InkWell(
                        onTap: () {
                          setState(() => theme = t);
                          setSheetState(() {});
                        },
                        borderRadius: BorderRadius.circular(16),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                          decoration: BoxDecoration(
                            color: selected ? AppColors.violet600.withValues(alpha: 0.2) : const Color(0xFF0F172A),
                            border: Border.all(color: selected ? AppColors.violet500 : AppColors.slate800),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 26,
                                height: 26,
                                decoration: BoxDecoration(
                                  color: t.solid,
                                  gradient: t.gradient,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(child: Text(t.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12))),
                              if (selected) const Icon(Icons.check_circle, color: AppColors.violet400, size: 16),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 20),
                  const Text('قائمة الأذكار', style: TextStyle(color: AppColors.slate400, fontWeight: FontWeight.w900, fontSize: 11)),
                  const SizedBox(height: 10),
                  Expanded(
                    child: ListView(
                      controller: scrollController,
                      children: [
                        ...activeList.map((z) {
                          final selected = selectedZekr == z;
                          final isCustom = customList.contains(z);
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: InkWell(
                              onTap: () {
                                setState(() => selectedZekr = z);
                                Navigator.pop(context);
                              },
                              borderRadius: BorderRadius.circular(16),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                decoration: BoxDecoration(
                                  gradient: selected ? const LinearGradient(colors: [AppColors.violet600, AppColors.indigo600]) : null,
                                  color: selected ? null : const Color(0xFF0F172A),
                                  border: Border.all(color: selected ? Colors.transparent : AppColors.slate800),
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                child: Row(
                                  children: [
                                    Expanded(child: Text(z, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13))),
                                    if (isCustom)
                                      InkWell(
                                        onTap: () {
                                          setState(() {
                                            customList.remove(z);
                                            if (selectedZekr == z) selectedZekr = _defaultZekrList.first;
                                          });
                                          setSheetState(() {});
                                        },
                                        child: const Icon(Icons.delete_outline, color: Color(0xFFFB7185), size: 18),
                                      ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        }),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: newZekrController,
                                style: const TextStyle(color: Colors.white, fontSize: 13),
                                decoration: InputDecoration(
                                  hintText: 'أضف ذكرًا مخصصًا...',
                                  hintStyle: const TextStyle(color: AppColors.slate500, fontSize: 12),
                                  filled: true,
                                  fillColor: const Color(0xFF0F172A),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: AppColors.slate800)),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            InkWell(
                              onTap: () {
                                final trimmed = newZekrController.text.trim();
                                if (trimmed.isEmpty) return;
                                setState(() => customList.add(trimmed));
                                newZekrController.clear();
                                setSheetState(() {});
                              },
                              borderRadius: BorderRadius.circular(16),
                              child: Container(
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  gradient: const LinearGradient(colors: [AppColors.violet600, AppColors.indigo600]),
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                child: const Icon(Icons.add, color: Colors.white, size: 18),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        body: Container(
          decoration: BoxDecoration(color: theme.solid, gradient: theme.gradient),
          child: SafeArea(
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _circleButton(Icons.arrow_forward, () => Navigator.of(context).pop()),
                      const Text('المسبحة', style: TextStyle(color: Colors.white70, fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 2)),
                      _circleButton(Icons.tune, _openSettings),
                    ],
                  ),
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const SizedBox(height: 8),
                        Container(
                          width: double.infinity,
                          constraints: const BoxConstraints(maxWidth: 360),
                          padding: const EdgeInsets.all(24),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(40),
                            border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                          ),
                          child: Column(
                            children: [
                              const Text('الذكر المختار', style: TextStyle(color: Colors.white60, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 2)),
                              const SizedBox(height: 10),
                              Text(
                                selectedZekr,
                                textAlign: TextAlign.center,
                                style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900, height: 1.4),
                              ),
                              const SizedBox(height: 12),
                              Container(height: 1, color: Colors.white.withValues(alpha: 0.2)),
                              const SizedBox(height: 12),
                              AnimatedScale(
                                scale: animate ? 1.05 : 1.0,
                                duration: const Duration(milliseconds: 100),
                                child: Text(
                                  count.toString(),
                                  style: TextStyle(color: theme.accent, fontSize: 56, fontWeight: FontWeight.w900, fontFeatures: const [FontFeature.tabularFigures()]),
                                ),
                              ),
                            ],
                          ),
                        ),
                        GestureDetector(
                          onTap: _handleTap,
                          child: Container(
                            width: 240,
                            height: 240,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: theme.buttonColor,
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white.withValues(alpha: 0.3), width: 2),
                            ),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Text('سبّح', style: TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w900)),
                                const SizedBox(height: 4),
                                const Text('اضغط للتسبيح', style: TextStyle(color: Colors.white60, fontSize: 11, fontWeight: FontWeight.bold)),
                              ],
                            ),
                          ),
                        ),
                        InkWell(
                          onTap: _resetCounter,
                          borderRadius: BorderRadius.circular(999),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 10),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(999),
                              border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.delete_outline, size: 14, color: Colors.white),
                                SizedBox(width: 6),
                                Text('تصفير العداد', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w900)),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _circleButton(IconData icon, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.1), shape: BoxShape.circle),
        child: Icon(icon, color: Colors.white, size: 20),
      ),
    );
  }
}
