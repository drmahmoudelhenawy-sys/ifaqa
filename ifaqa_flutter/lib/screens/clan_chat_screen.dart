import 'dart:async';
import 'package:flutter/material.dart';
import '../services/clan_service.dart';
import '../services/cloud_service.dart';
import '../theme/app_colors.dart';

/// Team room, or a direct room with one member when [peer] is set.
class ClanChatScreen extends StatefulWidget {
  final Clan clan;
  final ClanMember? peer;
  const ClanChatScreen({super.key, required this.clan, this.peer});

  @override
  State<ClanChatScreen> createState() => _ClanChatScreenState();
}

class _ClanChatScreenState extends State<ClanChatScreen> {
  final _svc = ClanService.instance;
  final _input = TextEditingController();
  final _scroll = ScrollController();
  List<ChatMessage> messages = const [];
  String? error;
  bool sending = false;
  StreamSubscription? _sub;

  String get _me => CloudService.instance.user!.uid;
  String get _roomId => widget.peer == null ? 'team' : ClanService.directRoomId(_me, widget.peer!.id);

  @override
  void initState() {
    super.initState();
    _sub = _svc.messages(widget.clan.id, _roomId).listen((m) {
      setState(() {
        messages = m;
        error = null;
      });
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scroll.hasClients) _scroll.jumpTo(_scroll.position.maxScrollExtent);
      });
    }, onError: (Object e) {
      // A direct room that was never written to has no document yet.
      setState(() => error = widget.peer != null && messages.isEmpty ? null : 'تعذر تحميل المحادثة. تأكد من عضويتك.');
    });
  }

  @override
  void dispose() {
    _sub?.cancel();
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _input.text;
    if (text.trim().isEmpty) return;
    setState(() => sending = true);
    try {
      await _svc.send(widget.clan.id, text, peerId: widget.peer?.id);
      _input.clear();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e is ClanException ? e.message : 'تعذر الإرسال، رسالتك محفوظة في خانة الكتابة.')));
    }
    if (mounted) setState(() => sending = false);
  }

  String _time(DateTime t) => '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.slate50,
        appBar: AppBar(
          backgroundColor: widget.clan.colors.first,
          foregroundColor: Colors.white,
          title: Text(widget.peer == null ? 'مجلس ${widget.clan.name}' : widget.peer!.name, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
        ),
        body: Column(
          children: [
            Expanded(
              child: error != null
                  ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(error!, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.slate500))))
                  : messages.isEmpty
                      ? const Center(child: Text('ابدأ الحديث بكلمة طيبة', style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.slate400)))
                      : ListView.builder(
                          controller: _scroll,
                          padding: const EdgeInsets.all(12),
                          itemCount: messages.length,
                          itemBuilder: (_, i) {
                            final m = messages[i];
                            final mine = m.senderId == _me;
                            return Align(
                              alignment: mine ? AlignmentDirectional.centerStart : AlignmentDirectional.centerEnd,
                              child: Container(
                                constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
                                margin: const EdgeInsets.only(bottom: 8),
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                                decoration: BoxDecoration(
                                  color: mine ? AppColors.violet600 : Colors.white,
                                  borderRadius: BorderRadius.circular(18),
                                  border: mine ? null : Border.all(color: AppColors.slate100),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    if (!mine && widget.peer == null)
                                      Text(m.senderName, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 11, color: AppColors.violet600)),
                                    Text(m.text, style: TextStyle(color: mine ? Colors.white : AppColors.slate800, fontWeight: FontWeight.w600, height: 1.5)),
                                    const SizedBox(height: 2),
                                    Text(_time(m.time), style: TextStyle(fontSize: 9, color: mine ? Colors.white70 : AppColors.slate400)),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
            ),
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(10, 6, 10, 10),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _input,
                        minLines: 1,
                        maxLines: 4,
                        maxLength: 2000,
                        textInputAction: TextInputAction.send,
                        onSubmitted: (_) => _send(),
                        decoration: InputDecoration(
                          hintText: 'اكتب رسالتك...',
                          counterText: '',
                          filled: true,
                          fillColor: Colors.white,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(22), borderSide: const BorderSide(color: AppColors.slate200)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton.filled(
                      onPressed: sending ? null : _send,
                      icon: const Icon(Icons.send),
                      style: IconButton.styleFrom(backgroundColor: AppColors.violet600),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
