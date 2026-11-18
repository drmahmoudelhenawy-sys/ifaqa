# Screen Catalog

## Status

The manifest confirms two app-owned external entry activities. The remaining items below are candidate screens inferred from class names, data models, or resource labels. Static records do not show that a candidate screen was opened or that its layout is active. (Evidence: `ev_24b65ad3b0aa13e4630a7dfd206de7d2d9c4725b60caad9c37b1c15d334ab9f5`, `ev_e1da8b1964770471afaf2078706f7ab6c5392c4e03696fa13416257d25f9ac16`, `ev_68e06b198c904e77a5ba7ca123f5bad0926a019a2273044dcfcbc0b3617e5274`–`ev_db6aff248d905d610f5e67810ae753c054ff2130db7ff4538e40b132d1a7ee1b`.)

## Catalog

### Main activity / app entry

- **Arabic label:** Not present in the saved default-locale evidence; do not guess.
- **Verification:** Manifest entry observed; destination screens not observed.
- **Behavior:** MainActivity is the launcher and accepts goldenquran deep-link hosts dua-community, masbaha, and library.
- **Dependencies:** Android activity and intent handling.
- **Unknown:** Home layout, tab/menu labels, and destination for each deep link.
- **Evidence:** `ev_26731ad05568d33e2d46d39425c3f6e21343e27d1ff95f7a0a5fb3bba7874ebf`, `ev_24b65ad3b0aa13e4630a7dfd206de7d2d9c4725b60caad9c37b1c15d334ab9f5`

### Voice/media search entry

- **Arabic label:** Not present in the saved default-locale evidence; do not guess.
- **Verification:** Manifest entry observed; runtime behavior untested.
- **Behavior:** VoicePlayActivity accepts MEDIA_PLAY_FROM_SEARCH.
- **Dependencies:** Android media-search intent handling. Media3 player is present.
- **Unknown:** How query text maps to a reciter, track, or queue.
- **Evidence:** `ev_26731ad05568d33e2d46d39425c3f6e21343e27d1ff95f7a0a5fb3bba7874ebf`, `ev_24b65ad3b0aa13e4630a7dfd206de7d2d9c4725b60caad9c37b1c15d334ab9f5`, `ev_536f67508c97bec7d34c3332a624f83165e79d534a49b466ab23cd65160be17e`, `ev_f822c9bd459082139b5dd08aadbddb2d832cd29642d7a23d909e777a8d646306`, `ev_e893c2122df0068c37143caf3405b556855171709cd70014179df7c1ba90fcfa`, `ev_9949e162820c1752548663f20a86c9033660ccfd252cbbeebc0e54ceac8821c0`, `ev_00df656201863ae3774492f0d23d6cbbeda861dc4a5a39a2c351f51f78d46076`, `ev_bfb102ffeba3ec807d12d8a6a187897fac4ec3f9de49de5bb08cbff8313593a0`

### Quran index

- **Arabic label:** Not present in the saved default-locale evidence; do not guess.
- **Verification:** Candidate screen; path and layout unverified.
- **Behavior:** Quran chapter/surah/page/verse navigation is suggested by resources and data models.
- **Dependencies:** Quran data and reader UI.
- **Unknown:** Visible layout, filters, ordering, and navigation transitions.
- **Evidence:** `ev_68e06b198c904e77a5ba7ca123f5bad0926a019a2273044dcfcbc0b3617e5274`, `ev_65c3b2089d5998b75b20f115d94412b2f641834090f4cc03f867c6b1cbbc762d`, `ev_61673d9c6428891a4d336fb7206fb0ad39da0fb678bf1c43fa858539dfd026ef`, `ev_b97caf2a9f49d85f6ce467f57f483d268d10b9b3fe7d137bfb270099830bf805`, `ev_a515a1161c2ab139e888b0749cb24fb0bceef12319a40a2c2fecf7e0ac5e5708`, `ev_97394cff8bbfe06329439c2496576fca3732a967b2fafa88d59cceb6f2e0e36c`, `ev_da0f10e0c54356306c1de1e68d24503382352e033afd096e2d5b810e3cc4cc11`, `ev_4abac963d58f8fa70214549776d798933d1de95a8bba41fe5369c8f1262b9db3`, `ev_81bdafc400a10a130f43cac89b48072c15095673e0ebfc2e10fbf740e659d02b`, `ev_988da5bf451618fdb79677f2aaa5b047f1d310da713471b1fce45c062e4afa00`, `ev_e1da8b1964770471afaf2078706f7ab6c5392c4e03696fa13416257d25f9ac16`

