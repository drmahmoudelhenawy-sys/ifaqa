import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../widgets/coming_soon_tab.dart';
import 'downloads_screen.dart';
import 'hadith_screen.dart';
import 'islamic_calendar_screen.dart';
import 'masbaha_screen.dart';
import 'qibla_compass_tab.dart';
import 'radio_screen.dart';

class _ToolItem {
  final String id;
  final String name;
  final String description;
  final IconData icon;
  final List<Color> tone;
  const _ToolItem({required this.id, required this.name, required this.description, required this.icon, required this.tone});
}

const List<_ToolItem> _tools = [
  _ToolItem(id: 'hadith', name: 'الأحاديث النبوية', description: 'تصفح صحيح البخاري، مسلم، والسنن مع ميزة البحث الفوري والحفظ والتخريج.', icon: Icons.menu_book, tone: [AppColors.emerald500, AppColors.teal600]),
  _ToolItem(id: 'calendar', name: 'التقويم والمناسبات', description: 'تاريخ هجري وميلادي حي مع مواعيد المناسبات الإسلامية، الأيام البيض، والعد التنازلي.', icon: Icons.calendar_month, tone: [Color(0xFFD946EF), Color(0xFF9333EA)]),
  _ToolItem(id: 'radio', name: 'إذاعة القرآن الكريم', description: 'إذاعات كبار القراء، البث المباشر للحرمين الشريفين، وإذاعة القرآن الكريم من القاهرة.', icon: Icons.radio, tone: [Color(0xFF3B82F6), Color(0xFF0891B2)]),
  _ToolItem(id: 'qibla', name: 'اتجاه القبلة', description: 'بوصلة رقمية دقيقة لحساب اتجاه الكعبة المشرفة من موقعك الحالي بدقة المستشعرات.', icon: Icons.explore, tone: [AppColors.amber500, AppColors.orange600]),
  _ToolItem(id: 'masbaha', name: 'المسبحة والعداد الذكي', description: 'تسبيح وذكر مع استجابة اهتزازية ملموسة، أذكار مأثورة، وحفظ سجل التسبيحات.', icon: Icons.local_fire_department, tone: [AppColors.teal600, Color(0xFF047857)]),
  _ToolItem(id: 'downloads', name: 'مركز التنزيلات أوفلاين', description: 'إدارة تفاسير القرآن، تلاوات المشايخ، وكتب الحديث الشريف للعمل بدون اتصال إنترنت.', icon: Icons.cloud_download, tone: [Color(0xFF0EA5E9), AppColors.indigo600]),
];

class ToolsTab extends StatefulWidget {
  const ToolsTab({super.key});

  @override
  State<ToolsTab> createState() => _ToolsTabState();
}

class _ToolsTabState extends State<ToolsTab> {
  final TextEditingController searchController = TextEditingController();
  String query = '';

  @override
  void dispose() {
    searchController.dispose();
    super.dispose();
  }

  void _openTool(_ToolItem tool) {
    if (tool.id == 'masbaha') {
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => const MasbahaScreen()));
      return;
    }
    if (tool.id == 'downloads') {
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => const DownloadsScreen()));
      return;
    }
    if (tool.id == 'hadith') {
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => const HadithScreen()));
      return;
    }
    if (tool.id == 'radio') {
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => const RadioScreen()));
      return;
    }
    if (tool.id == 'calendar') {
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => const IslamicCalendarScreen()));
      return;
    }
    if (tool.id == 'qibla') {
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => Directionality(
            textDirection: TextDirection.rtl,
            child: Scaffold(
              backgroundColor: AppColors.slate50,
              appBar: AppBar(backgroundColor: AppColors.slate50, elevation: 0, foregroundColor: AppColors.slate800, title: const Text('اتجاه القبلة', style: TextStyle(fontWeight: FontWeight.w900))),
              body: const Padding(padding: EdgeInsets.all(16), child: QiblaCompassTab()),
            ),
          )));
      return;
    }
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => Directionality(
        textDirection: TextDirection.rtl,
        child: Container(
          margin: const EdgeInsets.all(16),
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(28)),
          child: ComingSoonTab(icon: tool.icon, title: tool.name),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _tools.where((t) {
      final q = query.trim().toLowerCase();
      if (q.isEmpty) return true;
      return t.name.toLowerCase().contains(q) || t.description.toLowerCase().contains(q);
    }).toList();

    return Directionality(
      textDirection: TextDirection.rtl,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(color: const Color(0xFFF5F3FF), borderRadius: BorderRadius.circular(999)),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.grid_view, size: 13, color: AppColors.violet600),
                SizedBox(width: 6),
                Text('مكتبة الأدوات الشاملة', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: AppColors.violet700)),
              ],
            ),
          ),
          const SizedBox(height: 10),
          const Text('أدوات إفاقة', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: AppColors.slate900)),
          const SizedBox(height: 4),
          const Text('أدوات روحية وعملية جاهزة للعبادة والمعرفة والتنقل اليومي.', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate500)),
          const SizedBox(height: 16),
          TextField(
            controller: searchController,
            onChanged: (v) => setState(() => query = v),
            textAlign: TextAlign.right,
            decoration: InputDecoration(
              hintText: 'ابحث في الأدوات...',
              prefixIcon: query.isNotEmpty
                  ? IconButton(icon: const Icon(Icons.close, size: 18), onPressed: () => setState(() { query = ''; searchController.clear(); }))
                  : null,
              suffixIcon: const Icon(Icons.search, size: 18, color: AppColors.slate400),
              filled: true,
              fillColor: Colors.white,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(18), borderSide: const BorderSide(color: AppColors.slate200)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(18), borderSide: const BorderSide(color: AppColors.slate200)),
            ),
          ),
          const SizedBox(height: 16),
          ...filtered.map((tool) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: InkWell(
                  onTap: () => _openTool(tool),
                  borderRadius: BorderRadius.circular(32),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(32), border: Border.all(color: AppColors.slate100)),
                    child: Row(
                      children: [
                        Container(
                          width: 50,
                          height: 50,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(gradient: LinearGradient(colors: tool.tone), borderRadius: BorderRadius.circular(18)),
                          child: Icon(tool.icon, color: Colors.white, size: 24),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(tool.name, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: AppColors.slate900)),
                              const SizedBox(height: 3),
                              Text(tool.description, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate500, height: 1.4)),
                            ],
                          ),
                        ),
                        const Icon(Icons.chevron_left, color: AppColors.slate300),
                      ],
                    ),
                  ),
                ),
              )),
        ],
      ),
    );
  }
}
