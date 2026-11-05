import 'package:flutter/material.dart';
import '../data/athkar_data.dart';
import '../models/zekr.dart';
import '../theme/app_colors.dart';
import '../widgets/zekr_card.dart';

class AthkarScreen extends StatefulWidget {
  final AthkarType type;
  const AthkarScreen({super.key, required this.type});

  @override
  State<AthkarScreen> createState() => _AthkarScreenState();
}

class _AthkarScreenState extends State<AthkarScreen> {
  SituationalCategory? activeCategory;
  final Set<String> completed = {};
  final Map<String, int> tapCounts = {};
  int currentIndex = 0;
  bool isCardView = true;
  double fontSize = 20;

  static const List<double> fontSizes = [16, 20, 24, 28];
  int fontSizeIndex = 1;

  List<Zekr> get list {
    if (widget.type == AthkarType.morning) return morningAdhkar;
    if (widget.type == AthkarType.evening) return eveningAdhkar;
    return activeCategory?.adhkar ?? const [];
  }

  String get title {
    if (widget.type == AthkarType.morning) return 'أذكار الصباح';
    if (widget.type == AthkarType.evening) return 'أذكار المساء';
    return activeCategory?.title ?? 'أدعية وأذكار الأحوال';
  }

  void _handleTap(Zekr zekr) {
    if (completed.contains(zekr.id)) return;
    final newCount = (tapCounts[zekr.id] ?? 0) + 1;
    setState(() => tapCounts[zekr.id] = newCount);

    if (newCount >= zekr.count) {
      setState(() => completed.add(zekr.id));
      if (isCardView && currentIndex < list.length - 1) {
        Future.delayed(const Duration(milliseconds: 320), () {
          if (mounted) setState(() => currentIndex = (currentIndex + 1).clamp(0, list.length - 1));
        });
      }
    }
  }