### Quran reader

- **Arabic label:** Not present in the saved default-locale evidence; do not guess.
- **Verification:** Candidate screen; runtime not observed.
- **Behavior:** Quran reading labels and reader data models point to a reading screen.
- **Dependencies:** Quran text/glyph data and reader UI.
- **Unknown:** Layout, page-turn controls, text style, bookmarks actions, and exact Arabic labels.
- **Evidence:** `ev_68e06b198c904e77a5ba7ca123f5bad0926a019a2273044dcfcbc0b3617e5274`, `ev_65c3b2089d5998b75b20f115d94412b2f641834090f4cc03f867c6b1cbbc762d`, `ev_61673d9c6428891a4d336fb7206fb0ad39da0fb678bf1c43fa858539dfd026ef`, `ev_b97caf2a9f49d85f6ce467f57f483d268d10b9b3fe7d137bfb270099830bf805`, `ev_32944f8a6a36bf3f3eb20651131c7365b09f929052a59d57731ec287712a12f8`, `ev_a515a1161c2ab139e888b0749cb24fb0bceef12319a40a2c2fecf7e0ac5e5708`, `ev_97394cff8bbfe06329439c2496576fca3732a967b2fafa88d59cceb6f2e0e36c`, `ev_da0f10e0c54356306c1de1e68d24503382352e033afd096e2d5b810e3cc4cc11`, `ev_4abac963d58f8fa70214549776d798933d1de95a8bba41fe5369c8f1262b9db3`, `ev_81bdafc400a10a130f43cac89b48072c15095673e0ebfc2e10fbf740e659d02b`, `ev_988da5bf451618fdb79677f2aaa5b047f1d310da713471b1fce45c062e4afa00`, `ev_491981fd821bd23cbd10b961634230250467e4be4f32274100698e31ed994143`

### Search screens

- **Arabic label:** Not present in the saved default-locale evidence; do not guess.
- **Verification:** Candidate screens; screen transitions unverified.
- **Behavior:** Search result types include ayah, glossary, note, page, subject, surah, Tafsir, and translation.
- **Dependencies:** SearchObject and result models. Quran, book, and audio data.
- **Unknown:** Search entry points, ranking, filters, and result layout.
- **Evidence:** `ev_80abce67c3995730a6e7f50f3c604b87bf3b3680ce136b2df26a15c3d151949c`, `ev_4ccbcdca4f775a5da9139ee11d4bbf84a67fc4f8ab9a559494f488c1947a4d0f`, `ev_61673d9c6428891a4d336fb7206fb0ad39da0fb678bf1c43fa858539dfd026ef`, `ev_b97caf2a9f49d85f6ce467f57f483d268d10b9b3fe7d137bfb270099830bf805`, `ev_32944f8a6a36bf3f3eb20651131c7365b09f929052a59d57731ec287712a12f8`, `ev_5759bc1ed62ad5ea63e8dc5ecc327a048c3dfc94bd86ab592c25389371e3bb83`

### Audio library and player

- **Arabic label:** Not present in the saved default-locale evidence; do not guess.
- **Verification:** Audio service and related models observed; UI paths unverified.
- **Behavior:** App-owned Media3 service exposes ExoPlayer; reciter, track, playlist, and AudioFragment evidence suggests library/player screens.
- **Dependencies:** AndroidX Media3/ExoPlayer. Audio metadata and service.
- **Unknown:** Actual screen, queue controls, and playback states.
- **Evidence:** `ev_536f67508c97bec7d34c3332a624f83165e79d534a49b466ab23cd65160be17e`, `ev_f822c9bd459082139b5dd08aadbddb2d832cd29642d7a23d909e777a8d646306`, `ev_e893c2122df0068c37143caf3405b556855171709cd70014179df7c1ba90fcfa`, `ev_9949e162820c1752548663f20a86c9033660ccfd252cbbeebc0e54ceac8821c0`, `ev_00df656201863ae3774492f0d23d6cbbeda861dc4a5a39a2c351f51f78d46076`, `ev_bfb102ffeba3ec807d12d8a6a187897fac4ec3f9de49de5bb08cbff8313593a0`, `ev_65c3b2089d5998b75b20f115d94412b2f641834090f4cc03f867c6b1cbbc762d`, `ev_61673d9c6428891a4d336fb7206fb0ad39da0fb678bf1c43fa858539dfd026ef`, `ev_b97caf2a9f49d85f6ce467f57f483d268d10b9b3fe7d137bfb270099830bf805`

