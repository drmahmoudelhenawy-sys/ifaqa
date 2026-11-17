import 'dart:async';
import 'package:flutter/material.dart';
import '../services/clan_features.dart';
import '../services/clan_service.dart';
import '../services/cloud_service.dart';
import '../theme/app_colors.dart';
import 'clans_tab.dart' show clanLogo;

void _msg(BuildContext context, Object e) => ScaffoldMessenger.of(context)
    .showSnackBar(SnackBar(content: Text(e is ClanException ? e.message : e is String ? e : 'تعذر إتمام العملية، تحقق من الاتصال.')));

String _n(int v) {
  final s = v.toString();
  final b = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) b.write(',');
    b.write(s[i]);
  }
  return b.toString();
}

BoxDecoration _card({Color color = Colors.white, Color border = AppColors.slate100}) =>
    BoxDecoration(color: color, borderRadius: BorderRadius.circular(22), border: Border.all(color: border));

Future<bool> _confirm(BuildContext context, String title, String body) async =>
    await showDialog<bool>(
      context: context,
      builder: (ctx) => Directionality(
        textDirection: TextDirection.rtl,
        child: AlertDialog(
          title: Text(title, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
          content: Text(body),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('إلغاء')),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('تأكيد')),
          ],
        ),
      ),
    ) ==
    true;

// ------------------------------------------------------------------ sahar

/// "وبالأسحار هم يستغفرون": tonight's lanterns in the clan home.
class SaharLanternsCard extends StatefulWidget {
  final String clanId;
  const SaharLanternsCard({super.key, required this.clanId});

  @override
  State<SaharLanternsCard> createState() => _SaharLanternsCardState();
}

class _SaharLanternsCardState extends State<SaharLanternsCard> {
  Timer? _tick;
  StreamSubscription? _sub;
  List<SaharLantern> lanterns = const [];
  String _night = saharDateKey();
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _listen();
    _tick = Timer.periodic(const Duration(seconds: 30), (_) {
      if (!mounted) return;
      if (saharDateKey() != _night) _listen();
      setState(() {});
    });
  }

  void _listen() {
    _sub?.cancel();
    _night = saharDateKey();
    _sub = ClanService.instance.saharLanterns(widget.clanId, _night).listen((l) {
      if (mounted) setState(() => lanterns = l);
    }, onError: (_) {});
  }

  @override
  void dispose() {
    _tick?.cancel();
    _sub?.cancel();
    super.dispose();
  }

  String _until(int mins) => mins >= 60 ? '${mins ~/ 60} س ${mins % 60} د' : '$mins د';

  Future<void> _light() async {
    setState(() => _busy = true);
    try {
      await ClanService.instance.lightSaharLantern(widget.clanId);
      if (mounted) _msg(context, 'أُوقد قنديلك في محراب الأسحار، تقبل الله');
    } catch (e) {
      if (mounted) _msg(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final active = isSaharActive();
    final me = CloudService.instance.user?.uid;
    final lit = lanterns.any((l) => l.userId == me);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [Color(0xFF1E1B4B), Color(0xFF312E81)], begin: Alignment.topRight, end: Alignment.bottomLeft),
        borderRadius: BorderRadius.circular(22),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(children: [
            const Icon(Icons.nights_stay, color: Color(0xFFFDE68A), size: 20),
            const SizedBox(width: 8),
            const Expanded(child: Text('وبالأسحار هم يستغفرون', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 14))),
            Text(active ? 'مفتوح · ${_until(saharRemainingMinutes())}' : 'يفتح بعد ${_until(minutesUntilSahar())}',
                style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontWeight: FontWeight.bold, fontSize: 10)),
          ]),
          const SizedBox(height: 8),
          if (lanterns.isEmpty)
            Text(active ? 'كن أول من يوقد قنديلاً في محراب الرَّكْب هذه الليلة.' : 'لم يُوقد أحد قنديلاً هذه الليلة بعد. طاعاتك بين 3:30 و5:00 فجراً توقد قنديلك تلقائياً.',
                style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontWeight: FontWeight.bold, fontSize: 11, height: 1.5))
          else
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: lanterns
                  .map((l) => Container(
                        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(999)),
                        child: Row(mainAxisSize: MainAxisSize.min, children: [
                          const Icon(Icons.local_fire_department, size: 13, color: Color(0xFFFDE68A)),
                          const SizedBox(width: 4),
                          Text(l.userName, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 11)),
                        ]),
                      ))
                  .toList(),
            ),
          if (active && !lit) ...[
            const SizedBox(height: 10),
            FilledButton.icon(
              onPressed: _busy ? null : _light,
              icon: const Icon(Icons.local_fire_department, size: 18),
              label: const Text('أوقد قنديلي (استغفار)', style: TextStyle(fontWeight: FontWeight.w900)),
              style: FilledButton.styleFrom(backgroundColor: const Color(0xFFFDE68A), foregroundColor: const Color(0xFF1E1B4B)),
            ),
          ],
        ],
      ),
    );
  }
}

