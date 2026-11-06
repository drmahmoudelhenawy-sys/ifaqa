import 'package:flutter/material.dart';

class MasbahaTheme {
  final String id;
  final String name;
  final Gradient? gradient;
  final Color? solid;
  final Color accent;
  final Color buttonColor;

  const MasbahaTheme({
    required this.id,
    required this.name,
    this.gradient,
    this.solid,
    required this.accent,
    required this.buttonColor,
  });
}

const List<MasbahaTheme> masbahaThemes = [
  MasbahaTheme(
    id: 'royal',
    name: 'ملكي',
    gradient: LinearGradient(colors: [Color(0xFF312E81), Color(0xFF4C1D95), Color(0xFF701A75)], begin: Alignment.topRight, end: Alignment.bottomLeft),
    accent: Color(0xFFF0ABFC),
    buttonColor: Color(0x1AFFFFFF),
  ),
  MasbahaTheme(
    id: 'dawn',
    name: 'فجر',
    gradient: LinearGradient(colors: [Color(0xFFFB923C), Color(0xFFFB7185), Color(0xFFA855F7)], begin: Alignment.topRight, end: Alignment.bottomLeft),
    accent: Colors.white,
    buttonColor: Color(0x33FFFFFF),
  ),
  MasbahaTheme(
    id: 'nature',
    name: 'سكينة',
    gradient: LinearGradient(colors: [Color(0xFF065F46), Color(0xFF0F766E), Color(0xFF164E63)], begin: Alignment.topRight, end: Alignment.bottomLeft),
    accent: Color(0xFFA7F3D0),
    buttonColor: Color(0x66064E3B),
  ),
  MasbahaTheme(
    id: 'dark',
    name: 'ليل',
    solid: Color(0xFF020617),
    accent: Color(0xFFCBD5E1),
    buttonColor: Color(0xFF1E293B),
  ),
];
