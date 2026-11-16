import 'package:flutter/material.dart';
import '../services/audio_service.dart';
import '../theme/app_colors.dart';

/// Floating player above the bottom navigation while something is loaded
/// (React's floating audio bar).
class MiniPlayer extends StatelessWidget {
  const MiniPlayer({super.key});

  @override
  Widget build(BuildContext context) {
    final audio = AudioService.instance;
    return ListenableBuilder(
      listenable: audio,
      builder: (context, _) {
        final now = audio.now;
        if (now == null) return const SizedBox.shrink();
        final pos = audio.player.position;
        final dur = audio.player.duration;
        final progress = (!now.isLive && dur != null && dur.inMilliseconds > 0) ? (pos.inMilliseconds / dur.inMilliseconds).clamp(0.0, 1.0) : null;
        return Container(
          margin: const EdgeInsets.fromLTRB(10, 0, 10, 8),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [Color(0xFF0F172A), Color(0xFF1E293B)]),
            borderRadius: BorderRadius.circular(26),
            boxShadow: const [BoxShadow(color: Color(0x33000000), blurRadius: 16, offset: Offset(0, 6))],
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(10, 8, 6, 8),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 20,
                      backgroundColor: AppColors.emerald600,
                      child: Icon(now.isLive ? Icons.radio : Icons.graphic_eq, color: Colors.white, size: 20),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(now.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 13)),
                          Text(now.isLive ? 'بث مباشر · ${now.subtitle}' : now.subtitle,
                              maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white60, fontWeight: FontWeight.bold, fontSize: 10)),
                        ],
                      ),
                    ),
                    if (!now.isLive)
                      IconButton(onPressed: audio.previous, icon: const Icon(Icons.skip_next, color: Colors.white70), tooltip: 'السابقة'),
                    InkWell(
                      onTap: audio.toggle,
                      customBorder: const CircleBorder(),
                      child: Container(
                        width: 42,
                        height: 42,
                        decoration: const BoxDecoration(color: AppColors.emerald400, shape: BoxShape.circle),
                        child: audio.buffering
                            ? const Padding(padding: EdgeInsets.all(12), child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : Icon(audio.playing ? Icons.pause : Icons.play_arrow, color: AppColors.slate900),
                      ),
                    ),
                    if (!now.isLive)
                      IconButton(onPressed: audio.next, icon: const Icon(Icons.skip_previous, color: Colors.white70), tooltip: 'التالية'),
                    IconButton(onPressed: audio.stop, icon: const Icon(Icons.close, color: Colors.white54, size: 20), tooltip: 'إيقاف'),
                  ],
                ),
              ),
              if (progress != null)
                LinearProgressIndicator(value: progress, minHeight: 3, backgroundColor: Colors.white10, valueColor: const AlwaysStoppedAnimation(AppColors.emerald400)),
            ],
          ),
        );
      },
    );
  }
}