// ----------------------------------------------------------------- khatma

class ClanKhatmaPanel extends StatelessWidget {
  final String clanId;
  const ClanKhatmaPanel({super.key, required this.clanId});

  @override
  Widget build(BuildContext context) {
    final me = CloudService.instance.user?.uid ?? '';
    final svc = ClanService.instance;
    return StreamBuilder<ClanKhatma>(
      stream: svc.khatma(clanId),
      builder: (context, snap) {
        final k = snap.data;
        if (k == null) return const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator()));
        Future<void> run(Future<void> Function() f) async {
          try {
            await f();
          } catch (e) {
            if (context.mounted) _msg(context, e);
          }
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.all(14),
              decoration: _card(color: k.isCompleted ? const Color(0xFFECFDF5) : Colors.white, border: k.isCompleted ? AppColors.emerald200 : AppColors.slate100),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text('الختمة التشاركية رقم ${k.khatmaNumber}', style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.slate800)),
                  const SizedBox(height: 4),
                  const Text('احجز جزءاً (حتى 3 أجزاء جارية) واقرأه في المصحف؛ تُحتسب صفحاتك تلقائياً، وبإتمام الأجزاء الثلاثين تكتمل الختمة.',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate500, height: 1.5)),
                  const SizedBox(height: 10),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(9),
                    child: LinearProgressIndicator(value: k.completedCount / 30, minHeight: 8, backgroundColor: AppColors.slate100, valueColor: const AlwaysStoppedAnimation(AppColors.emerald500)),
                  ),
                  const SizedBox(height: 6),
                  Text('${k.completedCount} / 30 جزءاً · مكافأة الختمة +${_n(khatmaCompleteClanBonus)}',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: AppColors.slate600)),
                  if (k.isCompleted) ...[
                    const SizedBox(height: 8),
                    FilledButton(
                      onPressed: () => run(() => svc.startNextKhatma(clanId)),
                      style: FilledButton.styleFrom(backgroundColor: AppColors.emerald600),
                      child: const Text('ابدأوا الختمة التالية', style: TextStyle(fontWeight: FontWeight.w900)),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 10),
            ...quranJuzs.map((j) {
              final s = k.slots[j.juzNumber]!;
              final mine = s.claimedByUserId == me;
              final Widget trailing;
              if (s.isCompleted) {
                trailing = const Icon(Icons.check_circle, color: AppColors.emerald500);
              } else if (mine) {
                trailing = TextButton(onPressed: () => run(() => svc.releaseJuz(clanId, j.juzNumber)), child: const Text('إلغاء الحجز', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 11)));
              } else if (s.isClaimed) {
                trailing = ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 90),
                  child: Text(s.claimedByName ?? 'رفيق', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: AppColors.slate500)),
                );
              } else {
                trailing = FilledButton.tonal(
                  onPressed: k.isCompleted ? null : () => run(() => svc.claimJuz(clanId, j.juzNumber)),
                  style: FilledButton.styleFrom(visualDensity: VisualDensity.compact),
                  child: const Text('احجز', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12)),
                );
              }
              return Container(
                margin: const EdgeInsets.only(bottom: 6),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: _card(color: mine ? const Color(0xFFF5F3FF) : Colors.white, border: mine ? AppColors.violet300 : AppColors.slate100),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 15,
                      backgroundColor: s.isCompleted ? const Color(0xFFD1FAE5) : AppColors.slate100,
                      child: Text('${j.juzNumber}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: AppColors.slate600)),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(j.name, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: AppColors.slate800)),
                          Text('ص ${j.startPage}–${j.endPage}${mine && !s.isCompleted ? ' · ${s.readPages.length}/${s.totalPages}' : ''}',
                              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate400)),
                          if (mine && !s.isCompleted) ...[
                            const SizedBox(height: 4),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(9),
                              child: LinearProgressIndicator(value: s.progress, minHeight: 4, backgroundColor: AppColors.slate100, valueColor: const AlwaysStoppedAnimation(AppColors.violet500)),
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(width: 6),
                    trailing,
                  ],
                ),
              );
            }),
          ],
        );
      },
    );
  }
}

// ------------------------------------------------------------------ twins

class ClanTwinPanel extends StatefulWidget {
  final Clan clan;
  final bool isLeader;
  const ClanTwinPanel({super.key, required this.clan, required this.isLeader});

  @override
  State<ClanTwinPanel> createState() => _ClanTwinPanelState();
}