### Bookmarks and notes

- **Arabic label:** Not present in the saved default-locale evidence; do not guess.
- **Verification:** Candidate screen; local model and action labels observed.
- **Behavior:** Resources name bookmark actions; local data models include bookmarks/notes.
- **Dependencies:** Quran reader and local models.
- **Unknown:** List layout, note editor, and save/sync behavior.
- **Evidence:** `ev_68e06b198c904e77a5ba7ca123f5bad0926a019a2273044dcfcbc0b3617e5274`, `ev_65c3b2089d5998b75b20f115d94412b2f641834090f4cc03f867c6b1cbbc762d`, `ev_61673d9c6428891a4d336fb7206fb0ad39da0fb678bf1c43fa858539dfd026ef`, `ev_491981fd821bd23cbd10b961634230250467e4be4f32274100698e31ed994143`, `ev_8d8a994d7236b381f49b17d4dc5fcb5877e99aaa726a4641ea9bbcd99e3e5d37`

### Prayer times and alarms

- **Arabic label:** Not present in the saved default-locale evidence; do not guess.
- **Verification:** Components and models observed; screen layout unverified.
- **Behavior:** Prayer models and alarm/reminder components suggest times, setup, and alarm screens.
- **Dependencies:** Prayer services/workers and Android alarm functions.
- **Unknown:** Calculation settings, location setup, alarm schedule flow, and actual schedule state.
- **Evidence:** `ev_9949e162820c1752548663f20a86c9033660ccfd252cbbeebc0e54ceac8821c0`, `ev_9110bed55a2cfa96177f886cfce173b8f0de9b97c9897ff4221e58cba3a8c002`, `ev_391dfd2a90e6006f0d95dbff5e7151df31a77cc3d9893f34115308a301952505`, `ev_d98e00581bef96d3db871ebafbcb70e17c17835eb6cefddaf11b1144b131f1e6`, `ev_67d05f730f699fcb51e734a5f60fbe3c785f1cb301f11904e40afc48ec2c96bb`, `ev_2e97d4b9df5dbfd63432f9379d76e16a480beac7ac615002c0b9febf1a6e27cd`, `ev_b97caf2a9f49d85f6ce467f57f483d268d10b9b3fe7d137bfb270099830bf805`, `ev_32944f8a6a36bf3f3eb20651131c7365b09f929052a59d57731ec287712a12f8`, `ev_5759bc1ed62ad5ea63e8dc5ecc327a048c3dfc94bd86ab592c25389371e3bb83`, `ev_db6aff248d905d610f5e67810ae753c054ff2130db7ff4538e40b132d1a7ee1b`

### Prayer home-screen widgets

- **Arabic label:** Not present in the saved default-locale evidence; do not guess.
- **Verification:** Widget provider configuration observed; appearance unverified.
- **Behavior:** Two prayer widget definitions specify 15-minute updates.
- **Dependencies:** Android widget providers and prayer data.
- **Unknown:** Widget visual design, fields, and update reliability.
- **Evidence:** `ev_9949e162820c1752548663f20a86c9033660ccfd252cbbeebc0e54ceac8821c0`, `ev_9110bed55a2cfa96177f886cfce173b8f0de9b97c9897ff4221e58cba3a8c002`, `ev_391dfd2a90e6006f0d95dbff5e7151df31a77cc3d9893f34115308a301952505`, `ev_d98e00581bef96d3db871ebafbcb70e17c17835eb6cefddaf11b1144b131f1e6`, `ev_67d05f730f699fcb51e734a5f60fbe3c785f1cb301f11904e40afc48ec2c96bb`, `ev_2e97d4b9df5dbfd63432f9379d76e16a480beac7ac615002c0b9febf1a6e27cd`

### Qibla direction

