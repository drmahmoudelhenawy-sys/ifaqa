import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import '../firebase_options.dart';
import '../models/app_mode.dart';
import '../models/tier.dart';
import 'app_state.dart';
import 'clan_service.dart';

/// Account and shared data on the same Firebase project and document paths as
/// the React app, so one account works in both.
///
/// Run with `--dart-define=USE_FIREBASE_EMULATOR=true` to talk to the local
/// Auth (9099) and Firestore (8085) emulators instead of production.
class CloudService extends ChangeNotifier {
  CloudService._();
  static final CloudService instance = CloudService._();

  static const String appId = 'ifaqa-app-production-release';
  static const bool _useEmulator = bool.fromEnvironment('USE_FIREBASE_EMULATOR');

  bool available = false;
  User? user;
  StreamSubscription<User?>? _authSub;

  bool get signedIn => user != null;
  FirebaseFirestore get _db => FirebaseFirestore.instance;

  static const _adminEmails = ['ifaqaa@gmail.com', 'ifaqaadmin@gmail.com', 'dr.mahmoud.elhenawy@gmail.com'];
  static const _adminUids = ['3jCyf2k6a3T7R3G8w81gqcgYgAR2'];

  /// Same test as `isAdmin()` in firestore.rules, so admin screens only show
  /// for accounts whose writes the rules will accept.
  bool get isAdmin {
    final u = user;
    if (u == null) return false;
    if (_adminUids.contains(u.uid)) return true;
    return u.emailVerified && _adminEmails.contains(u.email?.toLowerCase());
  }

  DocumentReference<Map<String, dynamic>> _profileRef(String uid) =>
      _db.doc('artifacts/$appId/users/$uid/stats/profile');
  DocumentReference<Map<String, dynamic>> _leaderboardRef(String uid) =>
      _db.doc('artifacts/$appId/public/data/leaderboard/$uid');
  CollectionReference<Map<String, dynamic>> get _ameenWall =>
      _db.collection('artifacts/$appId/public/data/ameen_wall');
  CollectionReference<Map<String, dynamic>> get _support =>
      _db.collection('artifacts/$appId/support_messages');

  Future<void> init() async {
    try {
      await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
      if (_useEmulator) {
        await FirebaseAuth.instance.useAuthEmulator('localhost', 9099);
        _db.useFirestoreEmulator('localhost', 8085);
      }
      available = true;
    } catch (e) {
      // Unsupported platform or no config: the app keeps working offline.
      debugPrint('Firebase unavailable: $e');
      return;
    }
    final state = AppState.instance;
    state.onXpAdded = _recordXp;
    state.onProfileEdited = _pushProfile;
    _authSub = FirebaseAuth.instance.authStateChanges().listen((u) async {
      user = u;
      if (u != null) await _onSignedIn(u);
      notifyListeners();
    });
  }

  @override
  void dispose() {
    _authSub?.cancel();
    super.dispose();
  }

  // ---- Auth ----

  /// Returns an Arabic error message, or null on success.
  Future<String?> signIn(String email, String password) =>
      _guard(() => FirebaseAuth.instance.signInWithEmailAndPassword(email: email.trim(), password: password));

  Future<String?> signUp(String name, String email, String password) => _guard(() async {
        // Set the name locally first: the auth listener creates the profile
        // document as soon as the account exists, before updateDisplayName.
        final state = AppState.instance;
        state.applyCloudProfile(name: name.trim(), xp: state.xp, appMode: state.appMode);
        final cred = await FirebaseAuth.instance.createUserWithEmailAndPassword(email: email.trim(), password: password);
        await cred.user?.updateDisplayName(name.trim());
      });

  Future<String?> resetPassword(String email) =>
      _guard(() => FirebaseAuth.instance.sendPasswordResetEmail(email: email.trim()));

  Future<void> signOut() => FirebaseAuth.instance.signOut();

