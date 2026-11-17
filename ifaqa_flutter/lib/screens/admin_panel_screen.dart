import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import '../services/cloud_service.dart';
import '../data/challenges_data.dart';
import '../models/reciter.dart';
import '../services/challenges_service.dart';
import '../services/content_service.dart';
import '../services/events_service.dart';
import '../services/reciter_photo_service.dart';
import '../services/reciter_service.dart';
import '../widgets/reciter_avatar.dart';
import '../theme/app_colors.dart';
import 'event_editor_screen.dart';

/// Admin tools (React `AdminPanel`): users, support inbox, events, home
/// content and announcements. Every write here is checked by `isAdmin()` in
/// firestore.rules, so the screen is only a convenience, never the guard.
/// Also: reciter photos (by URL) and daily challenge editing.
class AdminPanelScreen extends StatelessWidget {
  const AdminPanelScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: DefaultTabController(
        length: 7,
        child: Scaffold(
          backgroundColor: AppColors.slate50,
          appBar: AppBar(
            backgroundColor: AppColors.slate900,
            foregroundColor: Colors.white,
            title: const Text('لوحة الإدارة', style: TextStyle(fontWeight: FontWeight.w900)),
            bottom: const TabBar(
              isScrollable: true,
              labelColor: Colors.white,
              unselectedLabelColor: Colors.white60,
              indicatorColor: AppColors.violet400,
              labelStyle: TextStyle(fontWeight: FontWeight.w900),
              tabs: [Tab(text: 'المستخدمون'), Tab(text: 'الدعم الفني'), Tab(text: 'الفعاليات'), Tab(text: 'المحتوى'), Tab(text: 'التنبيهات'), Tab(text: 'صور القراء'), Tab(text: 'التحديات')],
            ),
          ),
          body: const TabBarView(children: [_UsersTab(), _SupportTab(), _EventsTab(), _ContentTab(), _AnnouncementsTab(), _ReciterPhotosTab(), _ChallengesAdminTab()]),
        ),
      ),
    );
  }
}

FirebaseFirestore get _db => FirebaseFirestore.instance;
String get _base => 'artifacts/${CloudService.appId}';

void _toast(BuildContext context, String m) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));

Future<bool> _confirm(BuildContext context, String text) async =>
    await showDialog<bool>(
      context: context,
      builder: (_) => Directionality(
        textDirection: TextDirection.rtl,
        child: AlertDialog(
          content: Text(text),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('إلغاء')),
            FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('تأكيد')),
          ],
        ),
      ),
    ) ==
    true;

// ---------------------------------------------------------------- users

class _UsersTab extends StatefulWidget {
  const _UsersTab();

  @override
  State<_UsersTab> createState() => _UsersTabState();
}

class _UsersTabState extends State<_UsersTab> {
  String query = '';

