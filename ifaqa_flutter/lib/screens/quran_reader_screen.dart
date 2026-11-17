import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../data/surahs_data.dart';
import '../models/surah_info.dart';
import '../services/app_state.dart';
import '../services/mushaf_service.dart';
import '../services/quran_progress_service.dart';
import '../theme/app_colors.dart';
import '../widgets/ayah_tools.dart';
import '../widgets/mushaf_page_view.dart';
import 'mushaf_marks_screen.dart';

class QuranReaderScreen extends StatefulWidget {
  final int initialPage;
  const QuranReaderScreen({super.key, required this.initialPage});

  factory QuranReaderScreen.surah(SurahInfo surah, {Key? key}) =>
      QuranReaderScreen(key: key, initialPage: surah.startPage);

  @override
  State<QuranReaderScreen> createState() => _QuranReaderScreenState();
}

class _QuranReaderScreenState extends State<QuranReaderScreen> {
  static const String _nightKey = 'mushaf_night';

  late final PageController _pageController;
  late int currentPage;
  final _progress = QuranProgressService.instance;
  final ValueNotifier<int> _secondsOnPage = ValueNotifier(0);
  Timer? _readTimer;
  bool _overlay = true; // shown briefly on open so readers learn it exists
  Timer? _introTimer;
  late bool _night = AppState.instance.flag(_nightKey);

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    currentPage = widget.initialPage;
    _pageController = PageController(initialPage: currentPage - 1);
    _onPageShown(currentPage);
    _introTimer = Timer(const Duration(milliseconds: 2500), () {
      if (mounted) setState(() => _overlay = false);
    });
  }

  @override
  void dispose() {
    _introTimer?.cancel();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    _readTimer?.cancel();
    _secondsOnPage.dispose();
    _pageController.dispose();
    super.dispose();
  }

  void _onPageShown(int page) {
    final mushaf = MushafService.instance;
    mushaf.saveLastReadPage(page);
    for (final p in [page + 1, page - 1, page + 2]) {
      mushaf.preload(p);
    }
    _readTimer?.cancel();
    _secondsOnPage.value = 0;
    if (_progress.readToday(page)) return;
    // A page counts once the reader has stayed on it for 20 seconds.
    _readTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted || currentPage != page) return t.cancel();
      _secondsOnPage.value++;
      if (_secondsOnPage.value >= QuranProgressService.secondsToCount) {
        t.cancel();
        if (_progress.markRead(page) && mounted) {
          setState(() {});
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            duration: const Duration(seconds: 2),
            backgroundColor: AppColors.emerald600,
            content: Text('تقبل الله، صفحة $page +${QuranProgressService.pageXp} XP', textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w900)),
          ));
        }
      }
    });
  }

  void _openTafsir() => showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (_) => PageTafsirSheet(page: currentPage),
      );

  SurahInfo get _surahOfPage => quranSurahs.lastWhere((s) => s.startPage <= currentPage);

  Future<void> _askForPage() async {
    final page = await showDialog<int>(
      context: context,
      builder: (_) => _GoToPageDialog(currentPage: currentPage),
    );
    if (page != null && _pageController.hasClients) _pageController.jumpToPage(page - 1);
  }

  Future<void> _openMarks() async {
    final page = await Navigator.of(context).push<int>(MaterialPageRoute(builder: (_) => const MushafMarksScreen()));
    if (page != null && page >= 1 && page <= MushafService.pageCount && _pageController.hasClients) {
      _pageController.jumpToPage(page - 1);
    }
  }

  void _toggleOverlay() {
    _introTimer?.cancel();
    setState(() => _overlay = !_overlay);
  }

  void _toggleNight() {
    setState(() => _night = !_night);
    AppState.instance.setFlag(_nightKey, _night);
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: _night ? const Color(0xFF15130F) : const Color(0xFFFBF8F1),
        body: Stack(
          children: [
            Positioned.fill(
              child: PageView.builder(
                controller: _pageController,
                itemCount: MushafService.pageCount,
                onPageChanged: (index) {
                  setState(() => currentPage = index + 1);
                  _onPageShown(index + 1);
                },
                itemBuilder: (context, index) => MushafPageView(
                  key: ValueKey(index + 1),
                  page: index + 1,
                  night: _night,
                  onTapBackground: _toggleOverlay,
                ),
              ),
            ),
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: IgnorePointer(
                ignoring: !_overlay,
                child: AnimatedSlide(
                  offset: _overlay ? Offset.zero : const Offset(0, -1),
                  duration: const Duration(milliseconds: 180),
                  child: AnimatedOpacity(
                    opacity: _overlay ? 1 : 0,
                    duration: const Duration(milliseconds: 180),
                    child: _buildHeader(),
                  ),
                ),
              ),
            ),
            Positioned(
              top: MediaQuery.paddingOf(context).top + 8,
              left: 8,
              child: IgnorePointer(
                ignoring: _overlay,
                child: AnimatedOpacity(
                  opacity: _overlay ? 0 : 0.45,
                  duration: const Duration(milliseconds: 180),
                  child: Material(
                    color: _night ? const Color(0xFF3A3528) : const Color(0xFFE8E1CF),
                    shape: const CircleBorder(),
                    child: InkWell(
                      customBorder: const CircleBorder(),
                      onTap: _toggleOverlay,
                      child: SizedBox(
                        width: 36,
                        height: 36,
                        child: Icon(Icons.more_horiz, size: 20, color: _night ? const Color(0xFFE9E1CF) : AppColors.slate700),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    final fg = _night ? const Color(0xFFE9E1CF) : AppColors.slate800;
    return Material(
      color: (_night ? const Color(0xFF211E17) : Colors.white).withValues(alpha: 0.96),
      elevation: 4,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          child: Row(
            children: [
              _action(Icons.chevron_right, 'رجوع', () => Navigator.of(context).pop(), fg),
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('سورة ${_surahOfPage.name}', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: fg)),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'صفحة $currentPage · الجزء ${MushafService.juzOfPage(currentPage)}',
                          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate400),
                        ),
                        const SizedBox(width: 6),
                        if (_progress.readToday(currentPage))
                          const Icon(Icons.check_circle, size: 13, color: AppColors.emerald500)
                        else
                          ValueListenableBuilder<int>(
                            valueListenable: _secondsOnPage,
                            builder: (_, seconds, _) => SizedBox(
                              width: 12,
                              height: 12,
                              child: CircularProgressIndicator(
                                value: seconds / QuranProgressService.secondsToCount,
                                strokeWidth: 2,
                                backgroundColor: AppColors.slate200,
                                color: AppColors.emerald500,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
              _action(Icons.bookmarks_outlined, 'علاماتي', _openMarks, fg),
              _action(_night ? Icons.light_mode_outlined : Icons.dark_mode_outlined, 'الوضع الليلي', _toggleNight, fg),
              _action(Icons.menu_book_outlined, 'تفسير الصفحة', _openTafsir, AppColors.emerald600),
              _action(Icons.numbers, 'انتقال لصفحة', _askForPage, fg),
              _action(Icons.keyboard_arrow_up, 'إخفاء', _toggleOverlay, fg),
            ],
          ),
        ),
      ),
    );
  }

  Widget _action(IconData icon, String tip, VoidCallback onTap, Color color) => IconButton(
        tooltip: tip,
        visualDensity: VisualDensity.compact,
        icon: Icon(icon, size: 22, color: color),
        onPressed: onTap,
      );
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