  Future<String?> _guard(Future<void> Function() action) async {
    if (!available) return 'الخدمة غير متاحة على هذا الجهاز.';
    try {
      await action();
      return null;
    } on FirebaseAuthException catch (e) {
      return _authMessage(e.code);
    } catch (e) {
      debugPrint('auth failed: $e');
      return 'حدث خطأ غير متوقع. حاول مرة أخرى.';
    }
  }

  static String _authMessage(String code) {
    switch (code) {
      case 'invalid-email':
        return 'البريد الإلكتروني غير صحيح.';
      case 'user-not-found':
      case 'wrong-password':
      case 'invalid-credential':
        return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
      case 'email-already-in-use':
        return 'البريد الإلكتروني مستخدم بالفعل.';
      case 'weak-password':
        return 'كلمة المرور ضعيفة؛ استخدم 6 أحرف على الأقل.';
      case 'too-many-requests':
        return 'محاولات كثيرة. انتظر قليلًا ثم حاول مجددًا.';
      case 'network-request-failed':
        return 'تعذر الاتصال بالإنترنت.';
      default:
        return 'تعذر إتمام العملية ($code).';
    }
  }

  // ---- Profile and XP ----

  Future<void> _onSignedIn(User u) async {
    final state = AppState.instance;
    try {
      final ref = _profileRef(u.uid);
      final snap = await ref.get();
      final data = snap.data();
      if (data == null) {
        await ref.set({
          'name': u.displayName ?? state.displayName,
          'email': u.email,
          'xp': state.xp,
          'tier': getTierForXp(state.xp).name,
          'joinedAt': FieldValue.serverTimestamp(),
          'appMode': state.appMode.name,
          if (state.userTitle.isNotEmpty) 'userTitle': state.userTitle,
        }, SetOptions(merge: true));
        await _syncLeaderboard(u.uid, state.xp);
        return;
      }
      if (data['isBlocked'] == true) {
        await signOut();
        return;
      }
      // Same rule as the React app: never lose points from either side.
      final serverXp = (data['xp'] as num?)?.toInt() ?? 0;
      final resolved = serverXp > state.xp ? serverXp : state.xp;
      state.applyCloudProfile(
        name: data['name'] as String?,
        title: data['userTitle'] as String?,
        xp: resolved,
        appMode: data['appMode'] == AppMode.lite.name ? AppMode.lite : AppMode.full,
      );
      if (resolved != serverXp) {
        await ref.update({'xp': resolved, 'tier': getTierForXp(resolved).name});
        await _syncLeaderboard(u.uid, resolved);
      }
    } catch (e) {
      debugPrint('profile sync failed: $e');
    }
  }

  void _recordXp(int amount, int newTotal) {
    final u = user;
    if (u == null || amount == 0) return;
    final tier = getTierForXp(newTotal).name;
    if (amount > 0) ClanService.instance.recordActivity(amount);
    _profileRef(u.uid)
        .update({'xp': FieldValue.increment(amount), 'tier': tier, 'lastActive': FieldValue.serverTimestamp()})
        .catchError((Object e) => debugPrint('xp sync failed: $e'));
    if (AppState.instance.flag('show_on_leaderboard', fallback: true)) {
      _leaderboardRef(u.uid)
          .set({'xp': FieldValue.increment(amount), 'name': AppState.instance.displayName, 'tier': tier}, SetOptions(merge: true))
          .catchError((Object e) => debugPrint('leaderboard sync failed: $e'));
    }
  }

  Future<void> _syncLeaderboard(String uid, int xp) async {
    if (!AppState.instance.flag('show_on_leaderboard', fallback: true)) return;
    final state = AppState.instance;
    await _leaderboardRef(uid).set({
      'xp': xp,
      'name': state.displayName,
      'tier': getTierForXp(xp).name,
      if (state.userTitle.isNotEmpty) 'userTitle': state.userTitle,
    }, SetOptions(merge: true));
  }

