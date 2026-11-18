# Hypotheses

## hyp_1 (Refuted)

The loaded base APK bundles a Flutter runtime.

Prediction: A static Flutter scan should find lib/<abi>/libapp.so or libflutter.so entries.

Contradicting: ev_c73d0e1d68d4c09dbcc56ceacdcec13230a73a168e5b612d1909d84612f39e41

- The scan covered the base APK and found no Flutter libapp.so/libflutter.so. This does not rule out code delivered in a split or downloaded later.
## hyp_2 (Supported)

The app's own Android code is primarily written in or generated from Kotlin.

Prediction: The APK should contain Kotlin runtime markers and app-owned Kotlin-shaped classes such as data models, coroutine workers, or generated Room code.

Supporting: ev_6b8757ef5809e553de256cb13d37f331afb95e046b55d88231523f4164e1e35c, ev_e1da8b1964770471afaf2078706f7ab6c5392c4e03696fa13416257d25f9ac16

- The archive graph identifies Kotlin builtins; app-owned classes include generated Room database types and CoroutineWorker implementations. This supports Kotlin use but does not recover the original source or build configuration.
## hyp_3 (Supported)

The three bundled databases likely serve separate Quran text, Quran glyph/layout, and athkar/dua data roles.

Prediction: Names and app models should align: Quran databases with chapter/page/verse models, and athkar_duas.db with athkar/dua feature names.

Supporting: ev_a515a1161c2ab139e888b0749cb24fb0bceef12319a40a2c2fecf7e0ac5e5708, ev_97394cff8bbfe06329439c2496576fca3732a967b2fafa88d59cceb6f2e0e36c, ev_4abac963d58f8fa70214549776d798933d1de95a8bba41fe5369c8f1262b9db3, ev_81bdafc400a10a130f43cac89b48072c15095673e0ebfc2e10fbf740e659d02b, ev_988da5bf451618fdb79677f2aaa5b047f1d310da713471b1fce45c062e4afa00, ev_236c4b735b67ad61fabdd332fed811f05e5b25a94ef80b8c296bd5459d3a611a, ev_b5bf317d70879cc7392e1af5bfadc2e5ff5307751da9ab6dd2f1eed023ac159f, ev_50709534f06e6146af369e306e8307b021de735f635925916b72ec16e52e2276, ev_4363e35872162d38b56e2a5b58d71d6dc6c4d7672b78d4ba7b404221049e43d2

- Supported only as a name/model-based inference; the three actual SQLite schemas were not read, so database purpose mapping is not verified.
- Schema names and columns match the predicted division: Quran/reader/audio/book data in quran_app.db, word layout data in quran_glyphs.db, and sections/athkar plus Quran references in athkar_duas.db.
- Schemas are now directly observed. quran_app.db includes Quran word/book/reader data, quran_glyphs.db stores word positioning/rendering fields, and athkar_duas.db stores athkar sections and references. Purpose mapping is supported by table names/columns but remains an inference; no table rows were read.
## hyp_4 (Supported)

The supplied base APK contains a populated Arabic-language string table.

Prediction: A locale-specific resource read should identify `ar` entries with resource IDs and Arabic values, and paging should reach the reported total.

Supporting: ev_8947dd0205e714a05ee28f5f7c1ecf2bd0faef0898ca52369f8933652f60e0db, ev_1ae740b16fd37087da337d5c94ba14fc72df26840082ca4d3709e7b4abd1fe8b, ev_62634933bd6b18536f16bcf32991c2c0824fc490960ec171bc550bd1fc0e9e5e, ev_b7b46ba0b84c97444befe578343dbb38e361e05475ffe0fe4b53eadb979bc999, ev_597193e8be9be14e4b6442ab5cdb1234c29b9ce7541c609d775e36143d9cc67f, ev_4ce7d953336c169a68005f8532ec56774377e5176b792daf26efe768c7abe4ee, ev_ad62a4275d733be70711e31941cbd0e656bf41b0e533bd88aad64e1f0aeb4df5, ev_658a4e3fa5c7c1c0ad99e8f451c71244c6ab2a5a14497d69e11789fbfdc9f3cb

- The Arabic resource parser found locale `ar` and all seven result pages covered 3,166 entries; it explicitly reported that `ar-rEG` was not found.
