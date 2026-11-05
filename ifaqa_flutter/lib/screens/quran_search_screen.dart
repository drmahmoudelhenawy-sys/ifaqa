import 'package:flutter/material.dart';
import '../services/quran_search_service.dart';
import '../theme/app_colors.dart';
import 'quran_reader_screen.dart';

class QuranSearchScreen extends StatefulWidget {
  const QuranSearchScreen({super.key});

  @override
  State<QuranSearchScreen> createState() => _QuranSearchScreenState();
}

class _QuranSearchScreenState extends State<QuranSearchScreen> {
  final TextEditingController _controller = TextEditingController();
  List<AyahMatch>? _results;
  bool _loading = false;
  String? _error;
  int _searchId = 0;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _search() async {
    final query = _controller.text.trim();
    if (query.length < 2) {
      setState(() => _error = 'اكتب كلمة من حرفين على الأقل.');
      return;
    }
    final id = ++_searchId;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await searchQuran(query);
      if (!mounted || id != _searchId) return;
      setState(() {
        _results = results;
        _loading = false;
      });
    } catch (_) {
      if (!mounted || id != _searchId) return;
      setState(() {
        _loading = false;
        _error = 'تعذر البحث. تأكد من اتصال الإنترنت.';
      });
    }
  }

  void _openDetails(AyahMatch match) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _AyahDetailsSheet(match: match),
    );
  }

  @override
  Widget build(BuildContext context) {
    final results = _results;
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.slate50,
        appBar: AppBar(
          backgroundColor: AppColors.slate50,
          elevation: 0,
          foregroundColor: AppColors.slate800,
          title: const Text('البحث في القرآن', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
        ),
        body: Padding(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextField(
                controller: _controller,
                autofocus: true,
                textAlign: TextAlign.right,
                textInputAction: TextInputAction.search,
                onSubmitted: (_) => _search(),
                decoration: InputDecoration(
                  hintText: 'ابحث عن كلمة في الآيات...',
                  suffixIcon: IconButton(icon: const Icon(Icons.search, color: AppColors.emerald600), onPressed: _search),
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(18), borderSide: const BorderSide(color: AppColors.slate200)),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(18), borderSide: const BorderSide(color: AppColors.slate200)),
                ),
              ),
              const SizedBox(height: 12),
              if (_loading) const LinearProgressIndicator(color: AppColors.emerald600, backgroundColor: AppColors.slate100),
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.rose500, fontWeight: FontWeight.bold)),
                ),
              if (results != null && _error == null)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Text(
                    results.isEmpty ? 'لا توجد نتائج مطابقة' : '${results.length} نتيجة',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: AppColors.slate500),
                  ),
                ),
              Expanded(
                child: ListView.separated(
                  padding: const EdgeInsets.only(bottom: 24),
                  itemCount: results?.length ?? 0,
                  separatorBuilder: (_, _) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final match = results![index];
                    return InkWell(
                      onTap: () => _openDetails(match),
                      borderRadius: BorderRadius.circular(18),
                      child: Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18), border: Border.all(color: AppColors.slate100)),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('${match.surahName} · آية ${match.ayahNumber}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: AppColors.emerald700)),
                            const SizedBox(height: 6),
                            Text(match.text, style: const TextStyle(fontFamily: 'Amiri', fontSize: 17, height: 1.8, color: AppColors.slate800)),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AyahDetailsSheet extends StatefulWidget {
  final AyahMatch match;
  const _AyahDetailsSheet({required this.match});

  @override
  State<_AyahDetailsSheet> createState() => _AyahDetailsSheetState();
}

class _AyahDetailsSheetState extends State<_AyahDetailsSheet> {
  late final Future<String> _tafsir = fetchTafsir(widget.match.surahNumber, widget.match.ayahNumber);
  bool _opening = false;

  Future<void> _openInMushaf() async {
    setState(() => _opening = true);
    final navigator = Navigator.of(context);
    final messenger = ScaffoldMessenger.of(context);
    try {
      final page = await fetchAyahPage(widget.match.surahNumber, widget.match.ayahNumber);
      navigator.pop();
      navigator.push(MaterialPageRoute(builder: (_) => QuranReaderScreen(initialPage: page)));
    } catch (_) {
      if (mounted) setState(() => _opening = false);
      messenger.showSnackBar(const SnackBar(content: Text('تعذر فتح الصفحة. تأكد من اتصال الإنترنت.')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final match = widget.match;
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Container(
        constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.8),
        padding: const EdgeInsets.all(20),
        decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('${match.surahName} · آية ${match.ayahNumber}', style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.emerald700)),
              const SizedBox(height: 10),
              Text(match.text, style: const TextStyle(fontFamily: 'Amiri', fontSize: 20, height: 1.9, color: AppColors.slate900)),
              const SizedBox(height: 16),
              const Text('التفسير الميسر', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: AppColors.slate500)),
              const SizedBox(height: 6),
              FutureBuilder<String>(
                future: _tafsir,
                builder: (context, snapshot) {
                  if (snapshot.hasError) {
                    return const Text('تعذر تحميل التفسير.', style: TextStyle(color: AppColors.rose500, fontWeight: FontWeight.bold));
                  }
                  if (!snapshot.hasData) {
                    return const LinearProgressIndicator(color: AppColors.emerald600, backgroundColor: AppColors.slate100);
                  }
                  return Text(snapshot.data!, style: const TextStyle(fontSize: 13, height: 1.8, color: AppColors.slate700, fontWeight: FontWeight.w500));
                },
              ),
              const SizedBox(height: 20),
              FilledButton.icon(
                onPressed: _opening ? null : _openInMushaf,
                style: FilledButton.styleFrom(backgroundColor: AppColors.emerald600, padding: const EdgeInsets.symmetric(vertical: 14)),
                icon: const Icon(Icons.menu_book, size: 18),
                label: Text(_opening ? 'جارٍ الفتح...' : 'فتح في المصحف', style: const TextStyle(fontWeight: FontWeight.w900)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
