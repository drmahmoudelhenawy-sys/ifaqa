import 'dart:async';
import 'package:flutter/material.dart';
import '../services/cloud_service.dart';
import '../services/events_service.dart';
import '../theme/app_colors.dart';
import 'auth_screen.dart';
import 'event_competition_screen.dart';
import 'event_editor_screen.dart';

enum _Filter { all, active, upcoming, ended }

/// React `MawanEventsPage`: list of Mawan competitions with filters.
/// Embedded in the challenges tab, which already scrolls.
class MawanEventsTab extends StatefulWidget {
  const MawanEventsTab({super.key});

  @override
  State<MawanEventsTab> createState() => _MawanEventsTabState();
}

class _MawanEventsTabState extends State<MawanEventsTab> {
  final _cloud = CloudService.instance;
  _Filter filter = _Filter.all;
  List<MawanEvent>? events;
  String? error;
  StreamSubscription<List<MawanEvent>>? _sub;
  Timer? _ticker;

  @override
  void initState() {
    super.initState();
    _cloud.addListener(_subscribe);
    _subscribe();
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _cloud.removeListener(_subscribe);
    _sub?.cancel();
    _ticker?.cancel();
    super.dispose();
  }

  void _subscribe() {
    _sub?.cancel();
    _sub = null;
    if (_cloud.signedIn) {
      _sub = EventsService.instance.events().listen(
        (list) => setState(() {
          events = list;
          error = null;
        }),
        onError: (Object _) => setState(() => error = 'تعذر تحميل الفعاليات.'),
      );
    }
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    if (!_cloud.signedIn) {
      return const SignInPrompt(message: 'سجّل الدخول لتشارك في مسابقات معوان وتنافس إخوانك في الخير.');
    }
    final now = DateTime.now();
    final isAdmin = _cloud.isAdmin;
    final list = (events ?? const <MawanEvent>[]).where((e) {
      if (e.isDraft) return isAdmin;
      switch (filter) {
        case _Filter.all:
          return true;
        case _Filter.active:
          return e.phaseAt(now) == EventPhase.active;
        case _Filter.upcoming:
          return e.phaseAt(now) == EventPhase.upcoming;
        case _Filter.ended:
          return e.phaseAt(now) == EventPhase.ended;
      }
    }).toList();

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                for (final f in [(_Filter.all, 'الكل'), (_Filter.active, 'نشطة الآن'), (_Filter.upcoming, 'قادمة'), (_Filter.ended, 'منتهية')])
                  Padding(
                    padding: const EdgeInsetsDirectional.only(end: 6),
                    child: ChoiceChip(
                      label: Text(f.$2, style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: filter == f.$1 ? Colors.white : AppColors.slate500)),
                      selected: filter == f.$1,
                      showCheckmark: false,
                      selectedColor: AppColors.violet600,
                      backgroundColor: Colors.white,
                      side: const BorderSide(color: AppColors.slate200),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      onSelected: (_) => setState(() => filter = f.$1),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          if (isAdmin) ...[
            FilledButton.icon(
              onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const EventEditorScreen())),
              icon: const Icon(Icons.add),
              label: const Text('إضافة مسابقة / فعالية جديدة', style: TextStyle(fontWeight: FontWeight.w900)),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.violet600,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
              ),
            ),
            const SizedBox(height: 12),
          ],
          if (error != null)
            _empty(Icons.wifi_off, error!, 'تحقق من الاتصال ثم أعد المحاولة.')
          else if (events == null)
            const Padding(padding: EdgeInsets.all(32), child: Center(child: CircularProgressIndicator()))
          else if (list.isEmpty)
            _empty(Icons.calendar_month, 'لا توجد فعاليات في هذا القسم', 'ترقب انطلاق مسابقات وتحديات معوان القادمة وتنافس مع آلاف المسلمين في الخيرات.')
          else
            ...list.asMap().entries.map((e) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _EventCard(
                    event: e.value,
                    now: now,
                    featured: e.key == 0 && e.value.phaseAt(now) == EventPhase.active,
                    isAdmin: isAdmin,
                  ),
                )),
        ],
      ),
    );
  }

  Widget _empty(IconData icon, String title, String body) => Container(
        padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 24),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(32), border: Border.all(color: AppColors.slate200)),
        child: Column(
          children: [
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(color: const Color(0xFFEDE9FE), borderRadius: BorderRadius.circular(24)),
              child: Icon(icon, color: AppColors.violet600, size: 28),
            ),
            const SizedBox(height: 12),
            Text(title, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: AppColors.slate800)),
            const SizedBox(height: 6),
            Text(body, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.slate400, height: 1.6)),
          ],
        ),
      );
}

