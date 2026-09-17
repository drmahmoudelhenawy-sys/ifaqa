import 'package:flutter/material.dart';
import 'package:qcf_quran_plus/qcf_quran_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/arabic_numbers.dart';
import '../data/quran_metadata.dart';
import 'surah_index_screen.dart';
import 'quran_search_sheet.dart';

class QuranPageScreen extends StatefulWidget {
  final int initialPage;

  const QuranPageScreen({super.key, this.initialPage = 1});

  @override
  State<QuranPageScreen> createState() => _QuranPageScreenState();
}

class _QuranPageScreenState extends State<QuranPageScreen> {
  late PageController _pageController;

  int _currentPage = 1;
  bool _isTajweed = true;
  final bool _isNightMode = false;
  bool _showOverlay = true;
  int? _savedBookmarkPage;

  @override
  void initState() {
    super.initState();
    _currentPage = widget.initialPage;
    _pageController = PageController(initialPage: _currentPage - 1);
    _loadSavedData();
  }

  Future<void> _loadSavedData() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _savedBookmarkPage = prefs.getInt('ifaqa_quran_bookmark');
      _isTajweed = prefs.getBool('ifaqa_quran_tajweed') ?? true;
    });
  }

  Future<void> _saveBookmark() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('ifaqa_quran_bookmark', _currentPage);
    setState(() => _savedBookmarkPage = _currentPage);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'تم حفظ العلامة المرجعية عند صفحة ${ArabicNumbers.convert(_currentPage)}',
          style: const TextStyle(fontFamily: 'Cairo'),
        ),
        backgroundColor: AppColors.primary,
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _jumpToPage(int page) {
    if (page < 1 || page > totalPagesCount) return;
    setState(() => _currentPage = page);
    _pageController.jumpToPage(page - 1);
  }

  void _toggleOverlay() {
    setState(() => _showOverlay = !_showOverlay);
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = _isNightMode || Theme.of(context).brightness == Brightness.dark;
    final currentSurah = QuranMetadata.getSurahByPage(_currentPage);
    final currentJuz = QuranMetadata.getJuzByPage(_currentPage);

    return Scaffold(
      backgroundColor: isDark ? AppColors.mushafPaperDark : AppColors.mushafPaperLight,
      body: SafeArea(
        child: Stack(
          children: [
            // The Core Quran Page View (qcf_quran_plus)
            GestureDetector(
              onTap: _toggleOverlay,
              child: QuranPageView(
                pageController: _pageController,
                highlights: const [],
                isTajweed: _isTajweed,
                isDarkMode: isDark,
                pageBackgroundColor: isDark ? AppColors.mushafPaperDark : AppColors.mushafPaperLight,
                onPageChanged: (pageIndex) {
                  setState(() {
                    _currentPage = pageIndex + 1;
                  });
                },
              ),
            ),

            // Top App Bar Overlay
            if (_showOverlay)
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  decoration: BoxDecoration(
                    color: (isDark ? AppColors.darkSurface : AppColors.lightSurface).withOpacity(0.95),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.08),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.menu_book, color: AppColors.primary),
                        tooltip: 'فهرس السور',
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => SurahIndexScreen(onSelectPage: _jumpToPage),
                            ),
                          );
                        },
                      ),
                      IconButton(
                        icon: const Icon(Icons.search, color: AppColors.primary),
                        tooltip: 'بحث في المصحف',
                        onPressed: () {
                          showModalBottomSheet(
                            context: context,
                            isScrollControlled: true,
                            backgroundColor: Colors.transparent,
                            builder: (_) => QuranSearchSheet(onSelectPage: _jumpToPage),
                          );
                        },
                      ),
                      const Spacer(),
                      // Center Title info
                      Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'سورة ${currentSurah.name}',
                            style: TextStyle(
                              fontFamily: 'Cairo',
                              fontWeight: FontWeight.w900,
                              fontSize: 15,
                              color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                            ),
                          ),
                          Text(
                            'الجزء ${ArabicNumbers.convert(currentJuz)} • صفحة ${ArabicNumbers.convert(_currentPage)}',
                            style: TextStyle(
                              fontFamily: 'Cairo',
                              fontSize: 11,
                              color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                            ),
                          ),
                        ],
                      ),
                      const Spacer(),
                      // Tajweed toggle
                      IconButton(
                        icon: Icon(
                          Icons.palette_outlined,
                          color: _isTajweed ? AppColors.accent : (isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
                        ),
                        tooltip: _isTajweed ? 'إيقاف التجويد الملون' : 'تفعيل التجويد الملون',
                        onPressed: () async {
                          setState(() => _isTajweed = !_isTajweed);
                          final prefs = await SharedPreferences.getInstance();
                          await prefs.setBool('ifaqa_quran_tajweed', _isTajweed);
                        },
                      ),
                      // Bookmark button
                      IconButton(
                        icon: Icon(
                          _savedBookmarkPage == _currentPage ? Icons.bookmark : Icons.bookmark_border,
                          color: _savedBookmarkPage == _currentPage ? AppColors.accent : AppColors.primary,
                        ),
                        tooltip: 'حفظ علامة القراءة',
                        onPressed: _saveBookmark,
                      ),
                    ],
                  ),
                ),
              ),

            // Bottom Navigation Overlay
            if (_showOverlay)
              Positioned(
                bottom: 0,
                left: 0,
                right: 0,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: (isDark ? AppColors.darkSurface : AppColors.lightSurface).withOpacity(0.95),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.08),
                        blurRadius: 8,
                        offset: const Offset(0, -2),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Text(
                        ArabicNumbers.convert(1),
                        style: const TextStyle(fontFamily: 'Cairo', fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                      Expanded(
                        child: Slider(
                          value: _currentPage.toDouble(),
                          min: 1,
                          max: totalPagesCount.toDouble(),
                          activeColor: AppColors.primary,
                          inactiveColor: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                          onChanged: (val) {
                            _jumpToPage(val.round());
                          },
                        ),
                      ),
                      Text(
                        ArabicNumbers.convert(totalPagesCount),
                        style: const TextStyle(fontFamily: 'Cairo', fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(width: 8),
                      // Quick Jumper dialog
                      InkWell(
                        onTap: () => _showPageJumperDialog(context),
                        borderRadius: BorderRadius.circular(10),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            'ص ${ArabicNumbers.convert(_currentPage)}',
                            style: const TextStyle(
                              fontFamily: 'Cairo',
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  void _showPageJumperDialog(BuildContext context) {
    final controller = TextEditingController(text: _currentPage.toString());
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text(
          'انتقال إلى صفحة',
          textAlign: TextAlign.center,
          style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold),
        ),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          autofocus: true,
          textAlign: TextAlign.center,
          decoration: const InputDecoration(
            hintText: 'من 1 إلى 604',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('إلغاء', style: TextStyle(fontFamily: 'Cairo')),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: () {
              final page = int.tryParse(controller.text);
              if (page != null && page >= 1 && page <= totalPagesCount) {
                _jumpToPage(page);
              }
              Navigator.pop(ctx);
            },
            child: const Text('انتقال', style: TextStyle(fontFamily: 'Cairo', color: Colors.white)),
          ),
        ],
      ),
    );
  }
}