  Future<void> _act(QueryDocumentSnapshot<Map<String, dynamic>> d, String action) async {
    final m = d.data();
    final name = (m['name'] as String?) ?? 'مستخدم';
    final profile = _db.doc('$_base/users/${d.id}/stats/profile');
    final board = _db.doc('$_base/public/data/leaderboard/${d.id}');
    try {
      if (action == 'xp') {
        final c = TextEditingController(text: '${m['xp'] ?? 0}');
        final v = await showDialog<String>(
          context: context,
          builder: (_) => Directionality(
            textDirection: TextDirection.rtl,
            child: AlertDialog(
              title: Text('نقاط $name'),
              content: TextField(controller: c, keyboardType: TextInputType.number),
              actions: [
                TextButton(onPressed: () => Navigator.pop(context), child: const Text('إلغاء')),
                FilledButton(onPressed: () => Navigator.pop(context, c.text), child: const Text('حفظ')),
              ],
            ),
          ),
        );
        final xp = int.tryParse(v ?? '');
        if (xp == null || xp < 0) return;
        final batch = _db.batch()
          ..set(profile, {'xp': xp}, SetOptions(merge: true))
          ..set(board, {'xp': xp}, SetOptions(merge: true));
        await batch.commit();
      } else {
        final key = action == 'block' ? 'isBlocked' : 'isAdmin';
        final next = m[key] != true;
        final label = action == 'block' ? (next ? 'حظر' : 'رفع الحظر عن') : (next ? 'ترقية' : 'إزالة صلاحيات المدير من');
        if (!mounted || !await _confirm(context, 'هل أنت متأكد من $label $name؟')) return;
        final batch = _db.batch()
          ..set(profile, {key: next}, SetOptions(merge: true))
          ..set(board, {key: next}, SetOptions(merge: true));
        await batch.commit();
      }
      if (mounted) _toast(context, 'تم الحفظ');
    } catch (_) {
      if (mounted) _toast(context, 'تعذر الحفظ: صلاحيات الأدمن مطلوبة.');
    }
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
      stream: _db.collection('$_base/public/data/leaderboard').orderBy('xp', descending: true).limit(300).snapshots(),
      builder: (context, snap) {
        if (snap.hasError) return const Center(child: Text('تعذر التحميل'));
        if (!snap.hasData) return const Center(child: CircularProgressIndicator());
        final docs = snap.data!.docs.where((d) => query.isEmpty || ((d.data()['name'] as String?) ?? '').contains(query) || d.id.contains(query)).toList();
        return ListView(
          padding: const EdgeInsets.all(12),
          children: [
            TextField(
              onChanged: (v) => setState(() => query = v.trim()),
              decoration: InputDecoration(hintText: 'بحث بالاسم أو المعرّف (${snap.data!.docs.length} مستخدم)', prefixIcon: const Icon(Icons.search), filled: true, fillColor: Colors.white, border: OutlineInputBorder(borderRadius: BorderRadius.circular(14))),
            ),
            const SizedBox(height: 8),
            ...docs.map((d) {
              final m = d.data();
              return Card(
                child: ListTile(
                  title: Text((m['name'] as String?) ?? 'مستخدم', style: const TextStyle(fontWeight: FontWeight.w900)),
                  subtitle: Text('${m['xp'] ?? 0} XP${m['isBlocked'] == true ? ' · محظور' : ''}${m['isAdmin'] == true ? ' · مدير' : ''}'),
                  leading: Icon(m['isBlocked'] == true ? Icons.block : Icons.person, color: m['isBlocked'] == true ? AppColors.rose500 : AppColors.slate400),
                  trailing: PopupMenuButton<String>(
                    onSelected: (a) => _act(d, a),
                    itemBuilder: (_) => [
                      const PopupMenuItem(value: 'xp', child: Text('تعديل النقاط')),
                      PopupMenuItem(value: 'block', child: Text(m['isBlocked'] == true ? 'رفع الحظر' : 'حظر')),
                      PopupMenuItem(value: 'admin', child: Text(m['isAdmin'] == true ? 'إزالة الإدارة' : 'ترقية لمدير')),
                    ],
                  ),
                ),
              );
            }),
          ],
        );
      },
    );
  }
}

// ---------------------------------------------------------------- support

class _SupportTab extends StatefulWidget {
  const _SupportTab();

  @override
  State<_SupportTab> createState() => _SupportTabState();
}

class _SupportTabState extends State<_SupportTab> {
  CollectionReference<Map<String, dynamic>> get _support => _db.collection('$_base/support_messages');