- **Arabic label:** Not present in the saved default-locale evidence; do not guess.
- **Verification:** Named candidate screen; layout and behavior unverified.
- **Behavior:** Qibla appears in the recorded strings/features.
- **Dependencies:** Actual sensor/location requirements not established.
- **Unknown:** Compass use, calibration, map/compass layout, and accuracy.
- **Evidence:** `ev_b97caf2a9f49d85f6ce467f57f483d268d10b9b3fe7d137bfb270099830bf805`, `ev_32944f8a6a36bf3f3eb20651131c7365b09f929052a59d57731ec287712a12f8`, `ev_5759bc1ed62ad5ea63e8dc5ecc327a048c3dfc94bd86ab592c25389371e3bb83`, `ev_db6aff248d905d610f5e67810ae753c054ff2130db7ff4538e40b132d1a7ee1b`, `ev_e1da8b1964770471afaf2078706f7ab6c5392c4e03696fa13416257d25f9ac16`

### Athkar and duas

- **Arabic label:** Not present in the saved default-locale evidence; do not guess.
- **Verification:** Named feature and bundled database observed; screen unverified.
- **Behavior:** Athkar/dua content and completion are suggested by resource names, database filename, and completion model.
- **Dependencies:** athkar_duas.db by name. AthkarCompletion model.
- **Unknown:** Categories, content, completion workflow, and exact text.
- **Evidence:** `ev_a515a1161c2ab139e888b0749cb24fb0bceef12319a40a2c2fecf7e0ac5e5708`, `ev_a515a1161c2ab139e888b0749cb24fb0bceef12319a40a2c2fecf7e0ac5e5708`, `ev_97394cff8bbfe06329439c2496576fca3732a967b2fafa88d59cceb6f2e0e36c`, `ev_da0f10e0c54356306c1de1e68d24503382352e033afd096e2d5b810e3cc4cc11`, `ev_4abac963d58f8fa70214549776d798933d1de95a8bba41fe5369c8f1262b9db3`, `ev_81bdafc400a10a130f43cac89b48072c15095673e0ebfc2e10fbf740e659d02b`, `ev_988da5bf451618fdb79677f2aaa5b047f1d310da713471b1fce45c062e4afa00`, `ev_68e06b198c904e77a5ba7ca123f5bad0926a019a2273044dcfcbc0b3617e5274`, `ev_65c3b2089d5998b75b20f115d94412b2f641834090f4cc03f867c6b1cbbc762d`, `ev_61673d9c6428891a4d336fb7206fb0ad39da0fb678bf1c43fa858539dfd026ef`, `ev_b97caf2a9f49d85f6ce467f57f483d268d10b9b3fe7d137bfb270099830bf805`, `ev_32944f8a6a36bf3f3eb20651131c7365b09f929052a59d57731ec287712a12f8`

### Dua Community

- **Arabic label:** Not present in the saved default-locale evidence; do not guess.
- **Verification:** Deep-link host and label observed; target screen unverified.
- **Behavior:** MainActivity accepts a dua-community host.
- **Dependencies:** MainActivity deep-link handling.
- **Unknown:** Screen contents, account rules, and server behavior.
- **Evidence:** `ev_26731ad05568d33e2d46d39425c3f6e21343e27d1ff95f7a0a5fb3bba7874ebf`, `ev_24b65ad3b0aa13e4630a7dfd206de7d2d9c4725b60caad9c37b1c15d334ab9f5`, `ev_68e06b198c904e77a5ba7ca123f5bad0926a019a2273044dcfcbc0b3617e5274`, `ev_65c3b2089d5998b75b20f115d94412b2f641834090f4cc03f867c6b1cbbc762d`, `ev_61673d9c6428891a4d336fb7206fb0ad39da0fb678bf1c43fa858539dfd026ef`

### Masbaha

- **Arabic label:** Not present in the saved default-locale evidence; do not guess.
- **Verification:** Deep-link host observed; screen unverified.
- **Behavior:** MainActivity accepts a masbaha host; counter workflow is inferred from the feature name.
- **Dependencies:** MainActivity deep-link handling.
- **Unknown:** Counter layout, controls, and persistence.
- **Evidence:** `ev_26731ad05568d33e2d46d39425c3f6e21343e27d1ff95f7a0a5fb3bba7874ebf`, `ev_24b65ad3b0aa13e4630a7dfd206de7d2d9c4725b60caad9c37b1c15d334ab9f5`, `ev_b97caf2a9f49d85f6ce467f57f483d268d10b9b3fe7d137bfb270099830bf805`, `ev_32944f8a6a36bf3f3eb20651131c7365b09f929052a59d57731ec287712a12f8`, `ev_5759bc1ed62ad5ea63e8dc5ecc327a048c3dfc94bd86ab592c25389371e3bb83`, `ev_db6aff248d905d610f5e67810ae753c054ff2130db7ff4538e40b132d1a7ee1b`

