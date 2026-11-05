import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class _SupportMsg {
  final String? message;
  final String? reply;
  const _SupportMsg({this.message, this.reply});
}

class SupportSheet extends StatefulWidget {
  const SupportSheet({super.key});

  @override
  State<SupportSheet> createState() => _SupportSheetState();
}

class _SupportSheetState extends State<SupportSheet> {
  final TextEditingController controller = TextEditingController();
  bool isAnonymous = false;
  final List<_SupportMsg> messages = [];

  void _send() {
    final text = controller.text.trim();
    if (text.isEmpty) return;
    setState(() {
      messages.add(_SupportMsg(message: text));
      controller.clear();
    });
    Future.delayed(const Duration(milliseconds: 800), () {
      if (!mounted) return;
      setState(() => messages.add(const _SupportMsg(reply: 'أهلاً بك! سعداء بتواصلك. سيتم مراجعة رسالتك والرد عليك قريبًا.')));
    });
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: DraggableScrollableSheet(
        initialChildSize: 0.75,
        maxChildSize: 0.95,
        minChildSize: 0.5,
        expand: false,
        builder: (context, scrollController) => Container(
          decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    InkWell(
                      onTap: () => Navigator.pop(context),
                      borderRadius: BorderRadius.circular(999),
                      child: Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: AppColors.slate100, shape: BoxShape.circle), child: const Icon(Icons.close, size: 16)),
                    ),
                    const SizedBox(width: 10),
                    const Icon(Icons.forum, color: AppColors.violet600, size: 18),
                    const SizedBox(width: 6),
                    const Text('الدعم والمقترحات', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: AppColors.slate900)),
                  ],
                ),
              ),
              const Divider(height: 1),
              Expanded(
                child: messages.isEmpty
                    ? const Center(child: Padding(padding: EdgeInsets.all(24), child: Text('لديك استفسار أو اقتراح؟ نحن هنا للسماع منك.', textAlign: TextAlign.center, style: TextStyle(color: AppColors.slate400, fontWeight: FontWeight.bold))))
                    : ListView.builder(
                        controller: scrollController,
                        padding: const EdgeInsets.all(16),
                        itemCount: messages.length,
                        itemBuilder: (context, i) {
                          final m = messages[i];
                          if (m.message != null) {
                            return Align(
                              alignment: Alignment.centerLeft,
                              child: Container(
                                margin: const EdgeInsets.only(bottom: 10),
                                constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                                padding: const EdgeInsets.all(14),
                                decoration: const BoxDecoration(color: AppColors.violet600, borderRadius: BorderRadius.only(topLeft: Radius.circular(18), bottomLeft: Radius.circular(18), bottomRight: Radius.circular(18))),
                                child: Text(m.message!, style: const TextStyle(color: Colors.white, fontSize: 13)),
                              ),
                            );
                          }
                          return Align(
                            alignment: Alignment.centerRight,
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 10),
                              constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(color: Colors.white, border: Border.all(color: AppColors.slate200), borderRadius: const BorderRadius.only(topRight: Radius.circular(18), bottomLeft: Radius.circular(18), bottomRight: Radius.circular(18))),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('الدعم الفني:', style: TextStyle(color: AppColors.emerald600, fontWeight: FontWeight.w900, fontSize: 11)),
                                  const SizedBox(height: 4),
                                  Text(m.reply!, style: const TextStyle(color: AppColors.slate800, fontSize: 13, fontWeight: FontWeight.bold)),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
              ),
              Container(
                padding: EdgeInsets.fromLTRB(16, 12, 16, MediaQuery.of(context).viewInsets.bottom + 16),
                decoration: const BoxDecoration(border: Border(top: BorderSide(color: AppColors.slate100))),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    InkWell(
                      onTap: () => setState(() => isAnonymous = !isAnonymous),
                      borderRadius: BorderRadius.circular(999),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(color: isAnonymous ? AppColors.slate800 : AppColors.slate100, borderRadius: BorderRadius.circular(999)),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(isAnonymous ? Icons.person_off : Icons.shield, size: 13, color: isAnonymous ? Colors.white : AppColors.slate600),
                            const SizedBox(width: 6),
                            Text(isAnonymous ? 'إرسال كمجهول' : 'إرسال باسمي', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: isAnonymous ? Colors.white : AppColors.slate600)),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: controller,
                            textAlign: TextAlign.right,
                            decoration: InputDecoration(hintText: 'اكتب رسالتك...', filled: true, fillColor: AppColors.slate100, border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none)),
                          ),
                        ),
                        const SizedBox(width: 8),
                        InkWell(
                          onTap: _send,
                          borderRadius: BorderRadius.circular(14),
                          child: Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: const Color(0xFF3B82F6), borderRadius: BorderRadius.circular(14)), child: const Icon(Icons.send, color: Colors.white, size: 18)),
                        ),
                      ],
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
}