  void _openThread(String userId, String userName, List<QueryDocumentSnapshot<Map<String, dynamic>>> all) {
    final reply = TextEditingController();
    for (final d in all.where((d) => d.data()['userId'] == userId && d.data()['status'] == 'open')) {
      d.reference.update({'status': 'seen'}).catchError((_) {});
    }
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Directionality(
        textDirection: TextDirection.rtl,
        child: Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
          child: SizedBox(
            height: MediaQuery.of(ctx).size.height * 0.75,
            child: Column(
              children: [
                Padding(padding: const EdgeInsets.all(14), child: Text(userName, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16))),
                Expanded(
                  child: StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
                    stream: _support.where('userId', isEqualTo: userId).snapshots(),
                    builder: (context, snap) {
                      final items = [...?snap.data?.docs]..sort((a, b) => _time(a).compareTo(_time(b)));
                      return ListView(
                        padding: const EdgeInsets.all(12),
                        children: items.map((d) {
                          final m = d.data();
                          final isReply = m['reply'] != null && m['message'] == null;
                          return Align(
                            alignment: isReply ? AlignmentDirectional.centerEnd : AlignmentDirectional.centerStart,
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 6),
                              padding: const EdgeInsets.all(10),
                              constraints: const BoxConstraints(maxWidth: 300),
                              decoration: BoxDecoration(color: isReply ? AppColors.violet600 : AppColors.slate100, borderRadius: BorderRadius.circular(14)),
                              child: Text(((m['message'] ?? m['reply']) as String?) ?? '', style: TextStyle(color: isReply ? Colors.white : AppColors.slate800)),
                            ),
                          );
                        }).toList(),
                      );
                    },
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(10),
                  child: Row(children: [
                    Expanded(child: TextField(controller: reply, decoration: const InputDecoration(hintText: 'اكتب ردك...'))),
                    IconButton(
                      icon: const Icon(Icons.send, color: AppColors.violet600),
                      onPressed: () async {
                        final text = reply.text.trim();
                        if (text.isEmpty) return;
                        reply.clear();
                        await _support.add({'userId': userId, 'userName': 'Admin', 'reply': text, 'status': 'replied', 'timestamp': FieldValue.serverTimestamp()});
                      },
                    ),
                  ]),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  static DateTime _time(QueryDocumentSnapshot<Map<String, dynamic>> d) => (d.data()['timestamp'] as Timestamp?)?.toDate() ?? DateTime.now();

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
      stream: _support.orderBy('timestamp', descending: true).limit(300).snapshots(),
      builder: (context, snap) {
        if (snap.hasError) return const Center(child: Text('تعذر التحميل'));
        if (!snap.hasData) return const Center(child: CircularProgressIndicator());
        final docs = snap.data!.docs;
        final threads = <String, (String, String, int)>{};
        for (final d in docs) {
          final m = d.data();
          final uid = (m['userId'] as String?) ?? '';
          if (uid.isEmpty || m['message'] == null) continue;
          final prev = threads[uid];
          final open = m['status'] == 'open' ? 1 : 0;
          threads[uid] = prev == null ? ((m['userName'] as String?) ?? 'مستخدم', (m['message'] as String?) ?? '', open) : (prev.$1, prev.$2, prev.$3 + open);
        }
        if (threads.isEmpty) return const Center(child: Text('لا توجد رسائل دعم'));
        return ListView(
          padding: const EdgeInsets.all(12),
          children: threads.entries
              .map((e) => Card(
                    child: ListTile(
                      onTap: () => _openThread(e.key, e.value.$1, docs),
                      title: Text(e.value.$1, style: const TextStyle(fontWeight: FontWeight.w900)),
                      subtitle: Text(e.value.$2, maxLines: 2, overflow: TextOverflow.ellipsis),
                      trailing: e.value.$3 > 0 ? CircleAvatar(radius: 12, backgroundColor: AppColors.rose500, child: Text('${e.value.$3}', style: const TextStyle(color: Colors.white, fontSize: 11))) : null,
                    ),
                  ))
              .toList(),
        );
      },
    );
  }
}

// ---------------------------------------------------------------- events

class _EventsTab extends StatelessWidget {
  const _EventsTab();

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<MawanEvent>>(
      stream: EventsService.instance.events(),
      builder: (context, snap) {
        if (snap.hasError) return const Center(child: Text('تعذر التحميل'));
        if (!snap.hasData) return const Center(child: CircularProgressIndicator());
        return ListView(
          padding: const EdgeInsets.all(12),
          children: [
            FilledButton.icon(
              onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const EventEditorScreen())),
              icon: const Icon(Icons.add),
              label: const Text('فعالية جديدة'),
            ),
            const SizedBox(height: 8),
            ...snap.data!.map((e) => Card(
                  child: ListTile(
                    leading: CircleAvatar(backgroundColor: e.colors.first, child: Icon(e.iconData, color: Colors.white, size: 18)),
                    title: Text(e.title, style: const TextStyle(fontWeight: FontWeight.w900)),
                    subtitle: Text('${e.status} · ${e.adhkar.length} أذكار'),
                    trailing: const Icon(Icons.edit),
                    onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => EventEditorScreen(event: e))),
                  ),
                )),
          ],
        );
      },
    );
  }
}

