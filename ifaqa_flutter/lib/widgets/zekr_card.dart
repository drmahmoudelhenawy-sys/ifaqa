import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/zekr.dart';
import '../theme/app_colors.dart';

class ZekrCard extends StatefulWidget {
  final Zekr zekr;
  final int count;
  final bool isCompleted;
  final int cardIndex;
  final int totalCards;
  final double fontSize;
  final VoidCallback onTap;

  const ZekrCard({
    super.key,
    required this.zekr,
    required this.count,
    required this.isCompleted,
    required this.cardIndex,
    required this.totalCards,
    required this.fontSize,
    required this.onTap,
  });

  @override
  State<ZekrCard> createState() => _ZekrCardState();
}

class _ZekrCardState extends State<ZekrCard> {
  bool copied = false;

  void _copy() {
    final buffer = StringBuffer(widget.zekr.text);
    if (widget.zekr.fadl.isNotEmpty) {
      buffer.write('\n\nالفضل: ${widget.zekr.fadl}');
    }
    buffer.write('\n\n- من تطبيق إفاقة');
    Clipboard.setData(ClipboardData(text: buffer.toString()));
    setState(() => copied = true);
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) setState(() => copied = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    final currentCount = widget.count > widget.zekr.count ? widget.zekr.count : widget.count;
    final progress = widget.zekr.count == 0 ? 0.0 : currentCount / widget.zekr.count;
    final isCompleted = widget.isCompleted;

    return InkWell(
      onTap: widget.onTap,
      borderRadius: BorderRadius.circular(36),
      child: Container(
        constraints: const BoxConstraints(minHeight: 340),
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: isCompleted ? const Color(0xFFECFDF5) : Colors.white,
          borderRadius: BorderRadius.circular(36),
          border: Border.all(color: isCompleted ? AppColors.emerald400.withValues(alpha: 0.5) : AppColors.slate200),
          boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 20, offset: Offset(0, 8))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (!isCompleted)
              LinearProgressIndicator(
                value: progress,
                minHeight: 5,
                backgroundColor: AppColors.slate100,
                valueColor: const AlwaysStoppedAnimation(AppColors.violet600),
              ),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      InkWell(
                        onTap: _copy,
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(color: AppColors.slate100, borderRadius: BorderRadius.circular(12)),
                          child: Icon(copied ? Icons.check : Icons.copy, size: 16, color: copied ? AppColors.emerald500 : AppColors.slate500),
                        ),
                      ),
                      Wrap(
                        spacing: 6,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(color: AppColors.amber100, borderRadius: BorderRadius.circular(999)),
                            child: Text('+${widget.zekr.xp} XP', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: AppColors.amber700)),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(color: AppColors.slate100, borderRadius: BorderRadius.circular(999)),
                            child: Text(
                              'الذكر ${widget.cardIndex + 1} / ${widget.totalCards}',
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: AppColors.slate700),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  Text(
                    widget.zekr.text,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: widget.fontSize,
                      height: 2.1,
                      fontWeight: FontWeight.bold,
                      color: isCompleted ? const Color(0xFF064E3B) : AppColors.slate800,
                    ),
                  ),
                  if (widget.zekr.fadl.isNotEmpty) ...[
                    const SizedBox(height: 14),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.slate100)),
                      child: RichText(
                        textAlign: TextAlign.justify,
                        text: TextSpan(
                          style: const TextStyle(fontSize: 12, height: 1.7, fontWeight: FontWeight.bold, color: AppColors.slate500),
                          children: [
                            const TextSpan(text: 'الفضل: ', style: TextStyle(color: AppColors.violet600, fontWeight: FontWeight.w900)),
                            TextSpan(text: widget.zekr.fadl),
                          ],
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 18),
                  Container(
                    padding: const EdgeInsets.only(top: 14),
                    decoration: const BoxDecoration(border: Border(top: BorderSide(color: AppColors.slate100))),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                isCompleted ? 'تم بحمد الله' : 'اضغط على البطاقة للتسبيح',
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: AppColors.slate500),
                              ),
                              Text(
                                isCompleted ? 'انتقل إلى الذكر التالي' : 'المتبقي: ${math.max(0, widget.zekr.count - currentCount)} مرة',
                                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate400),
                              ),
                            ],
                          ),
                        ),
                        SizedBox(
                          width: 56,
                          height: 56,
                          child: Stack(
                            alignment: Alignment.center,
                            children: [
                              SizedBox(
                                width: 56,
                                height: 56,
                                child: CircularProgressIndicator(
                                  value: progress,
                                  strokeWidth: 5,
                                  backgroundColor: AppColors.slate100,
                                  valueColor: AlwaysStoppedAnimation(isCompleted ? AppColors.emerald500 : AppColors.violet600),
                                  strokeCap: StrokeCap.round,
                                ),
                              ),
                              isCompleted
                                  ? const Icon(Icons.check_circle, color: AppColors.emerald500, size: 22)
                                  : Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Text('$currentCount', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: AppColors.slate800)),
                                        Text('/${widget.zekr.count}', style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppColors.slate400)),
                                      ],
                                    ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
