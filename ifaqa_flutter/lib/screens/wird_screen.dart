import 'dart:convert';
import 'package:flutter/material.dart';
import '../models/wird_task.dart';
import '../services/app_state.dart';
import '../theme/app_colors.dart';

class WirdScreen extends StatefulWidget {
  const WirdScreen({super.key});

  @override
  State<WirdScreen> createState() => _WirdScreenState();
}

class _WirdScreenState extends State<WirdScreen> {
  DateTime selectedDate = DateTime.now();
  static const int _wirdXp = 150;
  final AppState _state = AppState.instance;
  late final List<WirdTask> tasks = _loadTasks();
  late final List<WeakPoint> weakPoints = _state
      .strings('wird_weak')
      .map((s) => WeakPoint.fromJson(jsonDecode(s) as Map<String, dynamic>))
      .toList();

  /// Tasks repeat every day, so yesterday's ticks are cleared on the first open of a new day.
  List<WirdTask> _loadTasks() {
    final loaded = _state.strings('wird_tasks').map((s) => WirdTask.fromJson(jsonDecode(s) as Map<String, dynamic>)).toList();
    final today = AppState.dateKey(DateTime.now());
    if (_state.text('wird_date') != today) {
      for (final task in loaded) {
        task.done = false;
        task.quality = null;
      }
      // Deferred: this runs while building, and setText notifies listeners.
      Future.microtask(() => _state.setText('wird_date', today));
    }
    return loaded;
  }

  @override
  void setState(VoidCallback fn) {
    super.setState(fn);
    _state.setStrings('wird_tasks', tasks.map((t) => jsonEncode(t.toJson())).toList());
    _state.setStrings('wird_weak', weakPoints.map((p) => jsonEncode(p.toJson())).toList());
  }
  String? activeMenuTaskId;

  int get progress {
    if (tasks.isEmpty) return 0;
    final done = tasks.where((t) => t.done).length;
    return ((done / tasks.length) * 100).round();
  }

  bool _isSameDay(DateTime a, DateTime b) => a.year == b.year && a.month == b.month && a.day == b.day;

  void _toggle(WirdTask task) {
    if (task.done) {
      _state.addXp(-_wirdXp);
      setState(() {
        task.done = false;
        task.quality = null;
      });
    } else {
      setState(() => activeMenuTaskId = task.id);
    }
  }

  void _evaluate(WirdTask task, WirdQuality quality) {
    _state.addXp(_wirdXp);
    setState(() {
      task.done = true;
      task.quality = quality;
      activeMenuTaskId = null;
      if (quality != WirdQuality.perfect) {
        weakPoints.add(WeakPoint(id: DateTime.now().millisecondsSinceEpoch.toString(), title: task.title, type: task.type, quality: quality));
      }
    });
  }