// ---------------------------------------------------------------- content

class _ContentTab extends StatelessWidget {
  const _ContentTab();

  Future<void> _add(BuildContext context) async {
    final text = TextEditingController(), explanation = TextEditingController(), source = TextEditingController();
    var type = 'hadith';
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => Directionality(
        textDirection: TextDirection.rtl,
        child: StatefulBuilder(
          builder: (context, set) => AlertDialog(
            title: const Text('محتوى جديد'),
            content: SingleChildScrollView(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                SegmentedButton<String>(
                  segments: const [ButtonSegment(value: 'hadith', label: Text('حديث')), ButtonSegment(value: 'zekr', label: Text('ذكر')), ButtonSegment(value: 'wisdom', label: Text('حكمة'))],
                  selected: {type},
                  onSelectionChanged: (s) => set(() => type = s.first),
                ),
                TextField(controller: text, maxLines: 3, decoration: const InputDecoration(labelText: 'النص')),
                TextField(controller: explanation, maxLines: 2, decoration: const InputDecoration(labelText: 'شرح (اختياري)')),
                TextField(controller: source, decoration: const InputDecoration(labelText: 'المصدر (اختياري)')),
              ]),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('إلغاء')),
              FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('إضافة')),
            ],
          ),
        ),
      ),
    );
    if (ok != true || text.text.trim().isEmpty) return;
    await ContentService.instance.addContent(type, text.text.trim(), explanation.text.trim(), source.text.trim(), 10);
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<ContentItem>>(
      stream: ContentService.instance.allContent(),
      builder: (context, snap) {
        if (snap.hasError) return const Center(child: Text('تعذر التحميل'));
        if (!snap.hasData) return const Center(child: CircularProgressIndicator());
        return ListView(
          padding: const EdgeInsets.all(12),
          children: [
            FilledButton.icon(onPressed: () => _add(context), icon: const Icon(Icons.add), label: const Text('إضافة محتوى للرئيسية')),
            const SizedBox(height: 8),
            ...snap.data!.map((c) => Card(
                  child: ListTile(
                    title: Text(c.text, maxLines: 3, overflow: TextOverflow.ellipsis),
                    subtitle: Text('${c.typeLabel}${c.source.isNotEmpty ? ' · ${c.source}' : ''}'),
                    leading: Switch(value: c.active, onChanged: (v) => ContentService.instance.setContentActive(c.id, v)),
                    trailing: IconButton(
                      icon: const Icon(Icons.delete_outline, color: AppColors.rose500),
                      onPressed: () async {
                        if (await _confirm(context, 'حذف هذا المحتوى نهائيًا؟')) ContentService.instance.deleteContent(c.id);
                      },
                    ),
                  ),
                )),
          ],
        );
      },
    );
  }
}

// ---------------------------------------------------------------- announcements

class _AnnouncementsTab extends StatefulWidget {
  const _AnnouncementsTab();

  @override
  State<_AnnouncementsTab> createState() => _AnnouncementsTabState();
}

class _AnnouncementsTabState extends State<_AnnouncementsTab> {
  final title = TextEditingController();
  final body = TextEditingController();
  bool sending = false;

