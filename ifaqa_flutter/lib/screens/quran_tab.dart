import 'package:flutter/material.dart';
import '../data/surahs_data.dart';
import '../models/surah_info.dart';
import '../services/mushaf_service.dart';
import '../services/quran_progress_service.dart';
import '../theme/app_colors.dart';
import 'quran_reader_screen.dart';
import 'quran_search_screen.dart';
import 'wird_screen.dart';

class QuranTab extends StatefulWidget {
  const QuranTab({super.key});

  @override
  State<QuranTab> createState() => _QuranTabState();
}

class _QuranTabState extends State<QuranTab> {
  final TextEditingController searchController = TextEditingController();
  String query = '';

  List<SurahInfo> get filteredSurahs {
    final q = query.trim();
    if (q.isEmpty) return quranSurahs;
    return quranSurahs.where((s) {
      return s.name.contains(q) || s.englishName.toLowerCase().contains(q.toLowerCase()) || s.number.toString() == q;
    }).toList();
  }

  int? lastPage;

  @override
  void initState() {
    super.initState();
    _loadLastPage();
  }

  @override
  void dispose() {
    searchController.dispose();
    super.dispose();
  }

  Future<void> _loadLastPage() async {
    final page = await MushafService.instance.lastReadPage();
    if (mounted) setState(() => lastPage = page);
  }

  Future<void> _openReader(Widget reader) async {
    await Navigator.of(context).push(MaterialPageRoute(builder: (_) => reader));
    await _loadLastPage();
    if (mounted) setState(() {});
  }

