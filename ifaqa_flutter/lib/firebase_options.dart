// Firebase client configuration for project elhenawy-lap.
// Web values mirror services/firebase.ts; Android values come from
// android/app/google-services.json. These identify the project and are not
// secrets: access is controlled by firestore.rules.
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) return web;
    if (defaultTargetPlatform == TargetPlatform.android) return android;
    throw UnsupportedError('Firebase is not configured for ${defaultTargetPlatform.name} yet.');
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyC5GgR5bnxt0-rWYy1_vLagj9lwE1NOR7w',
    appId: '1:980477385772:web:e433ad35bd33954a7f8589',
    messagingSenderId: '980477385772',
    projectId: 'elhenawy-lap',
    authDomain: 'elhenawy-lap.firebaseapp.com',
    storageBucket: 'elhenawy-lap.firebasestorage.app',
    measurementId: 'G-BLZ0EN96CQ',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyC5GgR5bnxt0-rWYy1_vLagj9lwE1NOR7w',
    appId: '1:980477385772:android:com.ifaqa.app',
    messagingSenderId: '980477385772',
    projectId: 'elhenawy-lap',
    storageBucket: 'elhenawy-lap.firebasestorage.app',
  );
}