  void _handleBack() {
    if (widget.type == AthkarType.situational && activeCategory != null) {
      setState(() {
        activeCategory = null;
        completed.clear();
        tapCounts.clear();
        currentIndex = 0;
      });
      return;
    }
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.type == AthkarType.situational && activeCategory == null) {
      return _buildCategoriesGrid();
    }
    return _buildAthkarView();
  }

  Widget _buildCategoriesGrid() {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.slate50,
        body: SafeArea(
          child: Column(
            children: [
              _buildTopHeader(subtitle: 'مقسمة حسب المواقف والأحوال اليومية'),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(colors: [AppColors.emerald600, AppColors.teal600, Color(0xFF047857)]),
                        borderRadius: BorderRadius.circular(28),
                      ),
                      child: const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('أدعية المسلم اليومية', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white)),
                          SizedBox(height: 6),
                          Text(
                            'اختر القسم المناسب لك، وتصفح الأذكار والأدعية بكروت تفاعلية ذكية أو كقائمة مستمرة.',
                            style: TextStyle(fontSize: 12, height: 1.6, fontWeight: FontWeight.bold, color: Colors.white70),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),
                    GridView.count(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisCount: 2,
                      mainAxisSpacing: 14,
                      crossAxisSpacing: 14,
                      childAspectRatio: 0.95,
                      children: situationalCategories.map((cat) {
                        return InkWell(
                          onTap: () => setState(() => activeCategory = cat),
                          borderRadius: BorderRadius.circular(28),
                          child: Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(28),
                              border: Border.all(color: AppColors.slate200),
                            ),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Container(
                                  width: 64,
                                  height: 64,
                                  alignment: Alignment.center,
                                  decoration: BoxDecoration(color: const Color(0xFFF5F3FF), borderRadius: BorderRadius.circular(20)),
                                  child: const Icon(Icons.auto_awesome, color: AppColors.violet600, size: 26),
                                ),
                                const SizedBox(height: 12),
                                Text(cat.title, textAlign: TextAlign.center, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: AppColors.slate800)),
                                const SizedBox(height: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                                  decoration: BoxDecoration(color: AppColors.slate100, borderRadius: BorderRadius.circular(999)),
                                  child: Text('${cat.adhkar.length} أذكار', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: AppColors.violet600)),
                                ),
                              ],
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTopHeader({required String subtitle}) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: AppColors.slate200)),
      ),
      child: Row(
        children: [
          InkWell(
            onTap: _handleBack,
            borderRadius: BorderRadius.circular(16),
            child: Container(
              width: 40,
              height: 40,
              alignment: Alignment.center,
              decoration: BoxDecoration(color: AppColors.slate100, borderRadius: BorderRadius.circular(16)),
              child: const Icon(Icons.chevron_right, size: 22, color: AppColors.slate700),
            ),
          ),
          Expanded(
            child: Column(
              children: [
                Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: AppColors.slate800)),
                Text(subtitle, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate400)),
              ],
            ),
          ),
          const SizedBox(width: 40),
        ],
      ),
    );
  }

  Widget _buildAthkarView() {
    final completedCount = list.where((z) => completed.contains(z.id)).length;
    final progressPercent = list.isEmpty ? 0 : (completedCount / list.length * 100).round();
    final currentZekr = list.isNotEmpty ? list[currentIndex.clamp(0, list.length - 1)] : null;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.slate50,
        body: SafeArea(
          child: Column(
            children: [
              _buildHeader(),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    _buildProgressCard(completedCount, progressPercent),
                    const SizedBox(height: 14),
                    if (list.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(28),
                        alignment: Alignment.center,
                        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(28), border: Border.all(color: AppColors.slate100)),
                        child: const Text('لا توجد أذكار متاحة في هذا القسم حالياً.', style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.slate500)),
                      )
                    else if (isCardView && currentZekr != null)
                      _buildCardMode(currentZekr)
                    else
                      Column(
                        children: list.asMap().entries.map((entry) {
                          final zekr = entry.value;
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 14),
                            child: ZekrCard(
                              zekr: zekr,
                              count: tapCounts[zekr.id] ?? 0,
                              isCompleted: completed.contains(zekr.id),
                              cardIndex: entry.key,
                              totalCards: list.length,
                              fontSize: fontSizes[fontSizeIndex],
                              onTap: () => _handleTap(zekr),
                            ),
                          );
                        }).toList(),
                      ),
                  ],
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
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: AppColors.slate200)),
      ),
      child: Row(
        children: [
          InkWell(
            onTap: _handleBack,
            borderRadius: BorderRadius.circular(16),
            child: Container(
              width: 40,
              height: 40,
              alignment: Alignment.center,
              decoration: BoxDecoration(color: AppColors.slate100, borderRadius: BorderRadius.circular(16)),
              child: const Icon(Icons.chevron_right, size: 22, color: AppColors.slate700),
            ),
          ),
          Expanded(
            child: Column(
              children: [
                Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: AppColors.slate800), overflow: TextOverflow.ellipsis),
                Text(isCardView ? 'اسحب يمينًا ويسارًا للتقليب' : 'قراءة متواصلة للقائمة', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate400)),
              ],
            ),
          ),
          Container(
            decoration: BoxDecoration(color: AppColors.slate100, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.slate200)),
            child: Row(
              children: [
                IconButton(
                  onPressed: fontSizeIndex == 0 ? null : () => setState(() => fontSizeIndex--),
                  icon: const Text('A-', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12)),
                  visualDensity: VisualDensity.compact,
                ),
                IconButton(
                  onPressed: fontSizeIndex == fontSizes.length - 1 ? null : () => setState(() => fontSizeIndex++),
                  icon: const Text('A+', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12)),
                  visualDensity: VisualDensity.compact,
                ),
              ],
            ),
          ),
          const SizedBox(width: 6),
          InkWell(
            onTap: () => setState(() => isCardView = !isCardView),
            borderRadius: BorderRadius.circular(12),
            child: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: isCardView ? const Color(0xFFF5F3FF) : AppColors.slate100,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(isCardView ? Icons.layers : Icons.list, size: 18, color: isCardView ? AppColors.violet700 : AppColors.slate600),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProgressCard(int completedCount, int progressPercent) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24), border: Border.all(color: AppColors.slate100)),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('$completedCount من ${list.length}', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: AppColors.slate800)),
                  const Text('أذكار مكتملة', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate400)),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text('$progressPercent%', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: AppColors.violet600)),
                  const Text('نسبة الإنجاز', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate400)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: progressPercent / 100,
              minHeight: 8,
              backgroundColor: AppColors.slate100,
              valueColor: const AlwaysStoppedAnimation(AppColors.violet600),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCardMode(Zekr currentZekr) {
    return Column(
      children: [
        GestureDetector(
          onHorizontalDragEnd: (details) {
            final velocity = details.primaryVelocity ?? 0;
            if (velocity < -200 && currentIndex < list.length - 1) {
              setState(() => currentIndex++);
            } else if (velocity > 200 && currentIndex > 0) {
              setState(() => currentIndex--);
            }
          },
          child: ZekrCard(
            zekr: currentZekr,
            count: tapCounts[currentZekr.id] ?? 0,
            isCompleted: completed.contains(currentZekr.id),
            cardIndex: currentIndex,
            totalCards: list.length,
            fontSize: fontSizes[fontSizeIndex],
            onTap: () => _handleTap(currentZekr),
          ),
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: currentIndex == 0 ? null : () => setState(() => currentIndex--),
                style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18))),
                icon: const Icon(Icons.chevron_right, size: 18),
                label: const Text('السابق', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12)),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: FilledButton.icon(
                onPressed: currentIndex == list.length - 1 ? null : () => setState(() => currentIndex++),
                style: FilledButton.styleFrom(backgroundColor: AppColors.violet600, padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18))),
                icon: const Icon(Icons.chevron_left, size: 18),
                label: const Text('التالي', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12)),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Wrap(
          alignment: WrapAlignment.center,
          spacing: 6,
          runSpacing: 6,
          children: list.asMap().entries.map((entry) {
            final idx = entry.key;
            final isDone = completed.contains(entry.value.id);
            final isCurrent = idx == currentIndex;
            return InkWell(
              onTap: () => setState(() => currentIndex = idx),
              borderRadius: BorderRadius.circular(999),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: isCurrent ? 22 : 8,
                height: 8,
                decoration: BoxDecoration(
                  color: isCurrent ? AppColors.violet600 : (isDone ? AppColors.emerald500 : AppColors.slate200),
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }
}
