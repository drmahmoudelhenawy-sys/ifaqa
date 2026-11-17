import 'package:flutter/material.dart';
import '../services/reciter_photo_service.dart';
import 'reciter_avatar.dart';

/// Reciter picture that follows admin-managed photos live.
class ReciterPhoto extends StatelessWidget {
  final int reciterId;
  final double size;
  const ReciterPhoto({super.key, required this.reciterId, this.size = 42});

  @override
  Widget build(BuildContext context) {
    final svc = ReciterPhotoService.instance;
    svc.start();
    return ListenableBuilder(
      listenable: svc,
      builder: (_, _) => ReciterAvatar(photoUrl: svc.photoUrlFor(reciterId), size: size),
    );
  }
}
