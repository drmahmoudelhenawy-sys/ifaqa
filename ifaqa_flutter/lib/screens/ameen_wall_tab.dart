import 'package:flutter/material.dart';

import 'dart:async';

import '../services/app_state.dart';
import '../services/cloud_service.dart';
import 'auth_screen.dart';
import '../theme/app_colors.dart';

class AmeenWallTab extends StatefulWidget {
  const AmeenWallTab({super.key});

  @override
  State<AmeenWallTab> createState() => _AmeenWallTabState();
}

class _AmeenWallTabState extends State<AmeenWallTab> {
  final TextEditingController controller = TextEditingController();
  bool isAnonymous = false;
  bool posting = false;

  static const int _postXp = 10;
  static const int _ameenXp = 1;
  final CloudService _cloud = CloudService.instance;
  List<WallDua> duas = [];
  StreamSubscription<List<WallDua>>? _sub;
  String? _loadError;

  String get _me => _cloud.user?.uid ?? '';

  @override
  void initState() {
    super.initState();
    _cloud.addListener(_subscribe);
    _subscribe();
  }

  @override
  void dispose() {
    _cloud.removeListener(_subscribe);
    _sub?.cancel();
    controller.dispose();
    super.dispose();
  }

  void _subscribe() {
    _sub?.cancel();
    _sub = null;
    if (_cloud.signedIn) {
      _sub = _cloud.ameenWall().listen(
        (list) => setState(() {
          duas = list;
          _loadError = null;
        }),
        onError: (Object _) =>
            setState(() => _loadError = 'تعذر تحميل الحائط.'),
      );
    }
    if (mounted) setState(() {});
  }

  String _timeAgo(DateTime date) {
    final seconds = DateTime.now().difference(date).inSeconds;
    if (seconds < 60) return 'منذ قليل';
    if (seconds < 3600) return 'منذ ${seconds ~/ 60} دقيقة';
    if (seconds < 86400) return 'منذ ${seconds ~/ 3600} ساعة';
    return 'منذ ${seconds ~/ 86400} يوم';
  }