  void _openAddSheet() {
    WirdType type = WirdType.newMemorization;
    final surahController = TextEditingController();
    final versesController = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => StatefulBuilder(
        builder: (context, setSheetState) => Directionality(
          textDirection: TextDirection.rtl,
          child: Padding(
            padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(32))),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text('إضافة ورد جديد', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: AppColors.slate900)),
                  const SizedBox(height: 18),
                  const Text('نوع الورد', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: AppColors.slate400)),
                  const SizedBox(height: 8),
                  Row(
                    children: WirdType.values.map((t) {
                      final selected = type == t;
                      return Expanded(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 3),
                          child: InkWell(
                            onTap: () => setSheetState(() => type = t),
                            borderRadius: BorderRadius.circular(16),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                color: selected ? AppColors.violet600 : AppColors.slate50,
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Text(wirdTypeLabel(t), textAlign: TextAlign.center, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: selected ? Colors.white : AppColors.slate500)),
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 18),
                  const Text('السورة', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: AppColors.slate400)),
                  const SizedBox(height: 8),
                  TextField(controller: surahController, textAlign: TextAlign.right, decoration: InputDecoration(hintText: 'مثلًا: البقرة', filled: true, fillColor: AppColors.slate50, border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none))),
                  const SizedBox(height: 14),
                  const Text('الآيات (اختياري)', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: AppColors.slate400)),
                  const SizedBox(height: 8),
                  TextField(controller: versesController, textAlign: TextAlign.right, decoration: InputDecoration(hintText: 'مثلًا: 1-20', filled: true, fillColor: AppColors.slate50, border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none))),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      style: FilledButton.styleFrom(backgroundColor: AppColors.violet600, padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20))),
                      onPressed: () {
                        final surah = surahController.text.trim();
                        if (surah.isEmpty) return;
                        final title = '$surah ${versesController.text.trim()}'.trim();
                        setState(() => tasks.add(WirdTask(id: DateTime.now().millisecondsSinceEpoch.toString(), type: type, title: title)));
                        Navigator.pop(context);
                      },
                      child: const Text('إضافة إلى وردي', style: TextStyle(fontWeight: FontWeight.w900)),
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
    final days = List.generate(7, (i) => DateTime.now().subtract(Duration(days: 3 - i)));
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.slate50,
        appBar: AppBar(backgroundColor: AppColors.slate50, elevation: 0, foregroundColor: AppColors.slate800, title: const Text('وردي اليومي', style: TextStyle(fontWeight: FontWeight.w900))),
        floatingActionButton: FloatingActionButton(
          onPressed: _openAddSheet,
          backgroundColor: AppColors.violet600,
          child: const Icon(Icons.add, color: Colors.white),
        ),
        body: ListView(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
          children: [
            SizedBox(
              height: 74,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: days.length,
                separatorBuilder: (_, _) => const SizedBox(width: 8),
                itemBuilder: (context, i) {
                  final d = days[i];
                  final isToday = _isSameDay(d, DateTime.now());
                  final isSelected = _isSameDay(d, selectedDate);
                  const weekdays = ['اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت', 'أحد'];
                  return InkWell(
                    onTap: () => setState(() => selectedDate = d),
                    borderRadius: BorderRadius.circular(18),
                    child: Container(
                      width: 60,
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: isSelected ? AppColors.violet600 : (isToday ? const Color(0xFFF5F3FF) : Colors.white),
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: isSelected ? Colors.transparent : (isToday ? AppColors.violet300 : AppColors.slate100)),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(weekdays[d.weekday - 1], style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: isSelected ? Colors.white70 : AppColors.slate400)),
                          const SizedBox(height: 4),
                          Text('${d.day}', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: isSelected ? Colors.white : AppColors.slate800)),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(32), border: Border.all(color: AppColors.slate100)),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('وردي اليومي', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppColors.slate900)),
                        const SizedBox(height: 4),
                        Text('${selectedDate.day}/${selectedDate.month}/${selectedDate.year}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate400)),
                      ],
                    ),
                  ),
                  SizedBox(
                    width: 64,
                    height: 64,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        SizedBox(width: 64, height: 64, child: CircularProgressIndicator(value: progress / 100, strokeWidth: 7, backgroundColor: AppColors.slate100, valueColor: const AlwaysStoppedAnimation(AppColors.violet600), strokeCap: StrokeCap.round)),
                        Text('$progress%', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: AppColors.violet600)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            for (final type in WirdType.values) _buildSection(type),
            if (weakPoints.isNotEmpty) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: const Color(0xFFFFF1F2), borderRadius: BorderRadius.circular(14)), child: const Icon(Icons.bolt, color: AppColors.rose500, size: 18)),
                  const SizedBox(width: 8),
                  const Text('صندوق الترميم (نقاط الضعف)', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: AppColors.slate900)),
                ],
              ),
              const SizedBox(height: 10),
              ...weakPoints.map((p) => Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: const Color(0xFFFFE4E6))),
                    child: Row(
                      children: [
                        Container(width: 8, height: 8, decoration: BoxDecoration(color: p.quality == WirdQuality.needsRepeat ? AppColors.rose500 : AppColors.amber500, shape: BoxShape.circle)),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(p.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.slate800)),
                              Text(wirdTypeLabel(p.type), style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppColors.slate400)),
                            ],
                          ),
                        ),
                        InkWell(
                          onTap: () => setState(() => weakPoints.remove(p)),
                          borderRadius: BorderRadius.circular(999),
                          child: Container(width: 30, height: 30, alignment: Alignment.center, decoration: BoxDecoration(color: AppColors.slate50, shape: BoxShape.circle), child: const Icon(Icons.check, size: 15, color: AppColors.slate400)),
                        ),
                      ],
                    ),
                  )),
            ],
            const SizedBox(height: 60),
          ],
        ),
      ),
    );
  }

  Widget _buildSection(WirdType type) {
    final sectionTasks = tasks.where((t) => t.type == type).toList();
    if (sectionTasks.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.6), borderRadius: BorderRadius.circular(24), border: Border.all(color: AppColors.slate100)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(padding: const EdgeInsets.symmetric(horizontal: 8), child: Text(wirdTypeLabel(type), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: AppColors.slate400))),
            const SizedBox(height: 8),
            ...sectionTasks.map((task) {
              final showMenu = activeMenuTaskId == task.id;
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Stack(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: task.done ? const Color(0xFFECFDF5) : Colors.white,
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: task.done ? const Color(0xFFA7F3D0) : AppColors.slate100),
                      ),
                      child: Row(
                        children: [
                          InkWell(
                            onTap: () => _toggle(task),
                            borderRadius: BorderRadius.circular(999),
                            child: Container(
                              width: 28,
                              height: 28,
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                color: task.done ? AppColors.emerald500 : Colors.transparent,
                                shape: BoxShape.circle,
                                border: Border.all(color: task.done ? Colors.transparent : AppColors.slate200, width: 2),
                              ),
                              child: task.done ? const Icon(Icons.check, size: 15, color: Colors.white) : null,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  task.title,
                                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: task.done ? AppColors.slate400 : AppColors.slate800, decoration: task.done ? TextDecoration.lineThrough : null),
                                ),
                                if (task.quality != null)
                                  Container(
                                    margin: const EdgeInsets.only(top: 4),
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: task.quality == WirdQuality.perfect ? AppColors.emerald100 : (task.quality == WirdQuality.withErrors ? AppColors.amber100 : const Color(0xFFFFE4E6)),
                                      borderRadius: BorderRadius.circular(999),
                                    ),
                                    child: Text(wirdQualityLabel(task.quality!), style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w900)),
                                  ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (showMenu)
                      Positioned.fill(
                        child: Container(
                          decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.95), borderRadius: BorderRadius.circular(18), border: Border.all(color: AppColors.violet300)),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              _evalBtn(task, WirdQuality.perfect, Icons.star, AppColors.emerald600),
                              _evalBtn(task, WirdQuality.withErrors, Icons.refresh, AppColors.amber600),
                              _evalBtn(task, WirdQuality.needsRepeat, Icons.close, AppColors.rose600),
                            ],
                          ),
                        ),
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

  Widget _evalBtn(WirdTask task, WirdQuality quality, IconData icon, Color color) {
    return InkWell(
      onTap: () => _evaluate(task, quality),
      borderRadius: BorderRadius.circular(14),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Column(
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(height: 3),
            Text(wirdQualityLabel(quality), style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: color)),
          ],
        ),
      ),
    );
  }
}
