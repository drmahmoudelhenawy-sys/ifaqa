import 'dart:async';
import 'package:flutter/material.dart';
import '../data/clan_territories.dart';
import '../services/clan_service.dart';
import '../services/cloud_service.dart';
import '../theme/app_colors.dart';
import 'auth_screen.dart';
import 'clan_chat_screen.dart';
import 'clan_form_screen.dart';

String _fmt(int n) {
  if (n >= 1000000) return '${(n / 1000000).toStringAsFixed(n % 1000000 == 0 ? 0 : 1)} مليون';
  final s = n.toString();
  final b = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) b.write(',');
    b.write(s[i]);
  }
  return b.toString();
}

void _toast(BuildContext context, Object e) => ScaffoldMessenger.of(context)
    .showSnackBar(SnackBar(content: Text(e is ClanException ? e.message : e is String ? e : 'تعذر إتمام العملية، تحقق من الاتصال.')));

Widget clanLogo(String badge, {double size = 52}) {
  final asset = logoAsset(badge);
  return ClipRRect(
    borderRadius: BorderRadius.circular(size * 0.3),
    child: asset == null
        ? Container(width: size, height: size, color: Colors.white24, child: Icon(Icons.shield, color: Colors.white, size: size * 0.5))
        : Image.asset(asset, width: size, height: size, fit: BoxFit.cover),
  );
}

/// React `ClansView`: the "rooms" tab of Challenges. Embedded in a scrolling
/// parent, so it lays out as a plain column.
class ClansTab extends StatefulWidget {
  const ClansTab({super.key});

  @override
  State<ClansTab> createState() => _ClansTabState();
}

class _ClansTabState extends State<ClansTab> {
  final _cloud = CloudService.instance;
  StreamSubscription? _idSub;
  String? clanId;
  bool loaded = false;

  @override
  void initState() {
    super.initState();
    _cloud.addListener(_subscribe);
    _subscribe();
  }

  @override
  void dispose() {
    _cloud.removeListener(_subscribe);
    _idSub?.cancel();
    super.dispose();
  }

  void _subscribe() {
    _idSub?.cancel();
    _idSub = null;
    if (_cloud.signedIn) {
      _idSub = ClanService.instance.myClanId().listen((id) {
        if (id != null) ClanService.instance.clearStaleRequest();
        setState(() {
          clanId = id;
          loaded = true;
        });
      }, onError: (_) => setState(() => loaded = true));
    }
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    if (!_cloud.signedIn) return const SignInPrompt(message: 'سجّل الدخول لتنضم إلى رَكْب من رفقاء الخير وتتنافسوا معًا.');
    if (!loaded) return const Padding(padding: EdgeInsets.all(32), child: Center(child: CircularProgressIndicator()));
    return Directionality(
      textDirection: TextDirection.rtl,
      child: clanId == null ? const _ClanBrowser() : _ClanHome(clanId: clanId!),
    );
  }
}

// ------------------------------------------------------------------ browser

class _ClanBrowser extends StatefulWidget {
  const _ClanBrowser();

  @override
  State<_ClanBrowser> createState() => _ClanBrowserState();
}

class _ClanBrowserState extends State<_ClanBrowser> {
  final _svc = ClanService.instance;
  List<Clan>? clans;
  Map<String, dynamic>? pending;
  String query = '';
  StreamSubscription? _a, _b;

  @override
  void initState() {
    super.initState();
    _a = _svc.clans().listen((c) => setState(() => clans = c), onError: (_) => setState(() => clans = const []));
    _b = _svc.myPendingRequest().listen((p) => setState(() => pending = p), onError: (_) {});
  }

  @override
  void dispose() {
    _a?.cancel();
    _b?.cancel();
    super.dispose();
  }

