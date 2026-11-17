import 'package:flutter/material.dart';
import '../data/surahs_data.dart';
import '../models/reciter.dart';
import '../services/audio_service.dart';
import '../services/playlists_service.dart';
import '../theme/app_colors.dart';

Future<String?> _askName(BuildContext context, {String title = 'اسم القائمة', String initial = ''}) {
  final c = TextEditingController(text: initial);
  return showDialog<String>(
    context: context,
    builder: (ctx) => Directionality(
      textDirection: TextDirection.rtl,
      child: AlertDialog(
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15)),
        content: TextField(controller: c, autofocus: true, decoration: const InputDecoration(hintText: 'مثال: سور الصباح')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('إلغاء')),
          FilledButton(onPressed: () => Navigator.pop(ctx, c.text), child: const Text('حفظ')),
        ],
      ),
    ),
  );
}

/// Bottom sheet that adds [surah] by [reciter] to a chosen (or new) playlist.
Future<void> showAddToPlaylistSheet(BuildContext context, Reciter reciter, int surah) async {
  final svc = PlaylistsService.instance;
  final messenger = ScaffoldMessenger.of(context);
  final name = quranSurahs.firstWhere((s) => s.number == surah).name;
  await showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    builder: (ctx) => Directionality(
      textDirection: TextDirection.rtl,
      child: ListenableBuilder(
        listenable: svc,
        builder: (ctx, _) {
          final lists = svc.playlists;
          return SafeArea(
            child: ListView(
              shrinkWrap: true,
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              children: [
                Text('إضافة سورة $name إلى قائمة', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14)),
                const SizedBox(height: 8),
                ListTile(
                  leading: const Icon(Icons.add_circle, color: AppColors.violet600),
                  title: const Text('قائمة جديدة', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13)),
                  onTap: () async {
                    final t = await _askName(ctx);
                    if (t == null) return;
                    final p = svc.create(t);
                    svc.addItem(p.id, reciter, surah);
                    if (ctx.mounted) Navigator.pop(ctx);
                    messenger.showSnackBar(SnackBar(content: Text('أضيفت إلى "${p.title}"')));
                  },
                ),
                for (final p in lists)
                  ListTile(
                    leading: const Icon(Icons.queue_music, color: AppColors.indigo600),
                    title: Text(p.title, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13)),
                    subtitle: Text('${p.items.length} سورة', style: const TextStyle(fontSize: 10)),
                    onTap: () {
                      svc.addItem(p.id, reciter, surah);
                      Navigator.pop(ctx);
                      messenger.showSnackBar(SnackBar(content: Text('أضيفت إلى "${p.title}"')));
                    },
                  ),
              ],
            ),
          );
        },
      ),
    ),
  );
}

/// "قوائمي": the user's playlists, and the contents of one when opened.
class PlaylistsView extends StatefulWidget {
  final VoidCallback onBack;
  const PlaylistsView({super.key, required this.onBack});

  @override
  State<PlaylistsView> createState() => _PlaylistsViewState();
}

class _PlaylistsViewState extends State<PlaylistsView> {
  final svc = PlaylistsService.instance;
  final audio = AudioService.instance;
  String? openId;

  @override
  void initState() {
    super.initState();
    svc.addListener(_r);
    audio.addListener(_r);
  }

  @override
  void dispose() {
    svc.removeListener(_r);
    audio.removeListener(_r);
    super.dispose();
  }

  void _r() {
    if (mounted) setState(() {});
  }

