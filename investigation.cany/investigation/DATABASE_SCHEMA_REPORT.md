# Database Schema Report

## What is directly known

The APK archive contains three SQLite database files by name: `quran_app.db`, `quran_glyphs.db`, and `athkar_duas.db`. The archive index covered 1,283 entries; it lists 194 assets, 904 resource files, and 510 drawable-path files. The file names and presence are observed; table contents are not. (Evidence: `ev_a515a1161c2ab139e888b0749cb24fb0bceef12319a40a2c2fecf7e0ac5e5708`, `ev_84305f3349eb9ca08aa801416a4e6f8ffed63159ad159edfb602ad87346da97a`, `ev_966c4245b55dfd1fc69ac0a2a52fc4c96420d1253511ccbec1b7933f7ab59987`.)

The app class inventory also contains two Room-style database wrappers and models for Quran structures such as verse/chapter/page and header/part/quarter data, along with local bookmark, note, and reading models. This suggests roles for the data layer, but does not identify the actual bundled database schema. (Evidence: `ev_a515a1161c2ab139e888b0749cb24fb0bceef12319a40a2c2fecf7e0ac5e5708`, `ev_97394cff8bbfe06329439c2496576fca3732a967b2fafa88d59cceb6f2e0e36c`, `ev_da0f10e0c54356306c1de1e68d24503382352e033afd096e2d5b810e3cc4cc11`, `ev_4abac963d58f8fa70214549776d798933d1de95a8bba41fe5369c8f1262b9db3`, `ev_81bdafc400a10a130f43cac89b48072c15095673e0ebfc2e10fbf740e659d02b`, `ev_988da5bf451618fdb79677f2aaa5b047f1d310da713471b1fce45c062e4afa00`.)

## Schema status

| Database file | Observed fact | Likely role | Exact schema status |
|---|---|---|---|
| `quran_app.db` | Bundled SQLite filename | Quran content/index data is a name-based inference | Table names, columns, indexes, relations, and row counts unknown |
| `quran_glyphs.db` | Bundled SQLite filename | Glyph/rendering data is a name-based inference | Table names, columns, indexes, relations, and row counts unknown |
| `athkar_duas.db` | Bundled SQLite filename | Athkar/dua content is a name-based inference | Table names, columns, indexes, relations, and row counts unknown |

The role guesses are supported by database names and related model/string names only. They have not been confirmed by opening the SQLite files. (Evidence: `ev_a515a1161c2ab139e888b0749cb24fb0bceef12319a40a2c2fecf7e0ac5e5708`, `ev_97394cff8bbfe06329439c2496576fca3732a967b2fafa88d59cceb6f2e0e36c`, `ev_da0f10e0c54356306c1de1e68d24503382352e033afd096e2d5b810e3cc4cc11`, `ev_4abac963d58f8fa70214549776d798933d1de95a8bba41fe5369c8f1262b9db3`, `ev_81bdafc400a10a130f43cac89b48072c15095673e0ebfc2e10fbf740e659d02b`, `ev_988da5bf451618fdb79677f2aaa5b047f1d310da713471b1fce45c062e4afa00`.)

## App-owned data models

The evidence names local models for UserMushaf, SearchObject, Reciter, ReciterTracks, SuraPlayerItem, Khetma, TasmeeSession, ReadingSession, PrayerCheckin, AthkarCompletion, and Statistics. These models show candidate data shapes, not proof that each field is stored in the bundled SQLite files. (Evidence: `ev_491981fd821bd23cbd10b961634230250467e4be4f32274100698e31ed994143`, `ev_8d8a994d7236b381f49b17d4dc5fcb5877e99aaa726a4641ea9bbcd99e3e5d37`, `ev_3813fe3b4d09b4a8152d71561278fd9bc4b8c993eb02447f2d4649890f8f94cc`, `ev_2192a005abb265111e3eb899a09ad94cd2780c8a707400201289acfa6486cf6f`, `ev_3ac55afecc178890337f7a9cf6e6b8d38f01b56a287db9a62e0587aadb128c7e`, `ev_9291c81216a31a8e58df7ca71a13409a3c8f0c163e7e70ff6f21c6c8a36208c4`, `ev_bfb102ffeba3ec807d12d8a6a187897fac4ec3f9de49de5bb08cbff8313593a0`.)

## What must not be guessed

- No table names or SQL statements are available in the saved evidence.
- No row counts, indexes, foreign keys, or database version were recorded.
- No mapping from Room entities to these three database files was confirmed.
- No database content rows are reproduced in this report.

The investigation records this as open unknown `unk_85988a97c784b919`. A schema-only read of the bundled files would answer it without needing to copy row contents. (Evidence: `ev_a515a1161c2ab139e888b0749cb24fb0bceef12319a40a2c2fecf7e0ac5e5708`; unknown `unk_85988a97c784b919`.)