  Future<void> _post() async {
    final text = controller.text.trim();
    if (text.isEmpty || posting) return;
    setState(() => posting = true);
    try {
      await _cloud.postDua(text, anonymous: isAnonymous);
      controller.clear();
      AppState.instance.addXp(_postXp);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تعذر نشر الدعاء. حاول مرة أخرى.')),
        );
      }
    } finally {
      if (mounted) setState(() => posting = false);
    }
  }

  Future<void> _ameen(WallDua dua) async {
    if (dua.ameenedBy.contains(_me)) return;
    try {
      await _cloud.sayAmeen(dua.id);
      AppState.instance.addXp(_ameenXp);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تعذر التأمين. حاول مرة أخرى.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_cloud.signedIn) {
      return const Padding(
        padding: EdgeInsets.fromLTRB(16, 4, 16, 32),
        child: SignInPrompt(
          message: 'سجّل الدخول لتنشر دعاءك وتؤمّن على دعاء إخوانك.',
        ),
      );
    }
    return Directionality(
      textDirection: TextDirection.rtl,
      // Embedded in the challenges tab, which already scrolls.
      child: ListView(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppColors.violet600, AppColors.indigo600],
              ),
              borderRadius: BorderRadius.circular(28),
            ),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      Icons.auto_awesome,
                      color: Color(0xFFFDE047),
                      size: 18,
                    ),
                    SizedBox(width: 6),
                    Text(
                      'حائط الدعاء',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 17,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
                SizedBox(height: 6),
                Text(
                  'ادعُ لنفسك ولإخوانك بظهر الغيب، ولك بالمثل إن شاء الله.',
                  style: TextStyle(
                    color: Colors.white70,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.slate50,
              borderRadius: BorderRadius.circular(28),
              border: Border.all(color: AppColors.slate100),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: controller,
                  maxLength: 300,
                  minLines: 3,
                  maxLines: 5,
                  textAlign: TextAlign.right,
                  onChanged: (_) => setState(() {}),
                  decoration: const InputDecoration(
                    hintText: 'اكتب دعاءً يلامس قلبك...',
                    border: InputBorder.none,
                    counterText: '',
                  ),
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    InkWell(
                      onTap: () => setState(() => isAnonymous = !isAnonymous),
                      borderRadius: BorderRadius.circular(999),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 7,
                        ),
                        decoration: BoxDecoration(
                          color: isAnonymous
                              ? AppColors.slate800
                              : Colors.white,
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(color: AppColors.slate200),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.person,
                              size: 13,
                              color: isAnonymous
                                  ? Colors.white
                                  : AppColors.slate500,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              isAnonymous ? 'مجهول' : 'باسمك',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: isAnonymous
                                    ? Colors.white
                                    : AppColors.slate500,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    FilledButton.icon(
                      onPressed: controller.text.trim().isEmpty ? null : _post,
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.violet600,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      icon: const Icon(Icons.send, size: 15),
                      label: const Text(
                        'انشر',
                        style: TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 12,
                        ),
                      ),
                      onLongPress: null,
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          if (_loadError != null)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Text(
                _loadError!,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: AppColors.rose500,
                  fontWeight: FontWeight.bold,
                ),
              ),
            )
          else if (duas.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 40),
              child: Center(
                child: Text(
                  'لا يوجد دعوات بعد، كن أول المبادرين!',
                  style: TextStyle(
                    color: AppColors.slate400,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            )
          else
            ...duas.map((dua) {
              final isMe = dua.userId == _me;
              final hasAmeened = dua.ameenedBy.contains(_me);
              return Padding(
                padding: const EdgeInsets.only(bottom: 14),
                child: Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(28),
                    border: Border.all(color: AppColors.slate100),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 40,
                            height: 40,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: isMe
                                  ? const Color(0xFFF5F3FF)
                                  : AppColors.slate100,
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Icon(
                              isMe ? Icons.person : Icons.volunteer_activism,
                              color: isMe
                                  ? AppColors.violet600
                                  : AppColors.slate500,
                              size: 20,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      dua.userName,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w900,
                                        fontSize: 13,
                                        color: AppColors.slate800,
                                      ),
                                    ),
                                    if (isMe) ...[
                                      const SizedBox(width: 6),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 6,
                                          vertical: 1,
                                        ),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFF5F3FF),
                                          borderRadius: BorderRadius.circular(
                                            999,
                                          ),
                                        ),
                                        child: const Text(
                                          'أنت',
                                          style: TextStyle(
                                            fontSize: 9,
                                            fontWeight: FontWeight.w900,
                                            color: AppColors.violet600,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                                Row(
                                  children: [
                                    const Icon(
                                      Icons.access_time,
                                      size: 10,
                                      color: AppColors.slate400,
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      _timeAgo(dua.time),
                                      style: const TextStyle(
                                        fontSize: 10,
                                        color: AppColors.slate400,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: AppColors.slate50,
                          borderRadius: BorderRadius.circular(18),
                        ),
                        child: Text(
                          dua.text,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.slate700,
                            height: 1.6,
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            dua.ameenCount > 0
                                ? '${dua.ameenCount} شخص أمّنوا على دعائك'
                                : 'كن أول من يؤمّن',
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: AppColors.slate400,
                            ),
                          ),
                          InkWell(
                            onTap: () => _ameen(dua),
                            borderRadius: BorderRadius.circular(14),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 10,
                              ),
                              decoration: BoxDecoration(
                                color: hasAmeened
                                    ? AppColors.emerald500
                                    : Colors.white,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(
                                  color: hasAmeened
                                      ? Colors.transparent
                                      : AppColors.slate200,
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    Icons.favorite,
                                    size: 16,
                                    color: hasAmeened
                                        ? Colors.white
                                        : AppColors.slate400,
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    hasAmeened ? 'تم التأمين' : 'أمين',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w900,
                                      color: hasAmeened
                                          ? Colors.white
                                          : AppColors.slate500,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }
}
