import 'package:flutter/material.dart';
import '../services/events_service.dart';
import '../theme/app_colors.dart';

/// Admin form for creating or editing a Mawan event (React `AdminEventModal`).
class EventEditorScreen extends StatefulWidget {
  final MawanEvent? event;
  const EventEditorScreen({super.key, this.event});

  @override
  State<EventEditorScreen> createState() => _EventEditorScreenState();
}

class _ZekrDraft {
  final String id;
  final TextEditingController text;
  final TextEditingController xp;
  final TextEditingController fadl;
  _ZekrDraft(EventZekr? z)
      : id = z?.id ?? DateTime.now().microsecondsSinceEpoch.toString(),
        text = TextEditingController(text: z?.text ?? ''),
        xp = TextEditingController(text: '${z?.xp ?? 1}'),
        fadl = TextEditingController(text: z?.fadl ?? '');
}

class _EventEditorScreenState extends State<EventEditorScreen> {
  late final title = TextEditingController(text: widget.event?.title ?? '');
  late final description = TextEditingController(text: widget.event?.description ?? '');
  late final rules = TextEditingController(text: widget.event?.rules ?? '');
  late String icon = widget.event?.icon ?? 'Star';
  late String gradient = widget.event?.gradient ?? eventGradients.first;
  late String status = widget.event?.status ?? 'active';
  late DateTime start = widget.event?.start ?? DateTime.now();
  late DateTime end = widget.event?.end ?? DateTime.now().add(const Duration(days: 7));
  late final List<_ZekrDraft> adhkar = (widget.event?.adhkar ?? const <EventZekr>[]).map(_ZekrDraft.new).toList();
  bool saving = false;

  Future<void> _pickDate(bool isStart) async {
    final base = isStart ? start : end;
    final d = await showDatePicker(context: context, initialDate: base, firstDate: DateTime(2024), lastDate: DateTime(2035));
    if (d == null || !mounted) return;
    final t = await showTimePicker(context: context, initialTime: TimeOfDay.fromDateTime(base));
    final picked = DateTime(d.year, d.month, d.day, t?.hour ?? base.hour, t?.minute ?? base.minute);
    setState(() => isStart ? start = picked : end = picked);
  }

  Future<void> _save() async {
    if (title.text.trim().isEmpty) {
      _toast('اكتب عنوان الفعالية');
      return;
    }
    if (!end.isAfter(start)) {
      _toast('وقت الانتهاء لازم يكون بعد وقت البدء');
      return;
    }
    setState(() => saving = true);
    try {
      await EventsService.instance.save(
        id: widget.event?.id,
        title: title.text.trim(),
        icon: icon,
        gradient: gradient,
        status: status,
        start: start,
        end: end,
        description: description.text.trim(),
        rules: rules.text.trim(),
        adhkar: adhkar
            .where((z) => z.text.text.trim().isNotEmpty)
            .map((z) => EventZekr(id: z.id, text: z.text.text.trim(), xp: int.tryParse(z.xp.text) ?? 1, fadl: z.fadl.text.trim()))
            .toList(),
      );
      if (mounted) Navigator.pop(context);
    } catch (e) {
      _toast('تعذر الحفظ: تأكد من صلاحيات الأدمن.');
    }
    if (mounted) setState(() => saving = false);
  }

