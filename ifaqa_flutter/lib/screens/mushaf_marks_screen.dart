import 'package:flutter/material.dart';
import '../data/surahs_data.dart';
import '../services/mushaf_layout.dart';
import '../services/mushaf_marks.dart';
import '../services/mushaf_service.dart';
import '../theme/app_colors.dart';
import '../widgets/ayah_tools.dart' show arabicDigits;

/// "علاماتي": bookmarked ayat and highlighted words. Pops with the page number
/// of the tapped entry so the reader can jump to it.
class MushafMarksScreen extends StatelessWidget {
  const MushafMarksScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: DefaultTabController(
        length: 2,
        child: Scaffold(
          backgroundColor: AppColors.slate50,
          appBar: AppBar(
            backgroundColor: AppColors.slate50,
            elevation: 0,
            foregroundColor: AppColors.slate800,
            title: const Text('علاماتي', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
            bottom: const TabBar(
              labelColor: AppColors.emerald700,
              indicatorColor: AppColors.emerald600,
              tabs: [Tab(text: 'العلامات'), Tab(text: 'التظليل')],
            ),
          ),
          body: AnimatedBuilder(
            animation: MushafMarks.instance,
            builder: (context, _) => TabBarView(children: [_bookmarks(context), _highlights(context)]),
          ),
        ),
      ),
    );
  }

  Widget _empty(String text) => Center(child: Text(text, style: const TextStyle(color: AppColors.slate400, fontWeight: FontWeight.bold)));

  Widget _bookmarks(BuildContext context) {
    final items = MushafMarks.instance.bookmarks;
    if (items.isEmpty) return _empty('لا توجد علامات بعد. حدّد آية ثم اضغط أيقونة العلامة.');
    return ListView.builder(
      padding: const EdgeInsets.all(14),
      itemCount: items.length,
      itemBuilder: (_, i) {
        final m = items[i];
        return _MarkTile(
          entry: m,
          leading: const Icon(Icons.bookmark, color: AppColors.emerald600),
          count: 0,
          onDelete: () => MushafMarks.instance.toggleBookmark(m.surah, m.ayah, m.page),
        );
      },
    );
  }

  Widget _highlights(BuildContext context) {
    // One row per ayah that has highlighted words.
    final byAyah = <String, List<MarkEntry>>{};
    for (final m in MushafMarks.instance.highlights) {
      byAyah.putIfAbsent(m.ayahKey, () => []).add(m);
    }
    if (byAyah.isEmpty) return _empty('لا يوجد تظليل بعد. اضغط مطولاً على كلمة لتحديدها وتلوينها.');
    final rows = byAyah.values.toList();
    return ListView.builder(
      padding: const EdgeInsets.all(14),
      itemCount: rows.length,
      itemBuilder: (_, i) {
        final words = rows[i];
        final first = words.first;
        return _MarkTile(
          entry: first,
          leading: Container(
            width: 18,
            height: 18,
            decoration: BoxDecoration(color: Color(kMarkColors[first.color]), shape: BoxShape.circle),
          ),
          count: words.length,
          onDelete: () {
            final ws = [for (final m in words) MushafWord(m.surah, m.ayah, m.position, false, '', '', 0)];
            MushafMarks.instance.setColor(ws, 0, first.page);
          },
        );
      },
    );
  }
}

class _MarkTile extends StatelessWidget {
  final MarkEntry entry;
  final Widget leading;
  final int count;
  final VoidCallback onDelete;
  const _MarkTile({required this.entry, required this.leading, required this.count, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    final surah = quranSurahs[entry.surah - 1];
    return Card(
      elevation: 0,
      color: Colors.white,
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18), side: const BorderSide(color: AppColors.slate100)),
      child: ListTile(
        leading: leading,
        onTap: () => Navigator.of(context).pop(entry.page),
        title: Text('${surah.name} · آية ${arabicDigits(entry.ayah)}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14)),
        subtitle: FutureBuilder<String>(
          future: MushafService.instance.ayahText(entry.surah, entry.ayah, entry.page),
          builder: (context, s) => Text(
            '${s.data ?? ''}\nصفحة ${entry.page}${count > 0 ? ' · $count كلمة' : ''}',
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontFamily: 'Amiri', fontSize: 15, height: 1.6, color: AppColors.slate600),
          ),
        ),
        trailing: IconButton(icon: const Icon(Icons.delete_outline, color: AppColors.slate400), onPressed: onDelete),
      ),
    );
  }
}
