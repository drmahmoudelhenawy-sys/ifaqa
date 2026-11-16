import 'dart:async';
import 'package:flutter/material.dart';
import '../services/cloud_service.dart';
import '../services/content_service.dart';
import '../theme/app_colors.dart';

/// Rotating hadith / zekr / wisdom card managed from the admin panel
/// (React `DynamicContent`). Hidden for guests and when there is nothing active.
class DynamicContentCard extends StatefulWidget {
  const DynamicContentCard({super.key});

  @override
  State<DynamicContentCard> createState() => _DynamicContentCardState();
}

class _DynamicContentCardState extends State<DynamicContentCard> {
  List<ContentItem> items = const [];
  int index = 0;
  StreamSubscription? _sub;
  Timer? _rotate;

  @override
  void initState() {
    super.initState();
    CloudService.instance.addListener(_subscribe);
    _subscribe();
  }

  @override
  void dispose() {
    CloudService.instance.removeListener(_subscribe);
    _sub?.cancel();
    _rotate?.cancel();
    super.dispose();
  }

  void _subscribe() {
    _sub?.cancel();
    _sub = null;
    if (!CloudService.instance.signedIn) {
      if (mounted) setState(() => items = const []);
      return;
    }
    _sub = ContentService.instance.activeContent().listen((list) {
      setState(() {
        items = list;
        if (index >= items.length) index = 0;
      });
      _schedule();
    }, onError: (_) {});
  }

  void _schedule() {
    _rotate?.cancel();
    if (items.length <= 1) return;
    _rotate = Timer(Duration(seconds: items[index].duration.clamp(4, 120)), () {
      if (!mounted) return;
      setState(() => index = (index + 1) % items.length);
      _schedule();
    });
  }

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return const SizedBox.shrink();
    final item = items[index];
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 400),
        child: Container(
          key: ValueKey(item.id),
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24), border: Border.all(color: AppColors.slate100)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                const Icon(Icons.format_quote, color: AppColors.amber500, size: 18),
                const SizedBox(width: 6),
                Text(item.typeLabel, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: AppColors.amber700)),
                const Spacer(),
                if (items.length > 1) Text('${index + 1}/${items.length}', style: const TextStyle(fontSize: 10, color: AppColors.slate400)),
              ]),
              const SizedBox(height: 8),
              Text(item.text, style: const TextStyle(fontFamily: 'Amiri', fontSize: 17, height: 1.8, color: AppColors.slate800, fontWeight: FontWeight.bold)),
              if (item.explanation.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(item.explanation, style: const TextStyle(fontSize: 12, height: 1.6, color: AppColors.slate500, fontWeight: FontWeight.w600)),
              ],
              if (item.source.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text('— ${item.source}', style: const TextStyle(fontSize: 11, color: AppColors.slate400, fontWeight: FontWeight.bold)),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
