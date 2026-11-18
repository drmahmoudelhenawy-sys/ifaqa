# Golden Quran Investigation — Master Index

## Status

This is a static review of the supplied base APK. It uses the existing Craft Anything investigation and its 123 evidence records. Static evidence does not prove runtime behavior. (Evidence: `ev_55cb1857387ddb7ebec559676ad1724de0f8dd23f12885df156be909cd84ec23`, `ev_e1da8b1964770471afaf2078706f7ab6c5392c4e03696fa13416257d25f9ac16`.)

## Target

- APK: `base.apk`
- Package: `org.goldenquran.freesoft`
- Version: `21.4`
- Target ID: `t_89de96aaf1e7`
- SHA-256: `89de96aaf1e71fe7d07e602bc6fc25606f23ae90d7946b4990fa0c438bc70f32`

(Evidence: `ev_55cb1857387ddb7ebec559676ad1724de0f8dd23f12885df156be909cd84ec23`.)

## Files in this export

- `MASTER_INDEX.md` — this guide.
- `MASTER_EXPORT.md` — complete combined report, including JSON-formatted inventories.
- `COMPLETE_FEATURE_INVENTORY.md` — feature evidence, status, behavior, dependencies, and unknowns.
- `SCREEN_CATALOG.md` — manifest activities and candidate screens.
- `ANDROID_ARCHITECTURE.md` — package structure, Android components, and library clues.
- `DATABASE_SCHEMA_REPORT.md` — bundled database names and schema gaps.
- `NAVIGATION_ANALYSIS.md` — observed entry points and unknown screen routes.
- `UI_RESOURCE_MAP.md` — archive/resource counts and locale coverage.
- `CLAUDE_IMPLEMENTATION_GUIDE.md` — planning notes only; no app development.
- `EVIDENCE_AND_COVERAGE.md` — evidence scope and six open questions.
- `modules.md` — module/package group summary.
- `features.json`, `screens.json`, and `modules.json` are not separate files. Their complete JSON text is included in `MASTER_EXPORT.md`, because Craft Anything's JSON writer only works during an app build. No build was started.

## Main observations

- The manifest lists 63 components: 15 activities, 21 services, 23 receivers, and four providers. Fourteen are reachable from outside the app. (Evidence: `ev_39750d92941a3a038f6c33eebb7f83ff2cabe3b7e295d68bce50c6589675a9cf`.)
- The APK contains 541 app-namespace classes in two DEX files. (Evidence: `ev_e1da8b1964770471afaf2078706f7ab6c5392c4e03696fa13416257d25f9ac16`.)
- The archive contains three database files by name: `quran_app.db`, `quran_glyphs.db`, and `athkar_duas.db`. Their schemas were not read. (Evidence: `ev_a515a1161c2ab139e888b0749cb24fb0bceef12319a40a2c2fecf7e0ac5e5708`; unknown `unk_85988a97c784b919`.)
- MainActivity is the launcher and accepts `dua-community`, `masbaha`, and `library` deep-link hosts. The destination screens are unknown. (Evidence: `ev_26731ad05568d33e2d46d39425c3f6e21343e27d1ff95f7a0a5fb3bba7874ebf`.)
- The saved default-locale string pages do not provide Arabic translations; no Arabic wording is guessed. (Evidence: `ev_68e06b198c904e77a5ba7ca123f5bad0926a019a2273044dcfcbc0b3617e5274`, `ev_3bc35bc101d739e5853efa813f0d6c4a250685918a8cd4ec19e03029503c4b54`.)

## Open questions

The six investigation unknowns cover the archive asset-count conflict, exact database schemas, screen paths, runtime availability/downloads, settings persistence, and split-package completeness. Their IDs and evidence are in `EVIDENCE_AND_COVERAGE.md`.
