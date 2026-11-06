import 'dart:math' as math;
import 'package:flutter/material.dart';

class CompassRosePainter extends CustomPainter {
  final Color ringColor;
  final Color tickColor;

  CompassRosePainter({required this.ringColor, required this.tickColor});

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final radius = size.width / 2;

    final ringPaint = Paint()
      ..color = ringColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;
    canvas.drawCircle(center, radius - 1, ringPaint);

    final tickPaint = Paint()
      ..color = tickColor
      ..strokeWidth = 1.5;

    for (int i = 0; i < 72; i++) {
      final angle = (i * 5) * math.pi / 180;
      final isMajor = i % 18 == 0;
      final outer = Offset(center.dx + radius * math.sin(angle), center.dy - radius * math.cos(angle));
      final innerRadius = radius - (isMajor ? 14 : 6);
      final inner = Offset(center.dx + innerRadius * math.sin(angle), center.dy - innerRadius * math.cos(angle));
      canvas.drawLine(inner, outer, tickPaint..strokeWidth = isMajor ? 2 : 1);
    }

    const labels = ['N', 'E', 'S', 'W'];
    final textStyle = TextStyle(color: tickColor, fontSize: 13, fontWeight: FontWeight.w900);
    for (int i = 0; i < 4; i++) {
      final angle = (i * 90) * math.pi / 180;
      final labelRadius = radius - 28;
      final pos = Offset(center.dx + labelRadius * math.sin(angle), center.dy - labelRadius * math.cos(angle));
      final tp = TextPainter(text: TextSpan(text: labels[i], style: textStyle), textDirection: TextDirection.ltr)..layout();
      tp.paint(canvas, pos - Offset(tp.width / 2, tp.height / 2));
    }
  }

  @override
  bool shouldRepaint(covariant CompassRosePainter oldDelegate) => false;
}
