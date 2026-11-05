import 'package:flutter/material.dart';
import '../services/islamic_calendar_service.dart';
import '../theme/app_colors.dart';

class IslamicCalendarScreen extends StatefulWidget {
  const IslamicCalendarScreen({super.key});

  @override
  State<IslamicCalendarScreen> createState() => _IslamicCalendarScreenState();
}

class _IslamicCalendarScreenState extends State<IslamicCalendarScreen> {
  late DateTime now;
  late int viewYear;
  late int viewMonth; // 1-12
  int hijriOffset = 0;

  @override
  void initState() {
    super.initState();
    now = DateTime.now();
    viewYear = now.year;
    viewMonth = now.month;
  }

  bool get isCurrentMonth => viewYear == now.year && viewMonth == now.month;

  void _prevMonth() {
    setState(() {
      if (viewMonth == 1) {
        viewMonth = 12;
        viewYear--;
      } else {
        viewMonth--;
      }
    });
  }

  void _nextMonth() {
    setState(() {
      if (viewMonth == 12) {
        viewMonth = 1;
        viewYear++;
      } else {
        viewMonth++;
      }
    });
  }

  List<DateTime?> _buildGrid() {
    final firstDay = DateTime(viewYear, viewMonth, 1);
    final daysInMonth = DateTime(viewYear, viewMonth + 1, 0).day;
    final leading = firstDay.weekday % 7; // weekday: Mon=1..Sun=7 -> want Sun=0
    final cells = <DateTime?>[];
    for (int i = 0; i < leading; i++) {
      cells.add(null);
    }
    for (int d = 1; d <= daysInMonth; d++) {
      cells.add(DateTime(viewYear, viewMonth, d));
    }
    return cells;
  }

  Color _occasionColor(String type) {
    switch (type) {
      case 'eid':
        return AppColors.amber500;
      case 'fasting':
        return AppColors.emerald600;
      case 'holy_day':
        return AppColors.violet600;
      default:
        return AppColors.slate500;
    }
  }

