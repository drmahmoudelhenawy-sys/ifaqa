import 'package:flutter/material.dart';
import '../data/surahs_data.dart';
import '../models/surah_info.dart';
import '../services/mushaf_service.dart';
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
