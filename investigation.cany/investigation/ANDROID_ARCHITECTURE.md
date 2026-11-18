# Android Architecture

## Observed package facts

The package is `org.goldenquran.freesoft`, version 21.4, with Android SDK range 32–37, two DEX files, no native ABI library, 36 declared permissions, and 63 manifest components. APK signatures v2/v3 were cryptographically verified; certificate trust/revocation was not assessed. (Evidence: `ev_55cb1857387ddb7ebec559676ad1724de0f8dd23f12885df156be909cd84ec23`.)

The manifest reports 15 activities, 21 services, 23 receivers, and four providers. Fourteen components are exported/reachable from outside; six of those have no component permission. MainActivity is the launcher and accepts the `dua-community`, `masbaha`, and `library` hosts. VoicePlayActivity accepts media-search intents. (Evidence: `ev_39750d92941a3a038f6c33eebb7f83ff2cabe3b7e295d68bce50c6589675a9cf`, `ev_26731ad05568d33e2d46d39425c3f6e21343e27d1ff95f7a0a5fb3bba7874ebf`.)

## App code groups

The app namespace has 541 classes across two DEX files. Package counts are: network 213, models 192, UI 116, workers 7, habits 6, datastore 4, activity classes 2, and application class 1. These are package counts, not a direct measure of feature size. (Evidence: `ev_e1da8b1964770471afaf2078706f7ab6c5392c4e03696fa13416257d25f9ac16`, `ev_c0e3f0f3db1b352fce3329ebb60b1beb7ffc3d13285179bef70faa9bac60aacd`, `ev_aad9d988fdf2c21b2b1d3c51cd2c12fa0ddbeb0c21c56a462895ad6453f32465`, `ev_15a92a910535cb40200758d57eb621c20e18e82abb44302fca89f9b065070825`.)

The app code is inferred to use Kotlin from runtime markers, generated Room-style classes, and CoroutineWorker implementations. This does not recover original source or build settings. The base APK scan found no Flutter libraries; that does not rule out a split or later downloaded code. (Evidence: `ev_6b8757ef5809e553de256cb13d37f331afb95e046b55d88231523f4164e1e35c`, `ev_e1da8b1964770471afaf2078706f7ab6c5392c4e03696fa13416257d25f9ac16`, `ev_c73d0e1d68d4c09dbcc56ceacdcec13230a73a168e5b612d1909d84612f39e41`.)

## Android and vendor libraries

Recorded manifest components include AndroidX Media3, WorkManager, Firebase Messaging, Google ML Kit, and Google Play Billing. Permissions cover areas including network, alarms, location, audio/camera, notifications, Bluetooth, billing, and biometrics. A declaration does not prove a feature used the permission. (Evidence: `ev_55cb1857387ddb7ebec559676ad1724de0f8dd23f12885df156be909cd84ec23`, `ev_9925014e76a9d8f343e69e6a9f7a5fff65dbc154f32020f68420dda08617630f`, `ev_f00468268997427851cfe570700502c3b25b4cf102db552435f4676cc03d3541`.)

## Background and audio

An app-owned MediaSessionService exposes an ExoPlayer. AudioFragment and reciter/track/playlist models point to an audio library. Audio refresh/update workers and local download states are also present. The exact playback and download sequence is not established. (Evidence: `ev_536f67508c97bec7d34c3332a624f83165e79d534a49b466ab23cd65160be17e`, `ev_f822c9bd459082139b5dd08aadbddb2d832cd29642d7a23d909e777a8d646306`, `ev_e893c2122df0068c37143caf3405b556855171709cd70014179df7c1ba90fcfa`, `ev_9949e162820c1752548663f20a86c9033660ccfd252cbbeebc0e54ceac8821c0`, `ev_00df656201863ae3774492f0d23d6cbbeda861dc4a5a39a2c351f51f78d46076`, `ev_bfb102ffeba3ec807d12d8a6a187897fac4ec3f9de49de5bb08cbff8313593a0`.)

Manifest services and receivers cover audio, prayer alarms, reminders, live calls, messaging, and three widgets. Prayer alarm service fields include MediaPlayer, AudioManager, WakeLock, Handler, and HandlerThread. Two prayer widgets specify 15-minute updates. These are declared building blocks; the saved evidence does not prove they were scheduled. (Evidence: `ev_9949e162820c1752548663f20a86c9033660ccfd252cbbeebc0e54ceac8821c0`, `ev_9110bed55a2cfa96177f886cfce173b8f0de9b97c9897ff4221e58cba3a8c002`, `ev_391dfd2a90e6006f0d95dbff5e7151df31a77cc3d9893f34115308a301952505`, `ev_d98e00581bef96d3db871ebafbcb70e17c17835eb6cefddaf11b1144b131f1e6`, `ev_67d05f730f699fcb51e734a5f60fbe3c785f1cb301f11904e40afc48ec2c96bb`, `ev_2e97d4b9df5dbfd63432f9379d76e16a480beac7ac615002c0b9febf1a6e27cd`.)

## Architecture map

```text
Android entry points
  MainActivity (launcher + three deep-link hosts)
  VoicePlayActivity (media search)

App code groups
  UI (116) -> models (192) -> network (213) / datastore (4)
  workers (7) -> background refresh, sync, or reminders
  habits (6) -> tracking-related models/features
  Application class (1)

Platform/library clues
  AndroidX Media3 + ExoPlayer
  WorkManager
  Firebase Messaging
  Google ML Kit
  Google Play Billing
```

The arrows are a planning-level grouping from package names and class evidence, not a verified runtime call graph. (Evidence: `ev_e1da8b1964770471afaf2078706f7ab6c5392c4e03696fa13416257d25f9ac16`, `ev_55cb1857387ddb7ebec559676ad1724de0f8dd23f12885df156be909cd84ec23`, `ev_536f67508c97bec7d34c3332a624f83165e79d534a49b466ab23cd65160be17e`, `ev_9949e162820c1752548663f20a86c9033660ccfd252cbbeebc0e54ceac8821c0`.)

## Still unknown

The app's actual service call graph, startup setup, API endpoints, dependency versions, screen routes, worker schedules, and data persistence mapping were not established by this static evidence. See `EVIDENCE_AND_COVERAGE.md`.
