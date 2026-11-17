import 'package:flutter/material.dart';
import '../services/clan_service.dart';
import '../theme/app_colors.dart';

/// Create a clan, or edit one as its leader.
class ClanFormScreen extends StatefulWidget {
  final Clan? clan;
  const ClanFormScreen({super.key, this.clan});

  @override
  State<ClanFormScreen> createState() => _ClanFormScreenState();
}

class _ClanFormScreenState extends State<ClanFormScreen> {
  late final name = TextEditingController(text: widget.clan?.name ?? '');
  late final description = TextEditingController(text: widget.clan?.description ?? '');
  late final passcode = TextEditingController(text: widget.clan?.passcode ?? '');
  late String badge = widget.clan?.badgeIcon.isNotEmpty == true ? widget.clan!.badgeIcon : clanLogos.first;
  late String banner = widget.clan?.bannerColor.isNotEmpty == true ? widget.clan!.bannerColor : bannerCss(clanBanners.first);
  late JoinPolicy policy = widget.clan?.policy ?? JoinPolicy.open;
  bool saving = false;

  bool get needsCode => policy == JoinPolicy.passcode || policy == JoinPolicy.hybrid;

  Future<void> _save() async {
    final err = ClanService.validate(name.text, description.text, policy, passcode.text);
    if (err != null) return _toast(err);
    setState(() => saving = true);
    try {
      final svc = ClanService.instance;
      if (widget.clan == null) {
        await svc.create(name: name.text, description: description.text, badge: badge, banner: banner, policy: policy, passcode: passcode.text);
      } else {
        await svc.updateSettings(widget.clan!.id, name: name.text, description: description.text, badge: badge, banner: banner, policy: policy, passcode: passcode.text);
      }
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      _toast(e is ClanException ? e.message : 'تعذر الحفظ، تحقق من الاتصال.');
    }
    if (mounted) setState(() => saving = false);
  }

  void _toast(String m) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));

  @override
  Widget build(BuildContext context) {
    final colors = bannerColors(banner);
    final logo = logoAsset(badge);
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.slate50,
        appBar: AppBar(title: Text(widget.clan == null ? 'تأسيس رَكْب جديد' : 'إعدادات الرَّكْب', style: const TextStyle(fontWeight: FontWeight.w900))),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(gradient: LinearGradient(colors: colors), borderRadius: BorderRadius.circular(28)),
              child: Row(
                children: [
                  if (logo != null) ClipRRect(borderRadius: BorderRadius.circular(16), child: Image.asset(logo, width: 64, height: 64, fit: BoxFit.cover)),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Text(name.text.isEmpty ? 'اسم الرَّكْب' : name.text, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 18)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            _field(name, 'اسم الرَّكْب (3 إلى 32 حرفًا)', maxLength: 32),
            _field(description, 'وصف قصير (اختياري)', lines: 2, maxLength: 160),
            const Text('الشعار', style: TextStyle(fontWeight: FontWeight.w900)),
            const SizedBox(height: 8),
            SizedBox(
              height: 64,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: clanLogos.length,
                separatorBuilder: (_, _) => const SizedBox(width: 8),
                itemBuilder: (_, i) {
                  final l = clanLogos[i];
                  return GestureDetector(
                    onTap: () => setState(() => badge = l),
                    child: Container(
                      decoration: BoxDecoration(borderRadius: BorderRadius.circular(16), border: Border.all(color: l == badge ? AppColors.violet600 : Colors.transparent, width: 3)),
                      child: ClipRRect(borderRadius: BorderRadius.circular(13), child: Image.asset(logoAsset(l)!, width: 56, height: 56, fit: BoxFit.cover)),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 16),
            const Text('لون الراية', style: TextStyle(fontWeight: FontWeight.w900)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: clanBanners.map((b) {
                final css = bannerCss(b);
                final selected = bannerColors(banner).first == b.colors.first;
                return GestureDetector(
                  onTap: () => setState(() => banner = css),
                  child: Column(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(colors: b.colors),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: selected ? AppColors.violet600 : Colors.transparent, width: 3),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(b.name, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppColors.slate500)),
                    ],
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 16),
            const Text('طريقة الانضمام', style: TextStyle(fontWeight: FontWeight.w900)),
            const SizedBox(height: 8),
            RadioGroup<JoinPolicy>(
              groupValue: policy,
              onChanged: (v) => setState(() => policy = v ?? policy),
              child: Column(
                children: [
                  (JoinPolicy.open, 'مفتوح للجميع', 'أي رفيق يمكنه الانضمام مباشرة'),
                  (JoinPolicy.approval, 'بموافقة القائد', 'يرسل الرفيق طلبًا وتوافق عليه'),
                  (JoinPolicy.passcode, 'برمز سري', 'الانضمام لمن يعرف الرمز فقط'),
                  (JoinPolicy.hybrid, 'رمز أو طلب', 'بالرمز مباشرة أو بطلب للقائد'),
                ]
                    .map((p) => RadioListTile<JoinPolicy>(
                          value: p.$1,
                          title: Text(p.$2, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13)),
                          subtitle: Text(p.$3, style: const TextStyle(fontSize: 11)),
                          contentPadding: EdgeInsets.zero,
                        ))
                    .toList(),
              ),
            ),
            if (needsCode) _field(passcode, 'الرمز السري (4 خانات على الأقل)', number: true),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: saving ? null : _save,
              style: FilledButton.styleFrom(backgroundColor: AppColors.violet600, padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18))),
              child: Text(saving ? 'جارٍ الحفظ...' : (widget.clan == null ? 'تأسيس الرَّكْب' : 'حفظ التعديلات'), style: const TextStyle(fontWeight: FontWeight.w900)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _field(TextEditingController c, String label, {int lines = 1, int? maxLength, bool number = false}) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: TextField(
          controller: c,
          maxLines: lines,
          maxLength: maxLength,
          onChanged: (_) => setState(() {}),
          keyboardType: number ? TextInputType.number : null,
          decoration: InputDecoration(labelText: label, filled: true, fillColor: Colors.white, border: OutlineInputBorder(borderRadius: BorderRadius.circular(14))),
        ),
      );
}