### Khetma plan

- **Arabic label:** Not present in the saved default-locale evidence; do not guess.
- **Verification:** Model and resource evidence observed; screen unverified.
- **Behavior:** Khetma model and strings suggest reading-plan progress.
- **Dependencies:** Khetma model and Quran content.
- **Unknown:** Plan setup, schedule, reminders, and saved progress flow.
- **Evidence:** `ev_2192a005abb265111e3eb899a09ad94cd2780c8a707400201289acfa6486cf6f`, `ev_32944f8a6a36bf3f3eb20651131c7365b09f929052a59d57731ec287712a12f8`, `e`, `v`, `_`, `e`, `1`, `d`, `a`, `8`, `b`, `1`, `9`, `6`, `4`, `7`, `7`, `0`, `4`, `7`, `1`, `a`, `f`, `a`, `f`, `2`, `0`, `7`, `8`, `7`, `0`, `6`, `f`, `7`, `a`, `b`, `6`, `c`, `5`, `3`, `9`, `2`, `c`, `4`, `e`, `0`, `3`, `6`, `9`, `6`, `f`, `a`, `1`, `3`, `4`, `1`, `6`, `2`, `5`, `7`, `d`, `2`, `5`, `f`, `9`, `a`, `c`, `1`, `6`

### Tasmee practice

- **Arabic label:** Not present in the saved default-locale evidence; do not guess.
- **Verification:** Tasmee fragment/model evidence observed; runtime unverified.
- **Behavior:** Session model and labels indicate recitation practice with recognition feedback.
- **Dependencies:** TasmeeFragment and TasmeeSession. Recognition model/download and Quran content.
- **Unknown:** Actual screen, recognition engine and correctness, offline behavior, score upload.
- **Evidence:** `ev_8d8a994d7236b381f49b17d4dc5fcb5877e99aaa726a4641ea9bbcd99e3e5d37`, `ev_3813fe3b4d09b4a8152d71561278fd9bc4b8c993eb02447f2d4649890f8f94cc`, `ev_61673d9c6428891a4d336fb7206fb0ad39da0fb678bf1c43fa858539dfd026ef`, `ev_b97caf2a9f49d85f6ce467f57f483d268d10b9b3fe7d137bfb270099830bf805`, `ev_32944f8a6a36bf3f3eb20651131c7365b09f929052a59d57731ec287712a12f8`, `ev_5759bc1ed62ad5ea63e8dc5ecc327a048c3dfc94bd86ab592c25389371e3bb83`, `ev_db6aff248d905d610f5e67810ae753c054ff2130db7ff4538e40b132d1a7ee1b`

### Hadith collection/search

- **Arabic label:** Not present in the saved default-locale evidence; do not guess.
- **Verification:** Collection and search labels observed; screen unverified.
- **Behavior:** The strings name An-Nawawi's Forty Hadith and hadith search.
- **Dependencies:** Library content and search models.
- **Unknown:** Collection list, reader appearance, and translations.
- **Evidence:** `ev_68e06b198c904e77a5ba7ca123f5bad0926a019a2273044dcfcbc0b3617e5274`, `ev_65c3b2089d5998b75b20f115d94412b2f641834090f4cc03f867c6b1cbbc762d`, `ev_61673d9c6428891a4d336fb7206fb0ad39da0fb678bf1c43fa858539dfd026ef`, `ev_b97caf2a9f49d85f6ce467f57f483d268d10b9b3fe7d137bfb270099830bf805`, `ev_32944f8a6a36bf3f3eb20651131c7365b09f929052a59d57731ec287712a12f8`, `ev_5759bc1ed62ad5ea63e8dc5ecc327a048c3dfc94bd86ab592c25389371e3bb83`, `ev_db6aff248d905d610f5e67810ae753c054ff2130db7ff4538e40b132d1a7ee1b`, `ev_80abce67c3995730a6e7f50f3c604b87bf3b3680ce136b2df26a15c3d151949c`, `ev_4ccbcdca4f775a5da9139ee11d4bbf84a67fc4f8ab9a559494f488c1947a4d0f`

### Library reader