class _ClanTwinPanelState extends State<ClanTwinPanel> {
  final _svc = ClanService.instance;
  StreamSubscription? _sub;
  List<TwinPact>? pacts;
  String _lastSync = '';
  bool _busy = false;
  String _project = jointMegaProjects.first.id;

  @override
  void initState() {
    super.initState();
    _sub = _svc.twinPacts(widget.clan.id).listen((p) {
      if (!mounted) return;
      setState(() => pacts = p);
      _sync();
    }, onError: (_) {});
  }

  @override
  void didUpdateWidget(covariant ClanTwinPanel old) {
    super.didUpdateWidget(old);
    _sync();
  }

  /// Keeps this clan's own twin* fields (read by the React app) in step.
  void _sync() {
    final p = pacts;
    if (p == null) return;
    final key = '${desiredTwinFields(widget.clan.id, p)}|${widget.clan.twinFields}';
    if (key == _lastSync) return;
    _lastSync = key;
    unawaited(_svc.syncTwinFields(widget.clan, p));
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  Future<void> _run(Future<String> Function() f) async {
    setState(() => _busy = true);
    try {
      final m = await f();
      if (mounted) _msg(context, m);
    } catch (e) {
      if (mounted) _msg(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _pickClan() async {
    final target = await showModalBottomSheet<Clan>(
      context: context,
      isScrollControlled: true,
      builder: (_) => Directionality(textDirection: TextDirection.rtl, child: _ClanPicker(excludeId: widget.clan.id)),
    );
    if (target == null || !mounted) return;
    final tpl = jointMegaProjects.firstWhere((p) => p.id == _project);
    if (!await _confirm(context, 'مؤاخاة «${target.name}»؟', 'سيصلهم طلب لبناء «${tpl.name}» معاً، ويقرر قائدهم القبول أو الاعتذار.')) return;
    await _run(() => _svc.sendTwinRequest(widget.clan.id, target, _project));
  }

  @override
  Widget build(BuildContext context) {
    final p = pacts;
    if (p == null) return const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator()));
    final me = widget.clan.id;
    final active = p.where((x) => x.isActive).toList();
    final sent = p.where((x) => x.isPending && x.sentBy(me)).toList();
    final received = p.where((x) => x.isPending && !x.sentBy(me)).toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(14),
          decoration: _card(),
          child: const Text('التآخي: يرتبط رَكْبان بميثاق مؤاخاة ويبنيان معاً صرحاً مشتركاً؛ يُضاف 15% من نقاط طاعات كل رفيق إلى الصرح. اقتراح الميثاق وقبوله وفكّه من صلاحية قائدي الرَّكْبَيْن.',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate500, height: 1.6)),
        ),
        const SizedBox(height: 10),
        for (final a in active) _activePact(a, me),
        for (final s in sent) _pendingSent(s, me),
        for (final r in received) _pendingReceived(r, me, canAccept: active.isEmpty),
        if (active.isEmpty && sent.isEmpty) ...[
          const SizedBox(height: 4),
          if (!widget.isLeader)
            const Padding(padding: EdgeInsets.all(8), child: Text('لا يوجد ميثاق مؤاخاة حالياً. يستطيع قائد الرَّكْب اقتراح مؤاخاة مع ركب آخر.', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate500)))
          else
            Container(
              padding: const EdgeInsets.all(14),
              decoration: _card(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text('اقترح مؤاخاة', style: TextStyle(fontWeight: FontWeight.w900, color: AppColors.slate800)),
                  const SizedBox(height: 8),
                  ...jointMegaProjects.map((t) => ListTile(
                        onTap: () => setState(() => _project = t.id),
                        contentPadding: EdgeInsets.zero,
                        dense: true,
                        leading: Icon(_project == t.id ? Icons.radio_button_checked : Icons.radio_button_off, color: AppColors.violet600),
                        title: Text('${t.name} (${_n(t.targetPoints)} نقطة)', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12)),
                        subtitle: Text(t.perk, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                      )),
                  const SizedBox(height: 4),
                  FilledButton.icon(
                    onPressed: _busy ? null : _pickClan,
                    icon: const Icon(Icons.handshake, size: 18),
                    label: const Text('اختر الرَّكْب الشقيق', style: TextStyle(fontWeight: FontWeight.w900)),
                    style: FilledButton.styleFrom(backgroundColor: AppColors.violet600),
                  ),
                ],
              ),
            ),
        ],
      ],
    );
  }

  Widget _activePact(TwinPact a, String me) {
    final pr = a.project;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: _card(color: const Color(0xFFFFFBEB), border: AppColors.amber100),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(children: [
            clanLogo(a.otherBadge(me), size: 40),
            const SizedBox(width: 10),
            Expanded(child: Text('متآخون مع «${a.otherName(me)}»', style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.slate800))),
          ]),
          const SizedBox(height: 10),
          Text(pr.name, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: AppColors.amber800)),
          const SizedBox(height: 2),
          Text(pr.description, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate500, height: 1.5)),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(9),
            child: LinearProgressIndicator(value: pr.progress, minHeight: 9, backgroundColor: Colors.white, valueColor: AlwaysStoppedAnimation(pr.completed ? AppColors.emerald500 : AppColors.amber500)),
          ),
          const SizedBox(height: 6),
          Text('${_n(pr.total)} / ${_n(pr.target)}${pr.completed ? ' · اكتمل الصرح ✓' : ''}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: AppColors.slate600)),
          Text('رَكْبنا ${_n(a.mine(me))} · ${a.otherName(me)} ${_n(a.theirs(me))}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate500)),
          const SizedBox(height: 4),
          Text('الجائزة: ${pr.perk}', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.amber700)),
          if (a.recent.isNotEmpty) ...[
            const SizedBox(height: 8),
            const Text('آخر المساهمات', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: AppColors.slate600)),
            ...a.recent.take(5).map((c) => Text('${c.userName} (${c.clanName}) +${_n(c.points)}', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate500))),
          ],
          if (widget.isLeader)
            Align(
              alignment: AlignmentDirectional.centerEnd,
              child: TextButton(
                onPressed: _busy
                    ? null
                    : () async {
                        if (await _confirm(context, 'فك ميثاق المؤاخاة؟', 'سيُحذف الميثاق والصرح المشترك وتضيع مساهماته.')) await _run(() => _svc.cancelTwinPact(a, me));
                      },
                child: const Text('فك الميثاق', style: TextStyle(color: AppColors.rose600, fontWeight: FontWeight.w900)),
              ),
            ),
        ],
      ),
    );
  }

  Widget _pendingSent(TwinPact s, String me) => Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: _card(),
        child: Row(children: [
          Expanded(child: Text('بانتظار رد «${s.otherName(me)}» على طلب بناء «${s.project.name}»', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: AppColors.slate700))),
          if (widget.isLeader) TextButton(onPressed: _busy ? null : () => _run(() => _svc.cancelTwinPact(s, me)), child: const Text('إلغاء الطلب', style: TextStyle(fontWeight: FontWeight.w900))),
        ]),
      );

  Widget _pendingReceived(TwinPact r, String me, {required bool canAccept}) => Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: _card(border: AppColors.violet300),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('طلب مؤاخاة من «${r.otherName(me)}»', style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.violet700)),
            Text('لبناء ${r.project.name} (${_n(r.project.target)} نقطة)', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate500)),
            if (widget.isLeader) ...[
              const SizedBox(height: 8),
              Row(children: [
                Expanded(child: OutlinedButton(onPressed: _busy ? null : () => _run(() => _svc.respondToTwinRequest(r, me, false)), child: const Text('اعتذار', style: TextStyle(fontWeight: FontWeight.w900)))),
                const SizedBox(width: 8),
                Expanded(
                  child: FilledButton(
                    onPressed: _busy || !canAccept ? null : () => _run(() => _svc.respondToTwinRequest(r, me, true)),
                    style: FilledButton.styleFrom(backgroundColor: AppColors.emerald500),
                    child: const Text('قبول', style: TextStyle(fontWeight: FontWeight.w900)),
                  ),
                ),
              ]),
            ],
          ],
        ),
      );
}