  Future<void> _open(Clan c) async {
    if (pending != null) return _toast(context, 'لديك طلب انضمام معلّق؛ ألغه أولًا لتنضم لركب آخر.');
    if (c.isFull) return _toast(context, 'اكتملت سعة هذا الرَّكْب؛ اختر ركباً آخر.');
    try {
      switch (c.policy) {
        case JoinPolicy.open:
          final ok = await _confirm('الانضمام إلى «${c.name}»؟', 'ستصبح من رفقاء هذا الرَّكْب وتُحسب طاعاتك في رصيده.');
          if (ok == true) await _svc.join(c.id);
        case JoinPolicy.approval:
          final msg = await _ask('طلب انضمام إلى «${c.name}»', 'رسالة قصيرة للقائد (اختياري)');
          if (msg != null) {
            await _svc.requestToJoin(c, msg);
            if (mounted) _toast(context, 'تم إرسال طلب الانضمام إلى قائد الرَّكْب');
          }
        case JoinPolicy.passcode:
          final code = await _ask('الرمز السري لـ «${c.name}»', 'اكتب الرمز', number: true);
          if (code != null) await _svc.join(c.id, passcode: code);
        case JoinPolicy.hybrid:
          final code = await _ask('الانضمام إلى «${c.name}»', 'اكتب الرمز، أو اتركه فارغًا لإرسال طلب للقائد', number: true);
          if (code == null) break;
          if (code.trim().isEmpty) {
            await _svc.requestToJoin(c, '');
            if (mounted) _toast(context, 'تم إرسال طلب الانضمام إلى قائد الرَّكْب');
          } else {
            await _svc.join(c.id, passcode: code);
          }
      }
    } catch (e) {
      if (mounted) _toast(context, e);
    }
  }