  Future<void> _post() async {
    if (body.text.trim().isEmpty) return _toast(context, 'يرجى كتابة نص التنبيه أولاً');
    if (!await _confirm(context, 'سيصل هذا التنبيه كإشعار لكل المستخدمين. متابعة؟')) return;
    setState(() => sending = true);
    try {
      await ContentService.instance.postAnnouncement(title.text.trim(), body.text.trim());
      title.clear();
      body.clear();
      if (mounted) _toast(context, 'تم نشر التنبيه');
    } catch (_) {
      if (mounted) _toast(context, 'تعذر النشر');
    }
    if (mounted) setState(() => sending = false);
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<Announcement>>(
      stream: ContentService.instance.announcements(),
      builder: (context, snap) => ListView(
        padding: const EdgeInsets.all(12),
        children: [
          TextField(controller: title, decoration: const InputDecoration(labelText: 'العنوان (اختياري)')),
          TextField(controller: body, maxLines: 3, decoration: const InputDecoration(labelText: 'نص التنبيه')),
          const SizedBox(height: 8),
          FilledButton.icon(onPressed: sending ? null : _post, icon: const Icon(Icons.campaign), label: Text(sending ? 'جارٍ النشر...' : 'نشر وإرسال')),
          const Divider(height: 28),
          if (snap.hasError) const Text('تعذر التحميل'),
          ...?snap.data?.map((a) => Card(
                child: ListTile(
                  title: Text(a.title, style: const TextStyle(fontWeight: FontWeight.w900)),
                  subtitle: Text(a.body, maxLines: 3, overflow: TextOverflow.ellipsis),
                  leading: Switch(value: a.active, onChanged: (v) => ContentService.instance.setAnnouncementActive(a.id, v)),
                  trailing: IconButton(
                    icon: const Icon(Icons.delete_outline, color: AppColors.rose500),
                    onPressed: () async {
                      if (await _confirm(context, 'حذف التنبيه نهائيًا؟')) ContentService.instance.deleteAnnouncement(a.id);
                    },
                  ),
                ),
              )),
        ],
      ),
    );
  }
}

// ------------------------------------------------------- reciter photos
class _ReciterPhotosTab extends StatefulWidget {
  const _ReciterPhotosTab();

  @override
  State<_ReciterPhotosTab> createState() => _ReciterPhotosTabState();
}

class _ReciterPhotosTabState extends State<_ReciterPhotosTab> {
  final svc = ReciterPhotoService.instance;
  List<Reciter> all = [];
  bool loading = true;
  String q = '';

  @override
  void initState() {
    super.initState();
    svc.start();
    fetchReciters().then((l) {
      svc.registerReciters(l);
      if (mounted) setState(() => all = l);
    }).catchError((_) {}).whenComplete(() {
      if (mounted) setState(() => loading = false);
    });
  }

  Future<void> _edit(Reciter r) async {
    final ctrl = TextEditingController(text: svc.storedUrlFor(r.name) ?? '');
    final hasPhoto = svc.storedUrlFor(r.name) != null;
    final action = await showDialog<String>(
      context: context,
      builder: (ctx) => Directionality(
        textDirection: TextDirection.rtl,
        child: StatefulBuilder(
          builder: (ctx, setD) => AlertDialog(
            title: Text(r.name, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15)),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                ReciterAvatar(photoUrl: ctrl.text.trim(), size: 96),
                const SizedBox(height: 12),
                TextField(
                  controller: ctrl,
                  keyboardType: TextInputType.url,
                  textDirection: TextDirection.ltr,
                  onChanged: (_) => setD(() {}),
                  decoration: const InputDecoration(labelText: 'رابط الصورة (https://...)'),
                ),
              ],
            ),
            actions: [
              if (hasPhoto) TextButton(onPressed: () => Navigator.pop(ctx, 'clear'), child: const Text('إزالة', style: TextStyle(color: AppColors.rose500))),
              TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('إلغاء')),
              FilledButton(onPressed: () => Navigator.pop(ctx, 'save'), child: const Text('حفظ')),
            ],
          ),
        ),
      ),
    );
    if (action == null || !mounted) return;
    try {
      if (action == 'save') {
        await svc.setPhoto(r.name, ctrl.text);
        if (mounted) _toast(context, 'تم حفظ الصورة');
      } else {
        await svc.clearPhoto(r.name);
        if (mounted) _toast(context, 'تمت إزالة الصورة');
      }
    } catch (e) {
      if (mounted) _toast(context, e is ArgumentError ? '${e.message}' : 'تعذر الحفظ');
    }
  }

  @override
  Widget build(BuildContext context) {
    final nq = normalizeReciterKey(q);
    final list = (nq.isEmpty ? all : all.where((r) => normalizeReciterKey(r.name).contains(nq))).take(80).toList();
    return ListenableBuilder(
      listenable: svc,
      builder: (_, _) => ListView(
        padding: const EdgeInsets.all(12),
        children: [
          TextField(
            onChanged: (v) => setState(() => q = v),
            decoration: const InputDecoration(labelText: 'ابحث عن قارئ', prefixIcon: Icon(Icons.search)),
          ),
          const SizedBox(height: 8),
          if (loading) const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator())),
          if (!loading && all.isEmpty) const Text('تعذر تحميل قائمة القراء'),
          ...list.map((r) {
            final url = svc.storedUrlFor(r.name);
            return Card(
              child: ListTile(
                leading: ReciterAvatar(photoUrl: url, size: 44),
                title: Text(r.name, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13)),
                subtitle: Text(url == null ? 'بدون صورة مخصصة' : 'صورة مخصصة', style: const TextStyle(fontSize: 11)),
                trailing: const Icon(Icons.edit_outlined),
                onTap: () => _edit(r),
              ),
            );
          }),
        ],
      ),
    );
  }
}