- **Arabic label:** Not present in the saved default-locale evidence; do not guess.
- **Verification:** LibraryReaderFragment observed; navigation/layout unverified.
- **Behavior:** A library reader fragment and library deep-link host are recorded.
- **Dependencies:** LibraryReaderFragment and book data.
- **Unknown:** Book detail/list screens, reader layout, downloads, and deep-link destination.
- **Evidence:** `ev_8b02d869709d2d76e099527c445e48fb81f43e3cc3d6f5c26442f82d84724b5e`, `ev_26731ad05568d33e2d46d39425c3f6e21343e27d1ff95f7a0a5fb3bba7874ebf`, `ev_24b65ad3b0aa13e4630a7dfd206de7d2d9c4725b60caad9c37b1c15d334ab9f5`, `ev_80abce67c3995730a6e7f50f3c604b87bf3b3680ce136b2df26a15c3d151949c`, `ev_4ccbcdca4f775a5da9139ee11d4bbf84a67fc4f8ab9a559494f488c1947a4d0f`

### Live sessions and calls

- **Arabic label:** Not present in the saved default-locale evidence; do not guess.
- **Verification:** Strings and manifest components observed; actual screen unverified.
- **Behavior:** The resource/class evidence names live sessions and calls.
- **Dependencies:** Declared service/receiver components; network and audio permissions.
- **Unknown:** Session type, screen path, participants, and provider.
- **Evidence:** `ev_9949e162820c1752548663f20a86c9033660ccfd252cbbeebc0e54ceac8821c0`, `ev_9110bed55a2cfa96177f886cfce173b8f0de9b97c9897ff4221e58cba3a8c002`, `ev_391dfd2a90e6006f0d95dbff5e7151df31a77cc3d9893f34115308a301952505`, `ev_d98e00581bef96d3db871ebafbcb70e17c17835eb6cefddaf11b1144b131f1e6`, `ev_67d05f730f699fcb51e734a5f60fbe3c785f1cb301f11904e40afc48ec2c96bb`, `ev_2e97d4b9df5dbfd63432f9379d76e16a480beac7ac615002c0b9febf1a6e27cd`, `ev_32944f8a6a36bf3f3eb20651131c7365b09f929052a59d57731ec287712a12f8`, `ev_5759bc1ed62ad5ea63e8dc5ecc327a048c3dfc94bd86ab592c25389371e3bb83`, `ev_db6aff248d905d610f5e67810ae753c054ff2130db7ff4538e40b132d1a7ee1b`

### Settings and statistics

- **Arabic label:** Not present in the saved default-locale evidence; do not guess.
- **Verification:** Model evidence observed; screen and persistence unverified.
- **Behavior:** Preference/reader state and Statistics models suggest settings and summary views.
- **Dependencies:** Local models; storage mapping unknown.
- **Unknown:** Exact controls, metrics, persistence, and sync.
- **Evidence:** `ev_491981fd821bd23cbd10b961634230250467e4be4f32274100698e31ed994143`, `ev_8d8a994d7236b381f49b17d4dc5fcb5877e99aaa726a4641ea9bbcd99e3e5d37`, `ev_3813fe3b4d09b4a8152d71561278fd9bc4b8c993eb02447f2d4649890f8f94cc`, `ev_2192a005abb265111e3eb899a09ad94cd2780c8a707400201289acfa6486cf6f`, `ev_3ac55afecc178890337f7a9cf6e6b8d38f01b56a287db9a62e0587aadb128c7e`, `ev_9291c81216a31a8e58df7ca71a13409a3c8f0c163e7e70ff6f21c6c8a36208c4`, `ev_92f844f1aa4d89b49815c5ed4eff8552e267e94515a550e99f7b4e39376cbc6c`


## Coverage note

There are 63 layout XML files and nine `res/xml` files in the archive; the evidence does not map each layout to an active screen. The archive has no `res/menu` entries. (Evidence: `ev_a515a1161c2ab139e888b0749cb24fb0bceef12319a40a2c2fecf7e0ac5e5708`, `ev_84305f3349eb9ca08aa801416a4e6f8ffed63159ad159edfb602ad87346da97a`, `ev_966c4245b55dfd1fc69ac0a2a52fc4c96420d1253511ccbec1b7933f7ab59987`, `ev_ad3c8e16e648bab99f50b31fecdf9f0d97e58b7ed6594dd6a69f33293de1c461`.)