  Future<bool?> _confirm(String title, String body) => showDialog<bool>(
        context: context,
        builder: (_) => Directionality(
          textDirection: TextDirection.rtl,
          child: AlertDialog(
            title: Text(title, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
            content: Text(body),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('إلغاء')),
              FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('تأكيد')),
            ],
          ),
        ),
      );

  Future<String?> _ask(String title, String hint, {bool number = false}) {
    final c = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (_) => Directionality(
        textDirection: TextDirection.rtl,
        child: AlertDialog(
          title: Text(title, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
          content: TextField(controller: c, autofocus: true, keyboardType: number ? TextInputType.number : null, decoration: InputDecoration(hintText: hint)),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('إلغاء')),
            FilledButton(onPressed: () => Navigator.pop(context, c.text), child: const Text('متابعة')),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final list = (clans ?? const <Clan>[]).where((c) => query.isEmpty || c.name.contains(query) || c.tag.contains(query)).toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(gradient: const LinearGradient(colors: [Color(0xFF134E3A), Color(0xFF0F172A)]), borderRadius: BorderRadius.circular(28)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('قوافل الخير', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 20)),
              const SizedBox(height: 6),
              Text('انضم إلى رَكْب من رفقاء الطاعة، تعاونوا على التحديات الجماعية وافتحوا معالم الطريق معًا.',
                  style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontWeight: FontWeight.bold, fontSize: 12, height: 1.6)),
              const SizedBox(height: 14),
              FilledButton.icon(
                onPressed: pending != null ? null : () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ClanFormScreen())),
                icon: const Icon(Icons.add),
                label: const Text('تأسيس رَكْب جديد', style: TextStyle(fontWeight: FontWeight.w900)),
                style: FilledButton.styleFrom(backgroundColor: AppColors.amber500, foregroundColor: AppColors.slate900, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
              ),
            ],
          ),
        ),
        if (pending != null) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: AppColors.amber100, borderRadius: BorderRadius.circular(20)),
            child: Row(
              children: [
                const Icon(Icons.hourglass_top, color: AppColors.amber700),
                const SizedBox(width: 10),
                Expanded(child: Text('طلبك للانضمام إلى «${pending!['clanName']}» بانتظار موافقة القائد', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: AppColors.amber800))),
                TextButton(
                  onPressed: () => _svc.cancelRequest(pending!['clanId'] as String).catchError((Object e) { if (context.mounted) _toast(context, e); }),
                  child: const Text('إلغاء'),
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 12),
        TextField(
          onChanged: (v) => setState(() => query = v.trim()),
          decoration: InputDecoration(
            hintText: 'ابحث باسم الرَّكْب أو رقمه...',
            suffixIcon: const Icon(Icons.search),
            filled: true,
            fillColor: Colors.white,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(18), borderSide: const BorderSide(color: AppColors.slate200)),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(18), borderSide: const BorderSide(color: AppColors.slate200)),
          ),
        ),
        const SizedBox(height: 12),
        if (clans == null)
          const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator()))
        else if (list.isEmpty)
          const Padding(padding: EdgeInsets.all(24), child: Text('لا توجد ركائب بعد، كن أول المؤسسين!', textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.slate400)))
        else
          ...list.asMap().entries.map((e) => _clanRow(e.key + 1, e.value)),
      ],
    );
  }

  Widget _clanRow(int rank, Clan c) {
    final (icon, label) = switch (c.policy) {
      JoinPolicy.open => (Icons.lock_open, 'مفتوح'),
      JoinPolicy.approval => (Icons.how_to_reg, 'بموافقة'),
      JoinPolicy.passcode => (Icons.lock, 'برمز'),
      JoinPolicy.hybrid => (Icons.vpn_key, 'رمز أو طلب'),
    };
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        onTap: () => _open(c),
        borderRadius: BorderRadius.circular(24),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24), border: Border.all(color: AppColors.slate100)),
          child: Row(
            children: [
              SizedBox(width: 26, child: Text('$rank', textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.slate400))),
              Container(padding: const EdgeInsets.all(3), decoration: BoxDecoration(gradient: LinearGradient(colors: c.colors), borderRadius: BorderRadius.circular(16)), child: clanLogo(c.badgeIcon, size: 46)),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(c.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.slate800)),
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        Icon(icon, size: 12, color: AppColors.slate400),
                        const SizedBox(width: 3),
                        Text(label, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate400)),
                        const SizedBox(width: 8),
                        const Icon(Icons.groups, size: 12, color: AppColors.slate400),
                        const SizedBox(width: 3),
                        Text('${c.memberCount}/${c.maxCapacity}', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: c.isFull ? AppColors.rose500 : AppColors.slate400)),
                      ],
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(_fmt(c.totalPoints), style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.emerald600)),
                  const Text('نقطة', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppColors.slate400)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ------------------------------------------------------------------ home

enum _Section { members, quests, landmarks, activity }

class _ClanHome extends StatefulWidget {
  final String clanId;
  const _ClanHome({required this.clanId});

  @override
  State<_ClanHome> createState() => _ClanHomeState();
}

class _ClanHomeState extends State<_ClanHome> {
  final _svc = ClanService.instance;
  Clan? clan;
  List<ClanMember> members = const [];
  List<ClanQuest> quests = const [];
  List<JoinRequest> requests = const [];
  _Section section = _Section.members;
  final _subs = <StreamSubscription>[];
  StreamSubscription? _reqSub;

  String get _me => CloudService.instance.user!.uid;
  bool get isLeader => clan?.leaderId == _me;

  @override
  void initState() {
    super.initState();
    final id = widget.clanId;
    _subs.add(_svc.clan(id).listen((c) {
      setState(() => clan = c);
      if (c != null && c.leaderId == _me && _reqSub == null) {
        _reqSub = _svc.joinRequests(id).listen((r) => setState(() => requests = r), onError: (_) {});
      }
    }, onError: (_) {}));
    _subs.add(_svc.members(id).listen((m) => setState(() => members = m), onError: (_) {}));
    _subs.add(_svc.quests(id).listen((q) => setState(() => quests = q), onError: (_) {}));
  }

