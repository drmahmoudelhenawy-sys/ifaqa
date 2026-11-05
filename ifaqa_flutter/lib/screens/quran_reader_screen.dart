import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../data/surahs_data.dart';
import '../models/surah_info.dart';
import '../services/mushaf_service.dart';
import '../theme/app_colors.dart';

class QuranReaderScreen extends StatefulWidget {
  final int initialPage;
  const QuranReaderScreen({super.key, required this.initialPage});

  factory QuranReaderScreen.surah(SurahInfo surah, {Key? key}) =>
      QuranReaderScreen(key: key, initialPage: surah.startPage);

  @override
  State<QuranReaderScreen> createState() => _QuranReaderScreenState();
}

class _QuranReaderScreenState extends State<QuranReaderScreen> {
  static const Color _paper = Color(0xFFFBF8F1);

  late final PageController _pageController;
  late int currentPage;

  @override
  void initState() {
    super.initState();
    currentPage = widget.initialPage;
    _pageController = PageController(initialPage: currentPage - 1);
    _onPageShown(currentPage);
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _onPageShown(int page) {
    MushafService.instance.saveLastReadPage(page);
    MushafService.instance.preload(page + 1);
    MushafService.instance.preload(page - 1);
  }

  SurahInfo get _surahOfPage => quranSurahs.lastWhere((s) => s.startPage <= currentPage);

  Future<void> _askForPage() async {
    final page = await showDialog<int>(
      context: context,
      builder: (_) => _GoToPageDialog(currentPage: currentPage),
    );
    if (page != null && _pageController.hasClients) _pageController.jumpToPage(page - 1);
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: _paper,
        body: SafeArea(
          child: Column(
            children: [
              _buildHeader(),
              Expanded(
                child: PageView.builder(
                  controller: _pageController,
                  itemCount: MushafService.pageCount,
                  onPageChanged: (index) {
                    setState(() => currentPage = index + 1);
                    _onPageShown(index + 1);
                  },
                  itemBuilder: (context, index) => _MushafPage(key: ValueKey(index + 1), page: index + 1),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: const BoxDecoration(color: Colors.white, border: Border(bottom: BorderSide(color: AppColors.slate200))),
      child: Row(
        children: [
          InkWell(
            onTap: () => Navigator.of(context).pop(),
            borderRadius: BorderRadius.circular(16),
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: AppColors.slate100, borderRadius: BorderRadius.circular(16)),
              child: const Icon(Icons.chevron_right, size: 20),
            ),
          ),
          Expanded(
            child: Column(
              children: [
                Text('سورة ${_surahOfPage.name}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: AppColors.slate800)),
                Text(
                  'صفحة $currentPage · الجزء ${MushafService.juzOfPage(currentPage)}',
                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate400),
                ),
              ],
            ),
          ),
          InkWell(
            onTap: _askForPage,
            borderRadius: BorderRadius.circular(16),
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: AppColors.slate100, borderRadius: BorderRadius.circular(16)),
              child: const Icon(Icons.numbers, size: 20),
            ),
          ),
        ],
      ),
    );
  }
}

class _GoToPageDialog extends StatefulWidget {
  final int currentPage;
  const _GoToPageDialog({required this.currentPage});

  @override
  State<_GoToPageDialog> createState() => _GoToPageDialogState();
}

class _GoToPageDialogState extends State<_GoToPageDialog> {
  late final TextEditingController _controller = TextEditingController(text: '${widget.currentPage}');

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _submit() {
    final value = int.tryParse(_controller.text.trim());
    if (value != null && value >= 1 && value <= MushafService.pageCount) {
      Navigator.of(context).pop(value);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: AlertDialog(
        title: const Text('الانتقال إلى صفحة', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
        content: TextField(
          controller: _controller,
          autofocus: true,
          keyboardType: TextInputType.number,
          textAlign: TextAlign.center,
          decoration: const InputDecoration(helperText: 'من 1 إلى ${MushafService.pageCount}'),
          onSubmitted: (_) => _submit(),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('إلغاء')),
          FilledButton(
            onPressed: _submit,
            style: FilledButton.styleFrom(backgroundColor: AppColors.emerald600),
            child: const Text('انتقال'),
          ),
        ],
      ),
    );
  }
}

class _MushafPage extends StatefulWidget {
  final int page;
  const _MushafPage({super.key, required this.page});

  @override
  State<_MushafPage> createState() => _MushafPageState();
}

class _MushafPageState extends State<_MushafPage> {
  late Future<Uint8List> _bytes;

  @override
  void initState() {
    super.initState();
    _bytes = MushafService.instance.loadPage(widget.page);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Uint8List>(
      future: _bytes,
      builder: (context, snapshot) {
        if (snapshot.hasError) return _buildError();
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator(color: AppColors.emerald600));
        }
        return InteractiveViewer(
          maxScale: 4,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
            child: Semantics(
              label: 'صفحة ${widget.page} من المصحف',
              image: true,
              child: SvgPicture.memory(
                snapshot.data!,
                width: double.infinity,
                height: double.infinity,
                fit: BoxFit.contain,
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildError() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, color: AppColors.rose500, size: 32),
            const SizedBox(height: 12),
            const Text(
              'تعذر تحميل الصفحة. تأكد من اتصال الإنترنت.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.slate500, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () => setState(() => _bytes = MushafService.instance.loadPage(widget.page)),
              style: FilledButton.styleFrom(backgroundColor: AppColors.emerald600),
              child: const Text('إعادة المحاولة'),
            ),
          ],
        ),
      ),
    );
  }
}
