import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/arabic_numbers.dart';

class AthkarScreen extends StatefulWidget {
  const AthkarScreen({super.key});

  @override
  State<AthkarScreen> createState() => _AthkarScreenState();
}

class _AthkarScreenState extends State<AthkarScreen> {
  Map<String, List<dynamic>> _categories = {};
  String _selectedCategory = 'أذكار الصباح';
  final Map<String, int> _progressCounters = {};
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadAthkar();
  }

  Future<void> _loadAthkar() async {
    try {
      final jsonString = await rootBundle.loadString('assets/data/athkar.json');
      final data = json.decode(jsonString) as Map<String, dynamic>;
      setState(() {
        _categories = data.map((key, value) => MapEntry(key, List<dynamic>.from(value)));
        if (_categories.isNotEmpty) {
          _selectedCategory = _categories.keys.first;
        }
        _isLoading = false;
      });
    } catch (_) {
      setState(() => _isLoading = false);
    }
  }

  void _onThikrTap(String id, int target) {
    HapticFeedback.lightImpact();
    setState(() {
      final current = _progressCounters[id] ?? 0;
      if (current < target) {
        _progressCounters[id] = current + 1;
      }
    });
  }

  void _resetCategory() {
    HapticFeedback.mediumImpact();
    setState(() {
      final list = _categories[_selectedCategory] ?? [];
      for (final item in list) {
        _progressCounters[item['id']] = 0;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final currentList = _categories[_selectedCategory] ?? [];

    return Scaffold(
      appBar: AppBar(
        title: const Text('حصن المسلم والأذكار'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'إعادة تصفير العداد',
            onPressed: _resetCategory,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // Category Chips Selector
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  child: Row(
                    children: _categories.keys.map((cat) {
                      final isSelected = cat == _selectedCategory;
                      return Padding(
                        padding: const EdgeInsets.only(left: 8.0),
                        child: ChoiceChip(
                          label: Text(
                            cat,
                            style: TextStyle(
                              fontFamily: 'Cairo',
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                              color: isSelected
                                  ? Colors.white
                                  : (isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
                            ),
                          ),
                          selected: isSelected,
                          selectedColor: AppColors.primary,
                          backgroundColor: isDark ? AppColors.darkCard : AppColors.lightCard,
                          side: BorderSide(
                            color: isSelected
                                ? AppColors.primary
                                : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
                          ),
                          onSelected: (selected) {
                            if (selected) {
                              setState(() => _selectedCategory = cat);
                            }
                          },
                        ),
                      );
                    }).toList(),
                  ),
                ),

                // Athkar List
                Expanded(
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: currentList.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final item = currentList[index];
                      final id = item['id'].toString();
                      final totalCount = (item['count'] as num?)?.toInt() ?? 1;
                      final currentCount = _progressCounters[id] ?? 0;
                      final isCompleted = currentCount >= totalCount;

                      return InkWell(
                        onTap: () => _onThikrTap(id, totalCount),
                        borderRadius: BorderRadius.circular(20),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 250),
                          padding: const EdgeInsets.all(18),
                          decoration: BoxDecoration(
                            color: isCompleted
                                ? (isDark ? const Color(0xFF0F2A1D) : const Color(0xFFE8F5E9))
                                : (isDark ? AppColors.darkCard : AppColors.lightSurface),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: isCompleted
                                  ? AppColors.emerald
                                  : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
                              width: isCompleted ? 1.5 : 1,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(isDark ? 0.2 : 0.03),
                                blurRadius: 8,
                                offset: const Offset(0, 3),
                              ),
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              // Thikr text
                              Text(
                                item['text'] ?? '',
                                style: TextStyle(
                                  fontFamily: 'Cairo',
                                  fontSize: 16,
                                  height: 1.8,
                                  fontWeight: FontWeight.w600,
                                  color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                                ),
                              ),
                              if (item['description'] != null && item['description'].toString().isNotEmpty) ...[
                                const SizedBox(height: 10),
                                Text(
                                  item['description'],
                                  style: TextStyle(
                                    fontFamily: 'Cairo',
                                    fontSize: 12,
                                    height: 1.4,
                                    color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                                  ),
                                ),
                              ],
                              const SizedBox(height: 14),
                              // Counter Footer
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                                    decoration: BoxDecoration(
                                      color: isCompleted
                                          ? AppColors.emerald
                                          : AppColors.primary,
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Row(
                                      children: [
                                        Icon(
                                          isCompleted ? Icons.check : Icons.touch_app,
                                          color: Colors.white,
                                          size: 16,
                                        ),
                                        const SizedBox(width: 6),
                                        Text(
                                          '${ArabicNumbers.convert(currentCount)} / ${ArabicNumbers.convert(totalCount)}',
                                          style: const TextStyle(
                                            fontFamily: 'Cairo',
                                            fontWeight: FontWeight.bold,
                                            fontSize: 13,
                                            color: Colors.white,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Text(
                                    isCompleted ? 'اكتمل الذكر' : 'انقر للعد',
                                    style: TextStyle(
                                      fontFamily: 'Cairo',
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: isCompleted
                                          ? AppColors.emerald
                                          : (isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
                                    ),
                                  ),
                                ],
                              ),
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
