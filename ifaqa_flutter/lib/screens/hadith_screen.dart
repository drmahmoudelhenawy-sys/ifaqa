import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/hadith_service.dart';
import '../theme/app_colors.dart';

class HadithScreen extends StatefulWidget {
  const HadithScreen({super.key});

  @override
  State<HadithScreen> createState() => _HadithScreenState();
}

class _HadithScreenState extends State<HadithScreen> {
  HadithCollection selectedCollection = hadithCollections.first;
  List<HadithItem>? hadiths;
  bool loading = false;
  String? error;
  String query = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      loading = true;
      error = null;
      hadiths = null;
    });
    try {
      final result = await fetchHadithEdition(selectedCollection.edition);
      if (!mounted) return;
      setState(() {
        hadiths = result;
        loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        error = 'تعذر تحميل ${selectedCollection.name}. تأكد من اتصال الإنترنت.';
        loading = false;
      });
    }
  }

  List<HadithItem> get _filtered {
    final list = hadiths ?? [];
    if (query.trim().isEmpty) return list;
    return list.where((h) => h.text.contains(query) || h.hadithNumber.toString() == query).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.slate50,
        appBar: AppBar(backgroundColor: AppColors.slate50, elevation: 0, foregroundColor: AppColors.slate800, title: const Text('الأحاديث النبوية', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16)), centerTitle: true),
        body: Column(
          children: [
            SizedBox(
              height: 46,
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                scrollDirection: Axis.horizontal,
                itemCount: hadithCollections.length,
                separatorBuilder: (_, _) => const SizedBox(width: 8),
                itemBuilder: (context, i) {
                  final c = hadithCollections[i];
                  final active = c.id == selectedCollection.id;
                  return InkWell(
                    onTap: () {
                      setState(() => selectedCollection = c);
                      _load();
                    },
                    borderRadius: BorderRadius.circular(14),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: active ? AppColors.emerald600 : Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: active ? Colors.transparent : AppColors.slate200),
                      ),
                      child: Text(c.name, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: active ? Colors.white : AppColors.slate600)),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 10),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: TextField(
                onChanged: (v) => setState(() => query = v),
                textAlign: TextAlign.right,
                decoration: InputDecoration(
                  hintText: 'ابحث في الأحاديث أو برقم الحديث...',
                  prefixIcon: const Icon(Icons.search, size: 18, color: AppColors.slate400),
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(18), borderSide: const BorderSide(color: AppColors.slate200)),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(18), borderSide: const BorderSide(color: AppColors.slate200)),
                ),
              ),
            ),
            const SizedBox(height: 10),
            Expanded(
              child: loading
                  ? const Center(child: CircularProgressIndicator())
                  : error != null
                      ? Center(
                          child: Padding(
                            padding: const EdgeInsets.all(24),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.error_outline, color: AppColors.rose500, size: 32),
                                const SizedBox(height: 10),
                                Text(error!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.slate500, fontWeight: FontWeight.bold)),
                                const SizedBox(height: 14),
                                FilledButton(onPressed: _load, style: FilledButton.styleFrom(backgroundColor: AppColors.emerald600), child: const Text('إعادة المحاولة')),
                              ],
                            ),
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                          itemCount: _filtered.length,
                          itemBuilder: (context, i) {
                            final h = _filtered[i];
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: InkWell(
                                onTap: () => _openHadith(h),
                                borderRadius: BorderRadius.circular(22),
                                child: Container(
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(22), border: Border.all(color: AppColors.slate100)),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                            decoration: BoxDecoration(color: AppColors.emerald50, borderRadius: BorderRadius.circular(999)),
                                            child: Text('حديث ${h.hadithNumber}', style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: AppColors.emerald700, fontFamily: 'monospace')),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 8),
                                      Text(h.text, maxLines: 3, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.slate700, height: 1.7)),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }

  void _openHadith(HadithItem hadith) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => Directionality(
        textDirection: TextDirection.rtl,
        child: DraggableScrollableSheet(
          initialChildSize: 0.6,
          maxChildSize: 0.9,
          minChildSize: 0.3,
          expand: false,
          builder: (context, controller) => Container(
            padding: const EdgeInsets.all(24),
            decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(32))),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    IconButton(icon: const Icon(Icons.copy, size: 18), onPressed: () => Clipboard.setData(ClipboardData(text: hadith.text))),
                    const Spacer(),
                    Text('حديث رقم ${hadith.hadithNumber}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: AppColors.slate800)),
                  ],
                ),
                const SizedBox(height: 14),
                Expanded(
                  child: SingleChildScrollView(
                    controller: controller,
                    child: Text(hadith.text, style: const TextStyle(fontSize: 15, height: 2, fontWeight: FontWeight.w600, color: AppColors.slate800)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