class _ClanPicker extends StatelessWidget {
  final String excludeId;
  const _ClanPicker({required this.excludeId});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: SizedBox(
        height: MediaQuery.of(context).size.height * 0.7,
        child: Column(
          children: [
            const Padding(padding: EdgeInsets.all(14), child: Text('اختر الرَّكْب الشقيق', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15))),
            Expanded(
              child: StreamBuilder<List<Clan>>(
                stream: ClanService.instance.clans(),
                builder: (context, snap) {
                  final list = (snap.data ?? const <Clan>[]).where((c) => c.id != excludeId && c.twinStatus != 'active').toList();
                  if (snap.data == null) return const Center(child: CircularProgressIndicator());
                  if (list.isEmpty) return const Center(child: Text('لا توجد ركاب متاحة للمؤاخاة حالياً.'));
                  return ListView.builder(
                    itemCount: list.length,
                    itemBuilder: (_, i) {
                      final c = list[i];
                      return ListTile(
                        leading: clanLogo(c.badgeIcon, size: 40),
                        title: Text(c.name, style: const TextStyle(fontWeight: FontWeight.w900)),
                        subtitle: Text('${c.memberCount} رفقاء · ${_n(c.totalPoints)} نقطة'),
                        onTap: () => Navigator.pop(context, c),
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
