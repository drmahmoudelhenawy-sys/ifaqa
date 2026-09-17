import 'package:flutter/material.dart';
import '../../../core/services/audio_player_service.dart';
import '../../../core/theme/app_colors.dart';

class RadioStationModel {
  final String id;
  final String name;
  final String description;
  final String streamUrl;
  final IconData icon;

  const RadioStationModel({
    required this.id,
    required this.name,
    required this.description,
    required this.streamUrl,
    required this.icon,
  });
}

class RadioStationsScreen extends StatefulWidget {
  const RadioStationsScreen({super.key});

  @override
  State<RadioStationsScreen> createState() => _RadioStationsScreenState();
}

class _RadioStationsScreenState extends State<RadioStationsScreen> {
  String? _activeStationId;
  bool _isPlaying = false;

  static const List<RadioStationModel> _stations = [
    RadioStationModel(
      id: 'cairo',
      name: 'إذاعة القرآن الكريم من القاهرة',
      description: 'بث مباشر على مدار الساعة بأصوات عمالقة القراء',
      streamUrl: 'https://stream.radiojar.com/8s5u5tpdtwzuv',
      icon: Icons.radio,
    ),
    RadioStationModel(
      id: 'saudi',
      name: 'إذاعة القرآن الكريم من مكة المكرمة',
      description: 'بث مباشر من رحاب المسجد الحرام',
      streamUrl: 'https://stream.radiojar.com/0tpy1h0kxtzuv',
      icon: Icons.mosque,
    ),
    RadioStationModel(
      id: 'tarateel',
      name: 'إذاعة تراتيل منوعة',
      description: 'تلاوات خاشعة ومختارة بأعذب الأصوات',
      streamUrl: 'https://qurango.net/radio/tarateel',
      icon: Icons.menu_book,
    ),
    RadioStationModel(
      id: 'athkar',
      name: 'إذاعة أذكار الصباح والمساء',
      description: 'أذكار وأدعية مأثورة ورقيا شرعية مستمرة',
      streamUrl: 'https://qurango.net/radio/athkar_sabah_masaa',
      icon: Icons.wb_twilight,
    ),
    RadioStationModel(
      id: 'tafseer',
      name: 'إذاعة التفسير الميسر',
      description: 'شرح وتفسير معاني آيات القرآن الكريم',
      streamUrl: 'https://qurango.net/radio/tafseer',
      icon: Icons.lightbulb_outline,
    ),
  ];

  Future<void> _togglePlay(RadioStationModel station) async {
    final audio = AudioPlayerService.instance;
    if (_activeStationId == station.id && _isPlaying) {
      await audio.pause();
      setState(() => _isPlaying = false);
    } else {
      setState(() {
        _activeStationId = station.id;
        _isPlaying = true;
      });
      await audio.playRadio(station.streamUrl);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('إذاعات القرآن الكريم'),
      ),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _stations.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final station = _stations[index];
          final isCurrent = _activeStationId == station.id;

          return InkWell(
            onTap: () => _togglePlay(station),
            borderRadius: BorderRadius.circular(20),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isCurrent && _isPlaying
                    ? AppColors.primary.withOpacity(0.12)
                    : (isDark ? AppColors.darkCard : AppColors.lightSurface),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: isCurrent && _isPlaying
                      ? AppColors.primary
                      : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
                  width: isCurrent && _isPlaying ? 1.5 : 1,
                ),
              ),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: isCurrent && _isPlaying
                          ? AppColors.primary
                          : (isDark ? Colors.white10 : AppColors.lightCard),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Icon(
                      station.icon,
                      color: isCurrent && _isPlaying
                          ? Colors.white
                          : AppColors.primary,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          station.name,
                          style: TextStyle(
                            fontFamily: 'Cairo',
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                            color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          station.description,
                          style: TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 11,
                            color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  // Play / Pause Icon button
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: isCurrent && _isPlaying ? AppColors.primary : Colors.transparent,
                    ),
                    child: Icon(
                      isCurrent && _isPlaying ? Icons.pause : Icons.play_arrow,
                      color: isCurrent && _isPlaying ? Colors.white : AppColors.primary,
                      size: 26,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
