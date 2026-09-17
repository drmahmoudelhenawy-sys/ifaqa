import 'package:flutter/material.dart';
import 'package:qcf_quran_plus/qcf_quran_plus.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/arabic_numbers.dart';
import '../data/quran_metadata.dart';

class QuranSearchSheet extends StatefulWidget {
  final Function(int pageNumber) onSelectPage;

  const QuranSearchSheet({super.key, required this.onSelectPage});

  @override
  State<QuranSearchSheet> createState() => _QuranSearchSheetState();
}

class _QuranSearchSheetState extends State<QuranSearchSheet> {
  final TextEditingController _controller = TextEditingController();
  List<Map> _results = [];
  int _occurrences = 0;
  bool _isSearching = false;

  void _search(String query) {
    if (query.trim().length < 2) {
      setState(() {
        _results = [];
        _occurrences = 0;
      });
      return;
    }

    setState(() => _isSearching = true);

    try {
      final normalized = normalise(query.trim());
      final res = searchWords(normalized);
      setState(() {
        _occurrences = res['occurences'] ?? 0;
        _results = List<Map>.from(res['result'] ?? []);
        _isSearching = false;
      });
    } catch (e) {
      setState(() => _isSearching = false);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          // Search Input
          TextField(
            controller: _controller,
            autofocus: true,
            onChanged: _search,
            decoration: InputDecoration(
              hintText: 'ابحث في كلمات وآيات القرآن الكريم...',
              hintStyle: TextStyle(
                fontFamily: 'Cairo',
                color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                fontSize: 13,
              ),
              prefixIcon: const Icon(Icons.search, color: AppColors.primary),
              suffixIcon: _controller.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, size: 18),
                      onPressed: () {
                        _controller.clear();
                        _search('');
                      },
                    )
                  : null,
              filled: true,
              fillColor: isDark ? AppColors.darkCard : AppColors.lightCard,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide.none,
              ),
            ),
          ),
          const SizedBox(height: 12),
          // Results count
          if (_controller.text.trim().length >= 2)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
              child: Row(
                children: [
                  Text(
                    'نتائج البحث:  ${ArabicNumbers.convert(_occurrences)} موضع',
                    style: TextStyle(
                      fontFamily: 'Cairo',
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                      color: isDark ? AppColors.primaryLight : AppColors.primary,
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 8),
          // Results list
          Expanded(
            child: _isSearching
                ? const Center(child: CircularProgressIndicator())
                : _results.isEmpty
                    ? Center(
                        child: Text(
                          _controller.text.trim().length < 2
                              ? 'اكتب كلمتين أو أكثر للبحث في القرآن'
                              : 'لم يتم العثور على نتائج مطابقة',
                          style: TextStyle(
                            fontFamily: 'Cairo',
                            color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                            fontSize: 13,
                          ),
                        ),
                      )
                    : ListView.separated(
                        itemCount: _results.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (context, index) {
                          final item = _results[index];
                          final pageNum = int.tryParse(item['page'].toString()) ?? 1;
                          final surahNum = int.tryParse(item['surah'].toString()) ?? 1;
                          final ayahNum = int.tryParse(item['verse'].toString()) ?? 1;
                          final surah = QuranMetadata.surahs.firstWhere(
                            (s) => s.number == surahNum,
                            orElse: () => QuranMetadata.surahs.first,
                          );

                          return InkWell(
                            onTap: () {
                              widget.onSelectPage(pageNum);
                              Navigator.pop(context);
                            },
                            borderRadius: BorderRadius.circular(16),
                            child: Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: isDark ? AppColors.darkCard : AppColors.lightCard,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                                ),
                              ),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'سورة ${surah.name} • الآية ${ArabicNumbers.convert(ayahNum)}',
                                          style: const TextStyle(
                                            fontFamily: 'Cairo',
                                            fontWeight: FontWeight.bold,
                                            fontSize: 13,
                                            color: AppColors.primary,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          'الصفحة ${ArabicNumbers.convert(pageNum)}',
                                          style: TextStyle(
                                            fontFamily: 'Cairo',
                                            fontSize: 11,
                                            color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const Icon(Icons.arrow_forward_ios, size: 14, color: AppColors.primary),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