  @override
  Widget build(BuildContext context) {
    final todayHijri = gregorianToHijri(now, offsetDays: hijriOffset);
    final upcoming = getUpcomingOccasions(now, 8, offsetDays: hijriOffset);
    final grid = _buildGrid();

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.slate50,
        appBar: AppBar(
          backgroundColor: AppColors.slate50,
          elevation: 0,
          foregroundColor: AppColors.slate800,
          title: const Column(
            children: [
              Text('التقويم والمناسبات', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15)),
              Text('التقويم الهجري والميلادي الشامل', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 10, color: AppColors.slate400)),
            ],
          ),
          centerTitle: true,
          actions: [
            Padding(
              padding: const EdgeInsets.only(left: 12),
              child: Center(
                child: InkWell(
                  onTap: () => _showOffsetSheet(context),
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(color: AppColors.slate100, borderRadius: BorderRadius.circular(12)),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.tune, size: 13, color: AppColors.slate600),
                        const SizedBox(width: 4),
                        Text(hijriOffset == 0 ? 'ضبط' : (hijriOffset > 0 ? '+$hijriOffset' : '$hijriOffset'), style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: AppColors.slate600)),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
        body: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [AppColors.violet700, AppColors.indigo600]),
                borderRadius: BorderRadius.circular(28),
              ),
              child: Column(
                children: [
                  Text(todayHijri.label, style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900)),
                  const SizedBox(height: 6),
                  Text('${weekDayNames[now.weekday % 7]}، ${now.day} ${gregorianMonths[now.month - 1]} ${now.year}', style: const TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24), border: Border.all(color: AppColors.slate100)),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      InkWell(onTap: _prevMonth, borderRadius: BorderRadius.circular(12), child: Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: AppColors.slate100, borderRadius: BorderRadius.circular(12)), child: const Icon(Icons.chevron_right, size: 18))),
                      Column(
                        children: [
                          Text('${gregorianMonths[viewMonth - 1]} $viewYear', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: AppColors.slate800)),
                          if (!isCurrentMonth)
                            InkWell(
                              onTap: () => setState(() { viewYear = now.year; viewMonth = now.month; }),
                              child: const Padding(padding: EdgeInsets.only(top: 2), child: Text('اليوم', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: AppColors.violet600))),
                            ),
                        ],
                      ),
                      InkWell(onTap: _nextMonth, borderRadius: BorderRadius.circular(12), child: Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: AppColors.slate100, borderRadius: BorderRadius.circular(12)), child: const Icon(Icons.chevron_left, size: 18))),
                    ],
                  ),
                  const SizedBox(height: 12),
                  GridView.count(
                    crossAxisCount: 7,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    children: ['أحد', 'إثن', 'ثلا', 'أرب', 'خمی', 'جمع', 'سبت']
                        .map((d) => Center(child: Text(d, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: AppColors.slate400))))
                        .toList(),
                  ),
                  GridView.count(
                    crossAxisCount: 7,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    children: grid.map((date) {
                      if (date == null) return const SizedBox.shrink();
                      final isToday = date.year == now.year && date.month == now.month && date.day == now.day;
                      final hijri = gregorianToHijri(date, offsetDays: hijriOffset);
                      final isFriday = date.weekday == DateTime.friday;
                      final isWhiteDay = hijri.day >= 13 && hijri.day <= 15;
                      return Padding(
                        padding: const EdgeInsets.all(2),
                        child: Container(
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: isToday ? AppColors.violet600 : (isWhiteDay ? const Color(0xFFFFFBEB) : Colors.transparent),
                            borderRadius: BorderRadius.circular(12),
                            border: isFriday && !isToday ? Border.all(color: AppColors.emerald200) : null,
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text('${date.day}', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: isToday ? Colors.white : AppColors.slate800)),
                              Text('${hijri.day}', style: TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: isToday ? Colors.white70 : AppColors.slate400)),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            const Row(
              children: [
                Icon(Icons.auto_awesome, size: 16, color: AppColors.violet600),
                SizedBox(width: 6),
                Text('المناسبات القادمة', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: AppColors.slate800)),
              ],
            ),
            const SizedBox(height: 10),
            ...upcoming.map((u) {
              final color = _occasionColor(u.occasion.type);
              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(22), border: Border.all(color: AppColors.slate100)),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(16)),
                      child: Icon(u.occasion.type == 'eid' ? Icons.celebration : (u.occasion.type == 'fasting' ? Icons.restaurant : Icons.star), color: color, size: 18),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(u.occasion.name, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: AppColors.slate800)),
                          const SizedBox(height: 2),
                          Text(u.occasion.note, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate400)),
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(u.daysRemaining == 0 ? 'اليوم' : 'بعد ${u.daysRemaining} يوم', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: color)),
                        Text('${u.gregorianDate.day}/${u.gregorianDate.month}', style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppColors.slate400)),
                      ],
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  void _showOffsetSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => StatefulBuilder(
        builder: (context, setSheetState) => Directionality(
          textDirection: TextDirection.rtl,
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('ضبط التقويم الهجري', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
                const SizedBox(height: 6),
                const Text('عدّل يوم أو يومين لمطابقة رؤية الهلال في بلدك', style: TextStyle(fontSize: 11, color: AppColors.slate400, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [-2, -1, 0, 1, 2].map((v) {
                    final selected = hijriOffset == v;
                    return InkWell(
                      onTap: () {
                        setState(() => hijriOffset = v);
                        setSheetState(() {});
                      },
                      borderRadius: BorderRadius.circular(999),
                      child: Container(
                        width: 44,
                        height: 44,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(color: selected ? AppColors.violet600 : AppColors.slate100, shape: BoxShape.circle),
                        child: Text(v > 0 ? '+$v' : '$v', style: TextStyle(fontWeight: FontWeight.w900, color: selected ? Colors.white : AppColors.slate600)),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 12),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
