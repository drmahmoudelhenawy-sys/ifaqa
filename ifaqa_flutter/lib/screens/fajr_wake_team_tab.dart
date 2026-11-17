import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/app_state.dart';
import '../services/clan_service.dart';
import '../services/cloud_service.dart';
import '../theme/app_colors.dart';
import 'auth_screen.dart';

/// "أيقظني": clan mates share a phone number for Fajr wake-up calls and mark
/// themselves awake (React `FajrWakePanel`, `ifaqa_fajr_teams/{clanId}`).
///
/// React's other screen, `FajrWakeGroupsView`, uses `fajr_wake_groups`, which
/// the rules close to everyone but admins (its documents hold PINs), so the
/// clan team is the working way to wake each other.
class FajrWakeTeamTab extends StatefulWidget {
  const FajrWakeTeamTab({super.key});

  @override
  State<FajrWakeTeamTab> createState() => _FajrWakeTeamTabState();
}

class _WakeMember {
  final String id;
  final String name;
  final String phone;
  final String awakeDate;
  const _WakeMember(this.id, this.name, this.phone, this.awakeDate);
}

String _today() => AppState.dateKey(DateTime.now());

/// Accepts Arabic digits and spaces; requires an international number.
String? normalizePhone(String value) {
  final phone = value.replaceAllMapped(RegExp('[٠-٩]'), (m) => '${m[0]!.codeUnitAt(0) - 1632}').replaceAll(RegExp(r'[\s()-]'), '');
  return RegExp(r'^\+[1-9]\d{7,14}$').hasMatch(phone) ? phone : null;
}

class _FajrWakeTeamTabState extends State<FajrWakeTeamTab> {
  final _cloud = CloudService.instance;
  String? clanId;
  bool loaded = false;
  List<_WakeMember> team = const [];
  String? error;
  StreamSubscription? _clanSub, _teamSub;

  FirebaseFirestore get _db => FirebaseFirestore.instance;
  DocumentReference<Map<String, dynamic>> _me(String clan) => _db.doc('ifaqa_fajr_teams/$clan/members/${_cloud.user!.uid}');

  @override
  void initState() {
    super.initState();
    _cloud.addListener(_subscribe);
    _subscribe();
  }

  @override
  void dispose() {
    _cloud.removeListener(_subscribe);
    _clanSub?.cancel();
    _teamSub?.cancel();
    super.dispose();
  }

  void _subscribe() {
    _clanSub?.cancel();
    _teamSub?.cancel();
    if (_cloud.signedIn) {
      _clanSub = ClanService.instance.myClanId().listen((id) {
        _teamSub?.cancel();
        if (id != null) {
          _teamSub = _db.collection('ifaqa_fajr_teams/$id/members').snapshots().listen(
                (s) => setState(() {
                  team = s.docs
                      .map((d) => _WakeMember(d.id, (d.data()['name'] as String?) ?? 'رفيق', (d.data()['phone'] as String?) ?? '', (d.data()['awakeDate'] as String?) ?? ''))
                      .toList();
                  error = null;
                }),
                onError: (_) => setState(() => error = 'تعذر تحميل فريق الفجر.'),
              );
        }
        setState(() {
          clanId = id;
          loaded = true;
        });
      }, onError: (_) => setState(() => loaded = true));
    }
    if (mounted) setState(() {});
  }

  Future<void> _join() async {
    final ctrl = TextEditingController();
    final phone = await showDialog<String>(
      context: context,
      builder: (_) => Directionality(
        textDirection: TextDirection.rtl,
        child: AlertDialog(
          title: const Text('انضم لفريق الفجر', style: TextStyle(fontWeight: FontWeight.w900)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('سيظهر رقمك لرفقاء الرَّكْب فقط ليتصلوا بك وقت الفجر.', style: TextStyle(fontSize: 12)),
              const SizedBox(height: 10),
              TextField(
                controller: ctrl,
                keyboardType: TextInputType.phone,
                textDirection: TextDirection.ltr,
                decoration: const InputDecoration(hintText: '+201012345678', labelText: 'رقم الهاتف مع كود الدولة'),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('إلغاء')),
            FilledButton(onPressed: () => Navigator.pop(context, ctrl.text), child: const Text('انضمام')),
          ],
        ),
      ),
    );
    if (phone == null || clanId == null) return;
    final normalized = normalizePhone(phone);
    if (normalized == null) return _toast('اكتب الرقم مع كود الدولة، مثل +201012345678.');
    try {
      await _me(clanId!).set({'name': AppState.instance.displayName, 'phone': normalized, 'updatedAt': FieldValue.serverTimestamp()}, SetOptions(merge: true));
    } catch (_) {
      _toast('تعذر الانضمام، تأكد من عضويتك في الرَّكْب.');
    }
  }

  Future<void> _setAwake(bool awake) async {
    try {
      // update(), not set(): never recreate a phone record after leaving.
      await _me(clanId!).update({'awakeDate': awake ? _today() : '', 'updatedAt': FieldValue.serverTimestamp()});
      if (awake) _toast('تم تسجيل استيقاظك بنجاح. صباح الخير والبركة!');
    } catch (_) {
      _toast('تعذر التحديث، حاول مرة أخرى.');
    }
  }

