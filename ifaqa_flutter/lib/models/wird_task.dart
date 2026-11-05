enum WirdType { newMemorization, nearReview, farReview }
enum WirdQuality { perfect, withErrors, needsRepeat }

class WirdTask {
  final String id;
  final WirdType type;
  final String title;
  bool done;
  WirdQuality? quality;

  Map<String, dynamic> toJson() => {'id': id, 'type': type.name, 'title': title, 'done': done, 'quality': quality?.name};

  factory WirdTask.fromJson(Map<String, dynamic> json) => WirdTask(
        id: json['id'] as String,
        type: WirdType.values.byName(json['type'] as String),
        title: json['title'] as String,
        done: json['done'] as bool? ?? false,
        quality: json['quality'] == null ? null : WirdQuality.values.byName(json['quality'] as String),
      );

  WirdTask({required this.id, required this.type, required this.title, this.done = false, this.quality});
}

class WeakPoint {
  final String id;
  final String title;
  final WirdType type;
  final WirdQuality quality;

  Map<String, dynamic> toJson() => {'id': id, 'title': title, 'type': type.name, 'quality': quality.name};

  factory WeakPoint.fromJson(Map<String, dynamic> json) => WeakPoint(
        id: json['id'] as String,
        title: json['title'] as String,
        type: WirdType.values.byName(json['type'] as String),
        quality: WirdQuality.values.byName(json['quality'] as String),
      );

  const WeakPoint({required this.id, required this.title, required this.type, required this.quality});
}

String wirdTypeLabel(WirdType type) {
  switch (type) {
    case WirdType.newMemorization:
      return 'حفظ جديد';
    case WirdType.nearReview:
      return 'مراجعة قريبة';
    case WirdType.farReview:
      return 'مراجعة بعيدة';
  }
}

String wirdQualityLabel(WirdQuality q) {
  switch (q) {
    case WirdQuality.perfect:
      return 'ممتاز';
    case WirdQuality.withErrors:
      return 'به أخطاء';
    case WirdQuality.needsRepeat:
      return 'يحتاج إعادة';
  }
}