  void _pushProfile() {
    final u = user;
    if (u == null) return;
    final state = AppState.instance;
    _profileRef(u.uid)
        .set({'name': state.displayName, 'userTitle': state.userTitle, 'appMode': state.appMode.name}, SetOptions(merge: true))
        .catchError((Object e) => debugPrint('profile push failed: $e'));
    if (state.flag('show_on_leaderboard', fallback: true)) {
      _leaderboardRef(u.uid)
          .set({'name': state.displayName, 'userTitle': state.userTitle}, SetOptions(merge: true))
          .catchError((Object e) => debugPrint('leaderboard push failed: $e'));
    }
  }

  // ---- Leaderboard ----

  Stream<List<LeaderboardRow>> leaderboard() => _db
      .collection('artifacts/$appId/public/data/leaderboard')
      .orderBy('xp', descending: true)
      .limit(50)
      .snapshots()
      .map((snap) => snap.docs
          .where((d) => d.data()['isBlocked'] != true)
          .map((d) => LeaderboardRow(
                id: d.id,
                name: (d.data()['name'] as String?) ?? 'مستخدم',
                xp: (d.data()['xp'] as num?)?.toInt() ?? 0,
              ))
          .toList());

  // ---- Ameen wall ----

  Stream<List<WallDua>> ameenWall() => _ameenWall
      .orderBy('timestamp', descending: true)
      .limit(50)
      .snapshots()
      .map((snap) => snap.docs.map(WallDua.fromDoc).toList());

  /// No `realName`: the wall is readable by every signed-in user.
  Future<void> postDua(String text, {required bool anonymous}) async {
    final u = user!;
    await _ameenWall.add({
      'userId': u.uid,
      'userName': anonymous ? 'فاعل خير' : AppState.instance.displayName,
      'text': text,
      'ameenCount': 0,
      'ameenedBy': <String>[],
      'timestamp': FieldValue.serverTimestamp(),
    });
  }

  Future<void> sayAmeen(String duaId) async {
    final u = user!;
    await _ameenWall.doc(duaId).update({
      'ameenCount': FieldValue.increment(1),
      'ameenedBy': FieldValue.arrayUnion([u.uid]),
    });
  }

  // ---- Support ----

  Stream<List<SupportItem>> supportThread() => _support
      .where('userId', isEqualTo: user!.uid)
      .snapshots()
      .map((snap) {
        final items = snap.docs.map(SupportItem.fromDoc).toList();
        items.sort((a, b) => a.time.compareTo(b.time));
        return items;
      });

  Future<void> sendSupport(String message, {required bool anonymous}) async {
    final u = user!;
    await _support.add({
      'userId': u.uid,
      'userName': anonymous ? 'مجهول' : AppState.instance.displayName,
      'message': message,
      'status': 'open',
      'timestamp': FieldValue.serverTimestamp(),
    });
  }
}

class LeaderboardRow {
  final String id;
  final String name;
  final int xp;
  const LeaderboardRow({required this.id, required this.name, required this.xp});
}

class WallDua {
  final String id;
  final String userId;
  final String userName;
  final String text;
  final int ameenCount;
  final List<String> ameenedBy;
  final DateTime time;

  const WallDua({
    required this.id,
    required this.userId,
    required this.userName,
    required this.text,
    required this.ameenCount,
    required this.ameenedBy,
    required this.time,
  });

  factory WallDua.fromDoc(QueryDocumentSnapshot<Map<String, dynamic>> d) {
    final data = d.data();
    return WallDua(
      id: d.id,
      userId: (data['userId'] as String?) ?? '',
      userName: (data['userName'] as String?) ?? 'مستخدم',
      text: (data['text'] as String?) ?? '',
      ameenCount: (data['ameenCount'] as num?)?.toInt() ?? 0,
      ameenedBy: List<String>.from((data['ameenedBy'] as List?) ?? const []),
      // Pending server timestamps read as null until the write lands.
      time: (data['timestamp'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }
}

class SupportItem {
  final String? message;
  final String? reply;
  final DateTime time;
  const SupportItem({this.message, this.reply, required this.time});

  factory SupportItem.fromDoc(QueryDocumentSnapshot<Map<String, dynamic>> d) {
    final data = d.data();
    return SupportItem(
      message: data['message'] as String?,
      reply: data['reply'] as String?,
      time: (data['timestamp'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }
}