  Future<void> _delete() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => Directionality(
        textDirection: TextDirection.rtl,
        child: AlertDialog(
          title: const Text('حذف الفعالية؟'),
          content: const Text('سيتم حذف الفعالية نهائيًا ولا يمكن التراجع.'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('إلغاء')),
            TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('حذف', style: TextStyle(color: AppColors.rose600))),
          ],
        ),
      ),
    );
    if (ok != true) return;
    await EventsService.instance.delete(widget.event!.id);
    if (mounted) Navigator.pop(context);
  }

  void _toast(String m) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));

  String _fmt(DateTime d) => '${d.year}/${d.month}/${d.day}  ${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.slate50,
        appBar: AppBar(
          title: Text(widget.event == null ? 'فعالية جديدة' : 'تعديل الفعالية', style: const TextStyle(fontWeight: FontWeight.w900)),
          actions: [if (widget.event != null) IconButton(icon: const Icon(Icons.delete_outline, color: AppColors.rose600), onPressed: _delete)],
        ),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _field(title, 'عنوان الفعالية'),
            _field(description, 'الوصف', lines: 3),
            _field(rules, 'القوانين', lines: 4),
            const SizedBox(height: 8),
            const Text('الحالة', style: TextStyle(fontWeight: FontWeight.w900)),
            const SizedBox(height: 6),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'draft', label: Text('مسودة')),
                ButtonSegment(value: 'upcoming', label: Text('قادمة')),
                ButtonSegment(value: 'active', label: Text('نشطة')),
                ButtonSegment(value: 'ended', label: Text('منتهية')),
              ],
              selected: {status},
              onSelectionChanged: (s) => setState(() => status = s.first),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(child: _dateTile('البداية', start, () => _pickDate(true))),
                const SizedBox(width: 8),
                Expanded(child: _dateTile('النهاية', end, () => _pickDate(false))),
              ],
            ),
            const SizedBox(height: 14),
            const Text('الأيقونة', style: TextStyle(fontWeight: FontWeight.w900)),
            const SizedBox(height: 6),
            Wrap(
              spacing: 8,
              children: ['Star', 'Trophy', 'BookOpen', 'Calendar']
                  .map((k) => ChoiceChip(label: Icon(eventIcons[k], size: 20), selected: icon == k, onSelected: (_) => setState(() => icon = k)))
                  .toList(),
            ),
            const SizedBox(height: 14),
            const Text('اللون', style: TextStyle(fontWeight: FontWeight.w900)),
            const SizedBox(height: 6),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: eventGradients
                  .map((g) => GestureDetector(
                        onTap: () => setState(() => gradient = g),
                        child: Container(
                          width: 46,
                          height: 46,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(colors: gradientColors(g)),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: gradient == g ? AppColors.slate900 : Colors.transparent, width: 3),
                          ),
                        ),
                      ))
                  .toList(),
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                const Text('أذكار المسابقة', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15)),
                const Spacer(),
                TextButton.icon(onPressed: () => setState(() => adhkar.add(_ZekrDraft(null))), icon: const Icon(Icons.add), label: const Text('إضافة ذكر')),
              ],
            ),
            ...adhkar.map((z) => Card(
                  margin: const EdgeInsets.only(bottom: 10),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      children: [
                        _field(z.text, 'نص الذكر', lines: 2),
                        Row(
                          children: [
                            SizedBox(width: 110, child: _field(z.xp, 'النقاط', number: true)),
                            const SizedBox(width: 8),
                            Expanded(child: _field(z.fadl, 'الفضل (اختياري)')),
                            IconButton(onPressed: () => setState(() => adhkar.remove(z)), icon: const Icon(Icons.close, color: AppColors.rose500)),
                          ],
                        ),
                      ],
                    ),
                  ),
                )),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: saving ? null : _save,
              style: FilledButton.styleFrom(backgroundColor: AppColors.violet600, padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18))),
              child: Text(saving ? 'جارٍ الحفظ...' : 'حفظ الفعالية', style: const TextStyle(fontWeight: FontWeight.w900)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _dateTile(String label, DateTime d, VoidCallback onTap) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.slate200)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(fontSize: 11, color: AppColors.slate500, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Text(_fmt(d), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13)),
            ],
          ),
        ),
      );

  Widget _field(TextEditingController c, String label, {int lines = 1, bool number = false}) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: TextField(
          controller: c,
          maxLines: lines,
          keyboardType: number ? TextInputType.number : null,
          decoration: InputDecoration(
            labelText: label,
            filled: true,
            fillColor: Colors.white,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
          ),
        ),
      );
}