// ------------------------------------------------------------ challenges
class _ChallengesAdminTab extends StatefulWidget {
  const _ChallengesAdminTab();

  @override
  State<_ChallengesAdminTab> createState() => _ChallengesAdminTabState();
}

class _ChallengesAdminTabState extends State<_ChallengesAdminTab> {
  Future<void> _save(List<ChallengeItem> l) async {
    try {
      await ChallengesService.instance.save(l);
    } catch (_) {
      if (mounted) _toast(context, 'تعذر الحفظ');
    }
  }

  Future<void> _edit(List<ChallengeItem> list, ChallengeItem? existing) async {
    final title = TextEditingController(text: existing?.title ?? '');
    final xp = TextEditingController(text: '${existing?.xp ?? 100}');
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => Directionality(
        textDirection: TextDirection.rtl,
        child: AlertDialog(
          title: Text(existing == null ? 'تحدٍّ جديد' : 'تعديل التحدي'),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            TextField(controller: title, decoration: const InputDecoration(labelText: 'عنوان التحدي')),
            TextField(controller: xp, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'النقاط (XP)')),
          ]),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('إلغاء')),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('حفظ')),
          ],
        ),
      ),
    );
    if (ok != true || title.text.trim().isEmpty) return;
    final item = ChallengeItem(id: existing?.id ?? ChallengesService.newId(), title: title.text.trim(), xp: normalizeXp(xp.text));
    final updated = existing == null ? [item, ...list] : [for (final c in list) c.id == existing.id ? item : c];
    await _save(updated);
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<ChallengeItem>>(
      stream: ChallengesService.instance.stream(),
      initialData: ChallengesService.instance.latest,
      builder: (context, snap) {
        final list = snap.data ?? const <ChallengeItem>[];
        return ListView(
          padding: const EdgeInsets.all(12),
          children: [
            Row(children: [
              Expanded(child: FilledButton.icon(onPressed: () => _edit(list, null), icon: const Icon(Icons.add), label: const Text('إضافة تحدٍّ'))),
              const SizedBox(width: 8),
              OutlinedButton(
                onPressed: () async {
                  if (await _confirm(context, 'استعادة قائمة التحديات الافتراضية؟')) _save(List.of(allChallenges));
                },
                child: const Text('افتراضي'),
              ),
            ]),
            const SizedBox(height: 8),
            for (var i = 0; i < list.length; i++)
              Card(
                child: ListTile(
                  title: Text(list[i].title, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13)),
                  subtitle: Text('+${list[i].xp} XP', style: const TextStyle(fontSize: 11)),
                  onTap: () => _edit(list, list[i]),
                  trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_upward, size: 18),
                      onPressed: i == 0 ? null : () => _save([...list]..insert(i - 1, list[i])..removeAt(i + 1)),
                    ),
                    IconButton(
                      icon: const Icon(Icons.arrow_downward, size: 18),
                      onPressed: i == list.length - 1 ? null : () => _save([...list]..insert(i + 2, list[i])..removeAt(i)),
                    ),
                    IconButton(
                      icon: const Icon(Icons.delete_outline, color: AppColors.rose500, size: 20),
                      onPressed: () async {
                        if (await _confirm(context, 'حذف التحدي؟')) _save([...list]..removeAt(i));
                      },
                    ),
                  ]),
                ),
              ),
          ],
        );
      },
    );
  }
}
