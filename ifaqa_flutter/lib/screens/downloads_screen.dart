import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import '../services/mushaf_service.dart';
import '../theme/app_colors.dart';

class DownloadsScreen extends StatefulWidget {
  const DownloadsScreen({super.key});

  @override
  State<DownloadsScreen> createState() => _DownloadsScreenState();
}

class _DownloadsScreenState extends State<DownloadsScreen> {
  int? _downloaded;
  bool _running = false;
  bool _stopRequested = false;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    _refreshCount();
  }

  @override
  void dispose() {
    _stopRequested = true;
    super.dispose();
  }

  Future<void> _refreshCount() async {
    final count = await MushafService.instance.downloadedPageCount();
    if (mounted) setState(() => _downloaded = count);
  }

  Future<void> _start() async {
    setState(() {
      _running = true;
      _stopRequested = false;
      _failed = false;
    });
    final complete = await MushafService.instance.downloadAll(
      shouldStop: () => _stopRequested,
      onProgress: (count) {
        if (mounted) setState(() => _downloaded = count);
      },
    );
    if (!mounted) return;
    setState(() {
      _running = false;
      _failed = !complete && !_stopRequested;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.slate50,
        appBar: AppBar(
          backgroundColor: AppColors.slate50,
          elevation: 0,
          foregroundColor: AppColors.slate800,
          title: const Text('مركز التنزيلات', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
        ),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: [_buildMushafCard()],
        ),
      ),
    );
  }

  Widget _buildMushafCard() {
    final count = _downloaded ?? 0;
    final total = MushafService.pageCount;
    final done = count >= total;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24), border: Border.all(color: AppColors.slate100)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Row(
            children: [
              Icon(Icons.menu_book, color: AppColors.emerald600),
              SizedBox(width: 10),
              Expanded(child: Text('مصحف المدينة', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: AppColors.slate900))),
            ],
          ),
          const SizedBox(height: 8),
          if (kIsWeb)
            const Text(
              'التنزيل الكامل متاح في تطبيق الموبايل. على الويب يحتفظ المتصفح بالصفحات التي فتحتها.',
              style: TextStyle(fontSize: 12, height: 1.7, fontWeight: FontWeight.bold, color: AppColors.slate500),
            )
          else ...[
            const Text(
              'نزّل الصفحات الـ604 لتقرأ بدون إنترنت. يحتاج التنزيل مساحة بمئات الميجابايت، ويفضل استخدام Wi-Fi.',
              style: TextStyle(fontSize: 12, height: 1.7, fontWeight: FontWeight.bold, color: AppColors.slate500),
            ),
            const SizedBox(height: 14),
            ClipRRect(
              borderRadius: BorderRadius.circular(999),
              child: LinearProgressIndicator(
                value: count / total,
                minHeight: 8,
                backgroundColor: AppColors.slate100,
                valueColor: const AlwaysStoppedAnimation(AppColors.emerald600),
              ),
            ),
            const SizedBox(height: 6),
            Text('$count من $total صفحة', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: AppColors.slate500)),
            if (_failed)
              const Padding(
                padding: EdgeInsets.only(top: 8),
                child: Text('توقف التنزيل بسبب خطأ في الاتصال. يمكنك المتابعة من حيث توقف.', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.rose500)),
              ),
            const SizedBox(height: 14),
            if (!done)
              FilledButton(
                onPressed: _downloaded == null ? null : (_running ? () => setState(() => _stopRequested = true) : _start),
                style: FilledButton.styleFrom(backgroundColor: _running ? AppColors.slate700 : AppColors.emerald600),
                child: Text(_running ? 'إيقاف' : (count > 0 ? 'متابعة التنزيل' : 'تنزيل المصحف'), style: const TextStyle(fontWeight: FontWeight.w900)),
              )
            else
              const Text('المصحف كامل على جهازك ✓', textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.w900, color: AppColors.emerald700)),
          ],
        ],
      ),
    );
  }
}