  Widget _header(String title, VoidCallback onBack, {List<Widget> actions = const []}) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
        child: Row(children: [
          InkWell(
            onTap: onBack,
            borderRadius: BorderRadius.circular(14),
            child: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.slate100)),
              child: const Icon(Icons.chevron_right, size: 18),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(child: Text(title, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: AppColors.slate800))),
          ...actions,
        ]),
      );

  @override
  Widget build(BuildContext context) {
    final open = openId == null ? null : svc.byId(openId!);
    if (open != null) return _buildOne(open);
    final lists = svc.playlists;
    return Column(children: [
      _header('قوائمي', widget.onBack, actions: [
        IconButton(
          tooltip: 'قائمة جديدة',
          icon: const Icon(Icons.add_circle, color: AppColors.violet600),
          onPressed: () async {
            final t = await _askName(context);
            if (t != null) svc.create(t);
          },
        ),
      ]),
      Expanded(
        child: lists.isEmpty
            ? const Center(
                child: Padding(
                  padding: EdgeInsets.all(28),
                  child: Text('لا توجد قوائم بعد. أنشئ قائمة، ثم أضف إليها سورًا من قائمة أي قارئ بالضغط المطوّل على السورة.',
                      textAlign: TextAlign.center, style: TextStyle(color: AppColors.slate500, fontWeight: FontWeight.bold, fontSize: 12)),
                ),
              )
            : ListView.builder(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                itemCount: lists.length,
                itemBuilder: (context, i) {
                  final p = lists[i];
                  final active = audio.playlistId == p.id;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: InkWell(
                      onTap: () => setState(() => openId = p.id),
                      borderRadius: BorderRadius.circular(20),
                      child: Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: active ? const Color(0xFFDDD6FE) : AppColors.slate100)),
                        child: Row(children: [
                          Container(
                            width: 42,
                            height: 42,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(color: const Color(0xFFF5F3FF), borderRadius: BorderRadius.circular(14)),
                            child: Icon(active && audio.playing ? Icons.graphic_eq : Icons.queue_music, color: AppColors.violet600, size: 20),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Text(p.title, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: AppColors.slate800)),
                              Text('${p.items.length} سورة', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate400)),
                            ]),
                          ),
                          IconButton(
                            tooltip: 'تشغيل',
                            onPressed: p.items.isEmpty ? null : () => audio.playPlaylist(p),
                            icon: const Icon(Icons.play_circle, color: AppColors.violet600),
                          ),
                        ]),
                      ),
                    ),
                  );
                },
              ),
      ),
    ]);
  }

  Widget _buildOne(UserPlaylist p) {
    return Column(children: [
      _header(p.title, () => setState(() => openId = null), actions: [
        IconButton(
          tooltip: 'تشغيل الكل',
          onPressed: p.items.isEmpty ? null : () => audio.playPlaylist(p),
          icon: const Icon(Icons.play_circle, color: AppColors.violet600),
        ),
        PopupMenuButton<String>(
          onSelected: (v) async {
            if (v == 'rename') {
              final t = await _askName(context, title: 'إعادة تسمية القائمة', initial: p.title);
              if (t != null) svc.rename(p.id, t);
            } else if (v == 'delete') {
              final ok = await showDialog<bool>(
                context: context,
                builder: (ctx) => Directionality(
                  textDirection: TextDirection.rtl,
                  child: AlertDialog(
                    title: Text('حذف "${p.title}"؟', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15)),
                    actions: [
                      TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('إلغاء')),
                      FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('حذف')),
                    ],
                  ),
                ),
              );
              if (ok == true) {
                setState(() => openId = null);
                svc.delete(p.id);
              }
            }
          },
          itemBuilder: (_) => const [
            PopupMenuItem(value: 'rename', child: Text('إعادة تسمية')),
            PopupMenuItem(value: 'delete', child: Text('حذف القائمة')),
          ],
        ),
      ]),
      Expanded(
        child: p.items.isEmpty
            ? const Center(child: Text('القائمة فارغة', style: TextStyle(color: AppColors.slate500, fontWeight: FontWeight.bold)))
            : ReorderableListView.builder(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                itemCount: p.items.length,
                onReorderItem: (from, to) {
                  svc.moveItem(p.id, from, to);
                },
                itemBuilder: (context, i) {
                  final it = p.items[i];
                  final name = quranSurahs.firstWhere((s) => s.number == it.surah).name;
                  final current = audio.playlistId == p.id && audio.player.currentIndex == i;
                  return Padding(
                    key: ValueKey('${p.id}_${i}_${it.reciterId}_${it.surah}'),
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Container(
                      decoration: BoxDecoration(
                        color: current ? const Color(0xFFF5F3FF) : Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: current ? const Color(0xFFDDD6FE) : AppColors.slate100),
                      ),
                      child: ListTile(
                        dense: true,
                        onTap: () => audio.playPlaylist(p, startIndex: i),
                        leading: Icon(current && audio.playing ? Icons.pause_circle : Icons.play_circle, color: current ? AppColors.violet600 : AppColors.slate300),
                        title: Text('سورة $name', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12)),
                        subtitle: Text(it.reciterName, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                        trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                          IconButton(icon: const Icon(Icons.close, size: 18, color: AppColors.slate400), tooltip: 'إزالة', onPressed: () => svc.removeItem(p.id, i)),
                          ReorderableDragStartListener(index: i, child: const Icon(Icons.drag_handle, color: AppColors.slate300)),
                        ]),
                      ),
                    ),
                  );
                },
              ),
      ),
    ]);
  }
}