String formatCountdown(Duration d) {
  if (d.isNegative) return '00:00:00';
  String two(int n) => n.toString().padLeft(2, '0');
  final days = d.inDays;
  final clock = '${two(d.inHours % 24)}:${two(d.inMinutes % 60)}:${two(d.inSeconds % 60)}';
  return days > 0 ? '$days يوم  $clock' : clock;
}

class _EventCard extends StatelessWidget {
  final MawanEvent event;
  final DateTime now;
  final bool featured;
  final bool isAdmin;
  const _EventCard({required this.event, required this.now, required this.featured, required this.isAdmin});

  @override
  Widget build(BuildContext context) {
    final phase = event.phaseAt(now);
    final (label, color) = switch (phase) {
      EventPhase.active => ('نشطة الآن', AppColors.emerald400),
      EventPhase.upcoming => ('قادمة', AppColors.amber300),
      EventPhase.ended => ('منتهية', AppColors.slate300),
    };
    final timeText = switch (phase) {
      EventPhase.ended => 'انتهت الفعالية',
      EventPhase.upcoming => 'تبدأ بعد ${formatCountdown(event.start.difference(now))}',
      EventPhase.active => 'تنتهي بعد ${formatCountdown(event.end.difference(now))}',
    };

    return InkWell(
      onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => EventCompetitionScreen(event: event))),
      borderRadius: BorderRadius.circular(32),
      child: Opacity(
        opacity: phase == EventPhase.ended ? 0.8 : 1,
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: LinearGradient(begin: Alignment.topRight, end: Alignment.bottomLeft, colors: event.colors),
            borderRadius: BorderRadius.circular(32),
            boxShadow: featured ? [BoxShadow(color: event.colors.first.withValues(alpha: 0.4), blurRadius: 20, offset: const Offset(0, 8))] : null,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(999)),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(width: 7, height: 7, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
                        const SizedBox(width: 6),
                        Text(event.isDraft ? 'مسودة' : label, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 11)),
                      ],
                    ),
                  ),
                  if (featured) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.25), borderRadius: BorderRadius.circular(999)),
                      child: const Text('مميزة', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 11)),
                    ),
                  ],
                  const Spacer(),
                  if (isAdmin)
                    IconButton(
                      onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => EventEditorScreen(event: event))),
                      icon: const Icon(Icons.edit, color: Colors.white, size: 18),
                      style: IconButton.styleFrom(backgroundColor: Colors.white.withValues(alpha: 0.2)),
                    ),
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(14)),
                    child: Icon(event.iconData, color: Colors.white, size: 20),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Text(event.title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 19)),
              if (event.description.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(event.description, maxLines: 2, overflow: TextOverflow.ellipsis, style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontWeight: FontWeight.bold, fontSize: 12, height: 1.5)),
              ],
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.18), borderRadius: BorderRadius.circular(16)),
                child: Row(
                  children: [
                    const Icon(Icons.schedule, color: Colors.white, size: 16),
                    const SizedBox(width: 8),
                    Expanded(child: Text(timeText, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 12))),
                    const Icon(Icons.chevron_left, color: Colors.white),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