  Future<void> _leave() async {
    try {
      await _me(clanId!).delete();
    } catch (_) {
      _toast('تعذر الخروج، حاول مرة أخرى.');
    }
  }

  void _toast(String m) {
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));
  }

  Future<void> _call(String phone) async {
    if (!await launchUrl(Uri.parse('tel:$phone'))) _toast('تعذر فتح الاتصال على هذا الجهاز.');
  }

  Future<void> _whatsapp(String phone) async {
    final ok = await launchUrl(Uri.parse('https://wa.me/${phone.replaceFirst('+', '')}?text=${Uri.encodeComponent('الصلاة خير من النوم 🌅 قم لصلاة الفجر')}'),
        mode: LaunchMode.externalApplication);
    if (!ok) _toast('تعذر فتح واتساب.');
  }

  @override
  Widget build(BuildContext context) {
    if (!_cloud.signedIn) return const SignInPrompt(message: 'سجّل الدخول لتشارك رفقاءك الاستيقاظ لصلاة الفجر.');
    if (!loaded) return const Padding(padding: EdgeInsets.all(32), child: Center(child: CircularProgressIndicator()));
    if (clanId == null) {
      return _card(
        child: const Column(children: [
          Icon(Icons.groups, size: 40, color: AppColors.violet500),
          SizedBox(height: 10),
          Text('أيقظني للفجر', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
          SizedBox(height: 6),
          Text('انضم لرَكْب في «التحديات ← الغرف» لتتبادلوا مكالمات الإيقاظ مع رفقائك.', textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.slate500, height: 1.6)),
        ]),
      );
    }
    final uid = _cloud.user!.uid;
    final mine = team.where((m) => m.id == uid).firstOrNull;
    final awakeCount = team.where((m) => m.awakeDate == _today()).length;
    final iAmAwake = mine?.awakeDate == _today();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(gradient: const LinearGradient(colors: [Color(0xFF0C4A6E), Color(0xFF1E1B4B)]), borderRadius: BorderRadius.circular(28)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('أيقظني للفجر', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 19)),
              const SizedBox(height: 4),
              Text('نصحى سوا… ونبدأ يومنا بالصلاة', style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontWeight: FontWeight.bold)),
              const SizedBox(height: 14),
              Text('$awakeCount من ${team.length} رفقاء الفجر استيقظوا اليوم', style: const TextStyle(color: AppColors.amber300, fontWeight: FontWeight.w900)),
              const SizedBox(height: 14),
              if (mine == null)
                FilledButton.icon(
                  onPressed: _join,
                  icon: const Icon(Icons.add_call),
                  label: const Text('انضم لفريق الفجر', style: TextStyle(fontWeight: FontWeight.w900)),
                  style: FilledButton.styleFrom(backgroundColor: AppColors.amber500, foregroundColor: AppColors.slate900),
                )
              else
                FilledButton.icon(
                  onPressed: () => _setAwake(!iAmAwake),
                  icon: Icon(iAmAwake ? Icons.wb_sunny : Icons.alarm_on),
                  label: Text(iAmAwake ? 'تم الاستيقاظ. صباح الخير! (تراجع)' : 'أنا صحيت', style: const TextStyle(fontWeight: FontWeight.w900)),
                  style: FilledButton.styleFrom(backgroundColor: iAmAwake ? AppColors.emerald500 : AppColors.amber500, foregroundColor: iAmAwake ? Colors.white : AppColors.slate900),
                ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        if (error != null) Text(error!, style: const TextStyle(color: AppColors.rose500, fontWeight: FontWeight.bold)),
        if (team.isEmpty)
          _card(child: const Text('لم ينضم أحد لفريق الفجر بعد، كن أولهم!', textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.slate400))),
        ...team.map((m) {
          final awake = m.awakeDate == _today();
          final me = m.id == uid;
          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: awake ? AppColors.emerald200 : AppColors.slate100)),
            child: Row(
              children: [
                CircleAvatar(
                  backgroundColor: awake ? AppColors.emerald100 : AppColors.amber100,
                  child: Icon(awake ? Icons.wb_sunny : Icons.bedtime, color: awake ? AppColors.emerald600 : AppColors.amber600, size: 20),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(me ? '${m.name} (أنت)' : m.name, style: const TextStyle(fontWeight: FontWeight.w900)),
                      Text(awake ? 'استيقظ اليوم ✓' : 'بانتظار استيقاظه', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: awake ? AppColors.emerald600 : AppColors.slate400)),
                    ],
                  ),
                ),
                if (!me && m.phone.isNotEmpty) ...[
                  IconButton(onPressed: () => _whatsapp(m.phone), icon: const Icon(Icons.chat, color: AppColors.emerald600), tooltip: 'واتساب'),
                  IconButton.filled(onPressed: () => _call(m.phone), icon: const Icon(Icons.call), tooltip: 'اتصال', style: IconButton.styleFrom(backgroundColor: AppColors.emerald500)),
                ],
              ],
            ),
          );
        }),
        if (mine != null)
          TextButton(onPressed: _leave, child: const Text('الخروج من فريق الفجر وإخفاء رقمي', style: TextStyle(color: AppColors.rose600))),
      ],
    );
  }

  Widget _card({required Widget child}) => Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24), border: Border.all(color: AppColors.slate100)),
        child: child,
      );
}