  @override
  void dispose() {
    for (final s in _subs) {
      s.cancel();
    }
    _reqSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = clan;
    if (c == null) return const Padding(padding: EdgeInsets.all(32), child: Center(child: CircularProgressIndicator()));
    final blessed = activeBlessedTime();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _header(c),
        if (blessed != null) ...[
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(color: AppColors.amber100, borderRadius: BorderRadius.circular(16)),
            child: Row(children: [
              const Icon(Icons.auto_awesome, color: AppColors.amber700, size: 18),
              const SizedBox(width: 8),
              Expanded(child: Text('وقت مبارك الآن: ${blessed.name}، طاعاتك تُضاعف في رصيد الرَّكْب', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 11, color: AppColors.amber800))),
            ]),
          ),
        ],
        if (isLeader && requests.isNotEmpty) ...[
          const SizedBox(height: 10),
          _requests(c),
        ],
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: FilledButton.icon(
                onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => ClanChatScreen(clan: c))),
                icon: const Icon(Icons.forum, size: 18),
                label: const Text('مجلس الرَّكْب', style: TextStyle(fontWeight: FontWeight.w900)),
                style: FilledButton.styleFrom(backgroundColor: AppColors.violet600, padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
              ),
            ),
            const SizedBox(width: 8),
            IconButton.filledTonal(onPressed: () => _menu(c), icon: const Icon(Icons.more_horiz), style: IconButton.styleFrom(padding: const EdgeInsets.all(14))),
          ],
        ),
        const SizedBox(height: 12),
        SegmentedButton<_Section>(
          showSelectedIcon: false,
          segments: const [
            ButtonSegment(value: _Section.members, label: Text('الرفقاء', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900))),
            ButtonSegment(value: _Section.quests, label: Text('التحديات', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900))),
            ButtonSegment(value: _Section.landmarks, label: Text('المعالم', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900))),
            ButtonSegment(value: _Section.activity, label: Text('النشاط', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900))),
          ],
          selected: {section},
          onSelectionChanged: (s) => setState(() => section = s.first),
        ),
        const SizedBox(height: 12),
        switch (section) {
          _Section.members => _members(c),
          _Section.quests => _quests(c),
          _Section.landmarks => _landmarks(c),
          _Section.activity => _activity(c),
        },
      ],
    );
  }

  Widget _header(Clan c) => Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.topRight, end: Alignment.bottomLeft, colors: c.colors), borderRadius: BorderRadius.circular(28)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                clanLogo(c.badgeIcon, size: 62),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(c.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 19)),
                      const SizedBox(height: 2),
                      Text('القائد: ${c.leaderName.isEmpty ? '—' : c.leaderName}', style: TextStyle(color: Colors.white.withValues(alpha: 0.75), fontWeight: FontWeight.bold, fontSize: 11)),
                    ],
                  ),
                ),
              ],
            ),
            if (c.description.isNotEmpty) ...[
              const SizedBox(height: 10),
              Text(c.description, style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontWeight: FontWeight.bold, fontSize: 12, height: 1.6)),
            ],
            const SizedBox(height: 14),
            Row(
              children: [
                _stat(_fmt(c.totalPoints), 'نقاط الرَّكْب'),
                _stat('${c.memberCount}/${c.maxCapacity}', 'الرفقاء'),
                _stat('${c.unlockedTerritories.length}/${territories.length}', 'المعالم'),
              ],
            ),
          ],
        ),
      );

  Widget _stat(String v, String l) => Expanded(
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 3),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(16)),
          child: Column(children: [
            Text(v, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 14)),
            Text(l, style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontWeight: FontWeight.bold, fontSize: 10)),
          ]),
        ),
      );

  Widget _requests(Clan c) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: AppColors.violet300)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('طلبات الانضمام (${requests.length})', style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.violet700)),
            ...requests.map((r) => Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(r.userName, style: const TextStyle(fontWeight: FontWeight.w900)),
                            Text(r.message.isEmpty ? '${_fmt(r.personalXp)} XP' : r.message, maxLines: 2, style: const TextStyle(fontSize: 11, color: AppColors.slate500)),
                          ],
                        ),
                      ),
                      IconButton(onPressed: () => _svc.reject(c.id, r.userId).catchError((Object e) { if (mounted) _toast(context, e); }), icon: const Icon(Icons.close, color: AppColors.rose500)),
                      IconButton.filled(
                        onPressed: () => _svc.accept(c.id, r).catchError((Object e) { if (mounted) _toast(context, e); }),
                        icon: const Icon(Icons.check),
                        style: IconButton.styleFrom(backgroundColor: AppColors.emerald500),
                      ),
                    ],
                  ),
                )),
          ],
        ),
      );

  Widget _members(Clan c) => Column(
        children: members.asMap().entries.map((e) {
          final m = e.value;
          final lvl = memberLevel(m.points);
          final me = m.id == _me;
          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: me ? const Color(0xFFF5F3FF) : Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: me ? AppColors.violet300 : AppColors.slate100)),
            child: Row(
              children: [
                CircleAvatar(
                  backgroundColor: m.isLeader ? AppColors.amber100 : AppColors.slate100,
                  child: m.isLeader ? const Icon(Icons.workspace_premium, color: AppColors.amber600) : Text('${e.key + 1}', style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.slate500)),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(me ? '${m.name} (أنت)' : m.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.slate800)),
                      const SizedBox(height: 2),
                      Text('${lvl.title} · مستوى ${lvl.level}${m.streakDays > 1 ? ' · 🔥 ${m.streakDays} يوم' : ''}', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate500)),
                      const SizedBox(height: 5),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(9),
                        child: LinearProgressIndicator(value: lvl.progress, minHeight: 5, backgroundColor: AppColors.slate100, valueColor: const AlwaysStoppedAnimation(AppColors.emerald500)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                Text(_fmt(m.points), style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.emerald600)),
                if (!me)
                  PopupMenuButton<String>(
                    onSelected: (v) => _memberAction(c, m, v),
                    itemBuilder: (_) => [
                      const PopupMenuItem(value: 'dm', child: Text('مراسلة خاصة')),
                      if (isLeader) const PopupMenuItem(value: 'lead', child: Text('نقل القيادة إليه')),
                      if (isLeader) const PopupMenuItem(value: 'kick', child: Text('إخلاء مقعده', style: TextStyle(color: AppColors.rose600))),
                    ],
                  ),
              ],
            ),
          );
        }).toList(),
      );

  Future<void> _memberAction(Clan c, ClanMember m, String action) async {
    try {
      switch (action) {
        case 'dm':
          await Navigator.of(context).push(MaterialPageRoute(builder: (_) => ClanChatScreen(clan: c, peer: m)));
        case 'lead':
          if (await _confirm('نقل القيادة إلى ${m.name}؟', 'ستصبح عضوًا عاديًا ويصبح هو قائد الرَّكْب.')) await _svc.transferLeadership(c.id, m);
        case 'kick':
          if (await _confirm('إخلاء مقعد ${m.name}؟', 'سيخرج من الرَّكْب ويمكنه الانضمام لركب آخر.')) await _svc.kick(c.id, m.id);
      }
    } catch (e) {
      if (mounted) _toast(context, e);
    }
  }

  Future<bool> _confirm(String title, String body) async =>
      await showDialog<bool>(
        context: context,
        builder: (_) => Directionality(
          textDirection: TextDirection.rtl,
          child: AlertDialog(
            title: Text(title, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
            content: Text(body),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('إلغاء')),
              FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('تأكيد')),
            ],
          ),
        ),
      ) ==
      true;

  Widget _quests(Clan c) => Column(
        children: quests.map((q) {
          final pct = (q.current / q.target).clamp(0.0, 1.0);
          final locked = q.fridayOnly && !isFridayTime();
          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: q.completed ? const Color(0xFFECFDF5) : Colors.white,
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: q.completed ? AppColors.emerald200 : AppColors.slate100),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(child: Text(q.title, style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.slate800))),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(color: AppColors.amber100, borderRadius: BorderRadius.circular(999)),
                      child: Text('+${_fmt(q.bonus)}', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: AppColors.amber800)),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(q.description, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate500, height: 1.5)),
                const SizedBox(height: 10),
                ClipRRect(
                  borderRadius: BorderRadius.circular(9),
                  child: LinearProgressIndicator(value: pct, minHeight: 8, backgroundColor: AppColors.slate100, valueColor: AlwaysStoppedAnimation(q.completed ? AppColors.emerald500 : AppColors.violet500)),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Text('${_fmt(q.current)} / ${_fmt(q.target)} ${questUnits[q.type]}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: AppColors.slate600)),
                    if (q.isWeekly) const Text('  · أسبوعي', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate400)),
                    const Spacer(),
                    if (!q.completed)
                      TextButton(
                        onPressed: locked ? null : () => _contribute(c, q),
                        child: Text(locked ? 'يوم الجمعة' : 'سجّل مساهمة', style: const TextStyle(fontWeight: FontWeight.w900)),
                      )
                    else
                      const Text('اكتمل ✓', style: TextStyle(fontWeight: FontWeight.w900, color: AppColors.emerald600)),
                  ],
                ),
              ],
            ),
          );
        }).toList(),
      );

  Future<void> _contribute(Clan c, ClanQuest q) async {
    int? amount = 1;
    if (q.type != QuestType.collectiveKhatma) {
      final ctrl = TextEditingController();
      final text = await showDialog<String>(
        context: context,
        builder: (_) => Directionality(
          textDirection: TextDirection.rtl,
          child: AlertDialog(
            title: Text(q.title, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15)),
            content: TextField(controller: ctrl, autofocus: true, keyboardType: TextInputType.number, decoration: InputDecoration(hintText: 'عدد (${questUnits[q.type]})')),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context), child: const Text('إلغاء')),
              FilledButton(onPressed: () => Navigator.pop(context, ctrl.text), child: const Text('تسجيل')),
            ],
          ),
        ),
      );
      if (text == null) return;
      amount = int.tryParse(text.trim());
      if (amount == null || amount < 1) {
        if (mounted) _toast(context, 'اكتب عددًا صحيحًا أكبر من صفر.');
        return;
      }
    } else if (!await _confirm('تأكيد قراءة سورة الكهف', 'هل قرأت سورة الكهف اليوم؟ تُحسب مشاركة واحدة لكل رفيق.')) {
      return;
    }
    try {
      final (accepted, bonus) = await _svc.contribute(c.id, q, amount);
      if (!mounted) return;
      _toast(context, bonus > 0 ? 'اكتمل التحدي! نال الرَّكْب $bonus نقطة إضافية' : accepted > 0 ? 'تقبل الله، سُجّلت مساهمتك ($accepted)' : 'هذا التحدي مكتمل بالفعل');
    } catch (e) {
      if (mounted) _toast(context, e);
    }
  }

  Widget _landmarks(Clan c) {
    final next = territories.where((t) => !c.unlockedTerritories.contains(t.id)).toList()..sort((a, b) => a.cost.compareTo(b.cost));
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: clanRealms.map((realm) {
        final list = territories.where((t) => t.realmIndex == realm.index).toList();
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(22), border: Border.all(color: AppColors.slate100)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('الإقليم ${realm.index}: ${realm.name}', style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.slate800)),
              const SizedBox(height: 8),
              ...list.map((t) {
                final unlocked = c.unlockedTerritories.contains(t.id);
                final building = !unlocked && c.territoryProjects.containsKey(t.id);
                final pct = (c.totalPoints / t.cost).clamp(0.0, 1.0);
                final isNext = next.isNotEmpty && next.first.id == t.id;
                return Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Row(
                    children: [
                      Icon(unlocked ? Icons.flag : building ? Icons.construction : Icons.lock_outline,
                          color: unlocked ? AppColors.emerald500 : building ? AppColors.amber500 : AppColors.slate300, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(t.name, style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: unlocked ? AppColors.emerald700 : AppColors.slate700)),
                            Text(unlocked ? t.perk : building ? 'قيد التشييد…' : 'يُفتح عند ${_fmt(t.cost)} نقطة', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate400)),
                            if (isNext && !building) ...[
                              const SizedBox(height: 4),
                              ClipRRect(borderRadius: BorderRadius.circular(9), child: LinearProgressIndicator(value: pct, minHeight: 5, backgroundColor: AppColors.slate100)),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              }),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _activity(Clan c) {
    if (c.activities.isEmpty) {
      return const Padding(padding: EdgeInsets.all(24), child: Text('لا يوجد نشاط بعد. كل طاعة تسجّلها تظهر هنا.', textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.slate400)));
    }
    String ago(DateTime t) {
      final d = DateTime.now().difference(t);
      if (d.inMinutes < 1) return 'الآن';
      if (d.inHours < 1) return 'منذ ${d.inMinutes} د';
      if (d.inDays < 1) return 'منذ ${d.inHours} س';
      return 'منذ ${d.inDays} يوم';
    }

    return Column(
      children: c.activities
          .map((a) => Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18), border: Border.all(color: AppColors.slate100)),
                child: Row(
                  children: [
                    const Icon(Icons.auto_awesome, color: AppColors.amber500, size: 18),
                    const SizedBox(width: 10),
                    Expanded(child: Text(a.message, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.slate700, height: 1.5))),
                    Text(ago(a.time), style: const TextStyle(fontSize: 10, color: AppColors.slate400)),
                  ],
                ),
              ))
          .toList(),
    );
  }

  void _menu(Clan c) {
    showModalBottomSheet(
      context: context,
      builder: (_) => Directionality(
        textDirection: TextDirection.rtl,
        child: SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(leading: const Icon(Icons.tag), title: Text('رقم الرَّكْب: ${c.tag}'), subtitle: c.policy == JoinPolicy.open || !isLeader ? null : Text('الرمز السري: ${c.passcode}')),
              if (isLeader)
                ListTile(
                  leading: const Icon(Icons.settings),
                  title: const Text('إعدادات الرَّكْب'),
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.of(context).push(MaterialPageRoute(builder: (_) => ClanFormScreen(clan: c)));
                  },
                ),
              if (!isLeader || c.memberCount <= 1)
                ListTile(
                  leading: const Icon(Icons.logout, color: AppColors.rose600),
                  title: const Text('مغادرة الرَّكْب', style: TextStyle(color: AppColors.rose600)),
                  onTap: () async {
                    Navigator.pop(context);
                    if (await _confirm('مغادرة الرَّكْب؟', 'ستبقى نقاطك الشخصية، وتُحفظ مساهماتك في رصيد الرَّكْب.')) {
                      _svc.leave(c.id).catchError((Object e) { if (mounted) _toast(context, e); });
                    }
                  },
                ),
              if (isLeader)
                ListTile(
                  leading: const Icon(Icons.delete_forever, color: AppColors.rose600),
                  title: const Text('تفكيك الرَّكْب نهائيًا', style: TextStyle(color: AppColors.rose600)),
                  onTap: () async {
                    Navigator.pop(context);
                    if (await _confirm('تفكيك الرَّكْب؟', 'سيُحذف الرَّكْب وتخرج جميع الرفقاء منه، ولا يمكن التراجع.')) {
                      _svc.disband(c.id).catchError((Object e) { if (mounted) _toast(context, e); });
                    }
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }
}