  Widget _buildResumeCard(int page) {
    final surah = quranSurahs.lastWhere((s) => s.startPage <= page);
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: InkWell(
        onTap: () => _openReader(QuranReaderScreen(initialPage: page)),
        borderRadius: BorderRadius.circular(24),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24), border: Border.all(color: AppColors.emerald100)),
          child: Row(
            children: [
              const Icon(Icons.bookmark, color: AppColors.emerald600, size: 22),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('متابعة القراءة', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: AppColors.slate900)),
                    const SizedBox(height: 2),
                    Text('سورة ${surah.name} · صفحة $page', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate400)),
                  ],
                ),
              ),
              const Icon(Icons.chevron_left, color: AppColors.slate300),
            ],
          ),
        ),
      ),
    );
  }

  String _ayahLabel(int count) => count == 1 ? 'آية' : 'آيات';

  final _progress = QuranProgressService.instance;

  Widget _buildStats() {
    final days = _progress.lastDays(7);
    final week = days.fold<int>(0, (s, d) => s + d.pages);
    final peak = days.map((d) => d.pages).fold<int>(1, (a, b) => b > a ? b : a);
    const names = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س']; // Sunday first: weekday % 7
    Widget metric(String v, String l, IconData i, Color c) => Expanded(
          child: Column(children: [
            Icon(i, size: 18, color: c),
            const SizedBox(height: 4),
            Text(v, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: AppColors.slate900)),
            Text(l, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate400)),
          ]),
        );
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24), border: Border.all(color: AppColors.slate100)),
      child: Column(
        children: [
          Row(children: [
            metric('${days.last.pages}', 'صفحات اليوم', Icons.today, AppColors.emerald600),
            metric('$week', 'هذا الأسبوع', Icons.date_range, AppColors.indigo600),
            metric('${_progress.streak}', 'أيام متتالية', Icons.local_fire_department, AppColors.orange500),
            metric('${_progress.khatmasCompleted}', 'ختمات', Icons.workspace_premium, AppColors.amber500),
          ]),
          const SizedBox(height: 14),
          SizedBox(
            height: 70,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: days.map((d) {
                final today = d.day.day == DateTime.now().day;
                return Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      if (d.pages > 0) Text('${d.pages}', style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: AppColors.slate500)),
                      Container(
                        height: 4 + 40 * d.pages / peak,
                        margin: const EdgeInsets.symmetric(horizontal: 6),
                        decoration: BoxDecoration(color: today ? AppColors.emerald500 : AppColors.emerald200, borderRadius: BorderRadius.circular(6)),
                      ),
                      const SizedBox(height: 4),
                      Text(names[d.day.weekday % 7], style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: today ? AppColors.emerald700 : AppColors.slate400)),
                    ],
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 6),
          const Text('تُحسب الصفحة بعد 20 ثانية من القراءة · +10 XP لكل صفحة', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate400)),
        ],
      ),
    );
  }

  Widget _buildKhatma() {
    final goal = _progress.khatma;
    if (goal == null) {
      return InkWell(
        onTap: _planKhatma,
        borderRadius: BorderRadius.circular(24),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: AppColors.emerald50, borderRadius: BorderRadius.circular(24), border: Border.all(color: AppColors.emerald200)),
          child: const Row(children: [
            Icon(Icons.flag, color: AppColors.emerald600),
            SizedBox(width: 12),
            Expanded(child: Text('ابدأ ختمة بخطة يومية', style: TextStyle(fontWeight: FontWeight.w900, color: AppColors.emerald700))),
            Icon(Icons.add_circle, color: AppColors.emerald600),
          ]),
        ),
      );
    }
    final read = _progress.khatmaPagesRead;
    final pct = read / 604;
    final behind = goal.expectedPages - read;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [Color(0xFF064E3B), Color(0xFF0F766E)]),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(children: [
            const Icon(Icons.flag, color: AppColors.amber300, size: 20),
            const SizedBox(width: 8),
            Expanded(child: Text(goal.title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 15))),
            IconButton(onPressed: _planKhatma, icon: const Icon(Icons.tune, color: Colors.white70, size: 20)),
          ]),
          Text('اليوم ${goal.dayNumber.clamp(1, goal.days)} من ${goal.days} · ${goal.pagesPerDay} صفحة يوميًا',
              style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontWeight: FontWeight.bold, fontSize: 11)),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(9),
            child: LinearProgressIndicator(value: pct, minHeight: 10, backgroundColor: Colors.white24, valueColor: const AlwaysStoppedAnimation(AppColors.amber400)),
          ),
          const SizedBox(height: 8),
          Row(children: [
            Text('$read / 604 صفحة · ${(pct * 100).round()}%', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 12)),
            const Spacer(),
            Text(read >= 604 ? 'ختمت، تقبل الله! 🎉' : behind > 0 ? 'متأخر $behind صفحة' : 'على الموعد ✓',
                style: TextStyle(color: read >= 604 || behind <= 0 ? AppColors.emerald200 : AppColors.amber300, fontWeight: FontWeight.w900, fontSize: 11)),
          ]),
        ],
      ),
    );
  }

  Future<void> _planKhatma() async {
    final existing = _progress.khatma;
    final title = TextEditingController(text: existing?.title ?? 'ختمة جديدة');
    var days = existing?.days ?? 30;
    final action = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Directionality(
        textDirection: TextDirection.rtl,
        child: StatefulBuilder(
          builder: (ctx, setSheet) => Padding(
            padding: EdgeInsets.fromLTRB(20, 20, 20, 20 + MediaQuery.of(ctx).viewInsets.bottom),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text('خطة الختمة', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 17)),
                const SizedBox(height: 14),
                TextField(controller: title, decoration: InputDecoration(labelText: 'اسم الختمة', border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)))),
                const SizedBox(height: 14),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [7, 10, 15, 20, 30, 60, 90]
                      .map((d) => ChoiceChip(label: Text('$d يوم'), selected: days == d, onSelected: (_) => setSheet(() => days = d)))
                      .toList(),
                ),
                const SizedBox(height: 10),
                Text('${(604 / days).ceil()} صفحة يوميًا (≈ ${((604 / days) / 20).toStringAsFixed(1)} جزء)', style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.emerald700)),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () => Navigator.pop(ctx, 'start'),
                  style: FilledButton.styleFrom(backgroundColor: AppColors.emerald600, padding: const EdgeInsets.symmetric(vertical: 14)),
                  child: Text(existing == null ? 'ابدأ الختمة' : 'ابدأ ختمة جديدة', style: const TextStyle(fontWeight: FontWeight.w900)),
                ),
                if (existing != null)
                  TextButton(onPressed: () => Navigator.pop(ctx, 'clear'), child: const Text('إلغاء الختمة الحالية', style: TextStyle(color: AppColors.rose600))),
              ],
            ),
          ),
        ),
      ),
    );
    if (action == 'start') _progress.startKhatma(title.text, days);
    if (action == 'clear') _progress.clearKhatma();
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [AppColors.emerald700, AppColors.teal600], begin: Alignment.topRight, end: Alignment.bottomLeft),
              borderRadius: BorderRadius.circular(32),
            ),
            child: Row(
              children: [
                const Icon(Icons.menu_book, color: Colors.white, size: 30),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('المصحف الشريف', style: TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w900)),
                      SizedBox(height: 2),
                      Text('114 سورة · تصفح، اقرأ، واحفظ ورقتك اليومية', style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
                InkWell(
                  onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const QuranSearchScreen())),
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(16)),
                    child: const Icon(Icons.manage_search, color: Colors.white, size: 20),
                  ),
                ),
                const SizedBox(width: 8),
                InkWell(
                  onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const WirdScreen())),
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(16)),
                    child: const Icon(Icons.checklist, color: Colors.white, size: 20),
                  ),
                ),
              ],
            ),
          ),
          if (lastPage != null) _buildResumeCard(lastPage!),
          const SizedBox(height: 12),
          _buildStats(),
          const SizedBox(height: 12),
          _buildKhatma(),
          const SizedBox(height: 16),
          Container(
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24), border: Border.all(color: AppColors.slate100)),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: searchController,
                  onChanged: (v) => setState(() => query = v),
                  textAlign: TextAlign.right,
                  decoration: InputDecoration(
                    hintText: 'ابحث باسم السورة أو رقمها...',
                    prefixIcon: query.isNotEmpty
                        ? IconButton(icon: const Icon(Icons.close, size: 18), onPressed: () => setState(() { query = ''; searchController.clear(); }))
                        : null,
                    suffixIcon: const Icon(Icons.search, size: 18, color: AppColors.slate400),
                    filled: true,
                    fillColor: AppColors.slate50,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                  ),
                ),
                const SizedBox(height: 8),
                ...filteredSurahs.map((s) => InkWell(
                      onTap: () => _openReader(QuranReaderScreen.surah(s)),
                      borderRadius: BorderRadius.circular(16),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
                        child: Row(
                          children: [
                            Container(
                              width: 38,
                              height: 38,
                              alignment: Alignment.center,
                              decoration: BoxDecoration(color: AppColors.slate100, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.slate200)),
                              child: Text(s.number.toString(), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: AppColors.emerald700, fontFamily: 'monospace')),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('سورة ${s.name}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: AppColors.slate900)),
                                  const SizedBox(height: 2),
                                  Row(
                                    children: [
                                      Text('${s.ayahCount} ${_ayahLabel(s.ayahCount)}', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate400)),
                                      const SizedBox(width: 6),
                                      const Text('·', style: TextStyle(color: AppColors.slate300)),
                                      const SizedBox(width: 6),
                                      Text('صفحة ${s.startPage}', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: AppColors.emerald600, fontFamily: 'monospace')),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                              decoration: BoxDecoration(color: AppColors.slate100, borderRadius: BorderRadius.circular(999)),
                              child: Text(s.isMeccan ? 'مكية' : 'مدنية', style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: AppColors.slate500)),
                            ),
                          ],
                        ),
                      ),
                    )),
                if (filteredSurahs.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 24),
                    child: Center(child: Text('لا توجد نتائج مطابقة', style: TextStyle(color: AppColors.slate400, fontWeight: FontWeight.bold))),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
