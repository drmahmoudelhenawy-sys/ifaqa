# Complete Feature Inventory

## Reading guide

“Observed” means a name, class, model, or Android component is directly present in saved static evidence. “Inferred” describes likely user behavior based on those clues. No feature in this inventory was confirmed by running the APK. For each item, dependencies are only listed when evidence supports them; otherwise they are marked unknown.

## Quran reading and browsing

- **Verification:** Strong static evidence; runtime behavior unverified.
- **Observed:** Quran reading and navigation labels appear in the saved default string pages. The app class roster includes Quran-related UI and data groups.
- **Behavior:** Inferred: the app likely lets a person browse Quran content by chapter, page, or verse. Exact gestures and reader layout are unknown.
- **Dependencies:** Quran-related bundled data is named in the archive. Reader UI and model classes are present.
- **Unknown:** Actual reader screen and navigation path. Whether all reading modes work in the supplied build. Exact Arabic screen labels were not captured in the saved default-locale pages.
- **Evidence:** `ev_68e06b198c904e77a5ba7ca123f5bad0926a019a2273044dcfcbc0b3617e5274`, `ev_65c3b2089d5998b75b20f115d94412b2f641834090f4cc03f867c6b1cbbc762d`, `ev_61673d9c6428891a4d336fb7206fb0ad39da0fb678bf1c43fa858539dfd026ef`, `ev_b97caf2a9f49d85f6ce467f57f483d268d10b9b3fe7d137bfb270099830bf805`, `ev_32944f8a6a36bf3f3eb20651131c7365b09f929052a59d57731ec287712a12f8`, `ev_e1da8b1964770471afaf2078706f7ab6c5392c4e03696fa13416257d25f9ac16`, `ev_a515a1161c2ab139e888b0749cb24fb0bceef12319a40a2c2fecf7e0ac5e5708`, `ev_a515a1161c2ab139e888b0749cb24fb0bceef12319a40a2c2fecf7e0ac5e5708`, `ev_97394cff8bbfe06329439c2496576fca3732a967b2fafa88d59cceb6f2e0e36c`, `ev_da0f10e0c54356306c1de1e68d24503382352e033afd096e2d5b810e3cc4cc11`, `ev_4abac963d58f8fa70214549776d798933d1de95a8bba41fe5369c8f1262b9db3`, `ev_81bdafc400a10a130f43cac89b48072c15095673e0ebfc2e10fbf740e659d02b`, `ev_988da5bf451618fdb79677f2aaa5b047f1d310da713471b1fce45c062e4afa00`

## Mushaf copies and reader preferences

- **Verification:** Static model and resource evidence; runtime unverified.
- **Observed:** The saved class evidence includes UserMushaf, and the resource strings name Quran copies.
- **Behavior:** Inferred: a person may select or configure a Quran copy or reading style.
- **Dependencies:** UserMushaf data model. Quran reader and content.
- **Unknown:** What each copy changes. Where the selection is saved. Whether copy assets are in this base APK or a split.
- **Evidence:** `ev_491981fd821bd23cbd10b961634230250467e4be4f32274100698e31ed994143`, `ev_68e06b198c904e77a5ba7ca123f5bad0926a019a2273044dcfcbc0b3617e5274`, `ev_65c3b2089d5998b75b20f115d94412b2f641834090f4cc03f867c6b1cbbc762d`, `ev_e1da8b1964770471afaf2078706f7ab6c5392c4e03696fa13416257d25f9ac16`

## Quran and content search

- **Verification:** Observed model and label evidence; search runtime unverified.
- **Observed:** SearchObject fields include text/hit data and optional page, ayah, surah, reciter, and book IDs; result types include ayah, glossary, note, page, subject, surah, Tafsir, and translation.
- **Behavior:** Inferred: search may cover Quran text and related library/audio content, with results that can refer to a page or verse.
- **Dependencies:** SearchObject/result models. Quran, Tafsir/translation, audio, and library data as available.
- **Unknown:** Matching method, ranking, filters, and empty/error states. Whether search is local, server-backed, or mixed.
- **Evidence:** `ev_80abce67c3995730a6e7f50f3c604b87bf3b3680ce136b2df26a15c3d151949c`, `ev_4ccbcdca4f775a5da9139ee11d4bbf84a67fc4f8ab9a559494f488c1947a4d0f`, `ev_61673d9c6428891a4d336fb7206fb0ad39da0fb678bf1c43fa858539dfd026ef`, `ev_5759bc1ed62ad5ea63e8dc5ecc327a048c3dfc94bd86ab592c25389371e3bb83`

## Bookmarks and notes

- **Verification:** Observed labels and local model evidence; save behavior unverified.
- **Observed:** The resource pages name bookmark actions, and the saved model inventory includes local bookmark and note-related data.
- **Behavior:** Inferred: readers can mark a place and attach or review notes.
- **Dependencies:** Quran reader. Local bookmark/note models; storage target is unknown.
- **Unknown:** Fields stored, save timing, sync, and deletion behavior. Exact bookmark and note screens.
- **Evidence:** `ev_491981fd821bd23cbd10b961634230250467e4be4f32274100698e31ed994143`, `ev_491981fd821bd23cbd10b961634230250467e4be4f32274100698e31ed994143`, `ev_8d8a994d7236b381f49b17d4dc5fcb5877e99aaa726a4641ea9bbcd99e3e5d37`, `ev_68e06b198c904e77a5ba7ca123f5bad0926a019a2273044dcfcbc0b3617e5274`, `ev_65c3b2089d5998b75b20f115d94412b2f641834090f4cc03f867c6b1cbbc762d`, `ev_61673d9c6428891a4d336fb7206fb0ad39da0fb678bf1c43fa858539dfd026ef`

## Tafsir and translation

- **Verification:** Observed named strings and search result types; runtime unverified.
- **Observed:** Default strings name Tafsir/translation and search result models include both result kinds.
- **Behavior:** Inferred: the app can present Quran explanation or translation content.
- **Dependencies:** Quran reader and related content data.
- **Unknown:** Available languages, providers, licensing, selection flow, and offline behavior.
- **Evidence:** `ev_80abce67c3995730a6e7f50f3c604b87bf3b3680ce136b2df26a15c3d151949c`, `ev_61673d9c6428891a4d336fb7206fb0ad39da0fb678bf1c43fa858539dfd026ef`, `ev_b97caf2a9f49d85f6ce467f57f483d268d10b9b3fe7d137bfb270099830bf805`, `ev_32944f8a6a36bf3f3eb20651131c7365b09f929052a59d57731ec287712a12f8`, `ev_5759bc1ed62ad5ea63e8dc5ecc327a048c3dfc94bd86ab592c25389371e3bb83`, `ev_db6aff248d905d610f5e67810ae753c054ff2130db7ff4538e40b132d1a7ee1b`

## Audio player and reciter library

- **Verification:** Observed Android service/model evidence; exact playback flow unverified.
- **Observed:** An app-owned AndroidX Media3 MediaSessionService exposes an ExoPlayer. AudioFragment and reciter, track, and playlist models are present.
- **Behavior:** Inferred: the app can browse reciters/tracks and play audio through an Android media session.
- **Dependencies:** AndroidX Media3 / ExoPlayer. Audio service and reciter/track/playlist data.
- **Unknown:** Queue rules, repeat/shuffle behavior, playback UI, and background controls in use.
- **Evidence:** `ev_536f67508c97bec7d34c3332a624f83165e79d534a49b466ab23cd65160be17e`, `ev_f822c9bd459082139b5dd08aadbddb2d832cd29642d7a23d909e777a8d646306`, `ev_e893c2122df0068c37143caf3405b556855171709cd70014179df7c1ba90fcfa`, `ev_9949e162820c1752548663f20a86c9033660ccfd252cbbeebc0e54ceac8821c0`, `ev_00df656201863ae3774492f0d23d6cbbeda861dc4a5a39a2c351f51f78d46076`, `ev_bfb102ffeba3ec807d12d8a6a187897fac4ec3f9de49de5bb08cbff8313593a0`, `ev_68e06b198c904e77a5ba7ca123f5bad0926a019a2273044dcfcbc0b3617e5274`, `ev_65c3b2089d5998b75b20f115d94412b2f641834090f4cc03f867c6b1cbbc762d`, `ev_61673d9c6428891a4d336fb7206fb0ad39da0fb678bf1c43fa858539dfd026ef`, `ev_b97caf2a9f49d85f6ce467f57f483d268d10b9b3fe7d137bfb270099830bf805`

## Audio downloads and offline audio

- **Verification:** Static worker, model, and string evidence; offline playback unverified.
- **Observed:** Audio download labels and audio refresh/update workers and download-state models are present.
- **Behavior:** Inferred: audio files or metadata may be downloaded for offline use.
- **Dependencies:** Audio library. Download worker and local file/storage handling.
- **Unknown:** File locations, download triggers, cancellation/retry, storage permission behavior, and offline playback.
- **Evidence:** `ev_536f67508c97bec7d34c3332a624f83165e79d534a49b466ab23cd65160be17e`, `ev_f822c9bd459082139b5dd08aadbddb2d832cd29642d7a23d909e777a8d646306`, `ev_e893c2122df0068c37143caf3405b556855171709cd70014179df7c1ba90fcfa`, `ev_9949e162820c1752548663f20a86c9033660ccfd252cbbeebc0e54ceac8821c0`, `ev_00df656201863ae3774492f0d23d6cbbeda861dc4a5a39a2c351f51f78d46076`, `ev_bfb102ffeba3ec807d12d8a6a187897fac4ec3f9de49de5bb08cbff8313593a0`, `ev_21fa2807dc0b248148037806d6ea6f15c7f0f3654447f8a306499eb236d4a376`, `ev_29d50bdab145fdc49594017f31026c7ac8b93fbb769b6306a613f707685b1883`

## Prayer times and prayer check-ins

- **Verification:** Static labels, model, and background component evidence; runtime unverified.
- **Observed:** Prayer-time labels and a PrayerCheckin model are recorded. Prayer-related services, receivers, and workers are listed.
- **Behavior:** Inferred: the app may display prayer times and record prayer completion/check-ins.
- **Dependencies:** Location/time-related Android permissions are declared. Prayer models and background components.
- **Unknown:** Calculation method, location source, timezone handling, and check-in persistence.
- **Evidence:** `ev_9949e162820c1752548663f20a86c9033660ccfd252cbbeebc0e54ceac8821c0`, `ev_9110bed55a2cfa96177f886cfce173b8f0de9b97c9897ff4221e58cba3a8c002`, `ev_391dfd2a90e6006f0d95dbff5e7151df31a77cc3d9893f34115308a301952505`, `ev_d98e00581bef96d3db871ebafbcb70e17c17835eb6cefddaf11b1144b131f1e6`, `ev_67d05f730f699fcb51e734a5f60fbe3c785f1cb301f11904e40afc48ec2c96bb`, `ev_2e97d4b9df5dbfd63432f9379d76e16a480beac7ac615002c0b9febf1a6e27cd`, `ev_7b95177c7ec0b99ec1febe3c990ff41799b127e5777a967b8fc58ea04af2b2d4`, `ev_61673d9c6428891a4d336fb7206fb0ad39da0fb678bf1c43fa858539dfd026ef`, `ev_b97caf2a9f49d85f6ce467f57f483d268d10b9b3fe7d137bfb270099830bf805`, `ev_32944f8a6a36bf3f3eb20651131c7365b09f929052a59d57731ec287712a12f8`, `ev_5759bc1ed62ad5ea63e8dc5ecc327a048c3dfc94bd86ab592c25389371e3bb83`, `ev_db6aff248d905d610f5e67810ae753c054ff2130db7ff4538e40b132d1a7ee1b`

## Prayer alarms and home-screen widgets

- **Verification:** Observed manifest/resource configuration; actual scheduling unverified.
- **Observed:** The manifest declares prayer alarm services/receivers and three widgets. Two prayer widget provider definitions specify a 15-minute update interval. Prayer alarm service fields include MediaPlayer, AudioManager, WakeLock, Handler, and HandlerThread.
- **Behavior:** Inferred: scheduled alarms can play audio and widgets can refresh prayer information.
- **Dependencies:** Android alarm/background scheduling. Audio playback components. Widget providers.
- **Unknown:** Whether alarms are scheduled in normal use, exact alarm rules, content, and widget appearance.
- **Evidence:** `ev_9949e162820c1752548663f20a86c9033660ccfd252cbbeebc0e54ceac8821c0`, `ev_9110bed55a2cfa96177f886cfce173b8f0de9b97c9897ff4221e58cba3a8c002`, `ev_391dfd2a90e6006f0d95dbff5e7151df31a77cc3d9893f34115308a301952505`, `ev_d98e00581bef96d3db871ebafbcb70e17c17835eb6cefddaf11b1144b131f1e6`, `ev_67d05f730f699fcb51e734a5f60fbe3c785f1cb301f11904e40afc48ec2c96bb`, `ev_2e97d4b9df5dbfd63432f9379d76e16a480beac7ac615002c0b9febf1a6e27cd`, `ev_10b1f848f3fa28997f3dd4ee9275b57a8047c50ac2b13ae0a7eec4b7db5413c1`

## Qibla direction

- **Verification:** Named static feature evidence; behavior and runtime unverified.
- **Observed:** Qibla appears among the recorded user-facing feature strings and app class areas.
- **Behavior:** Inferred: the feature may show a direction toward the Qibla.
- **Dependencies:** Likely device location or orientation sensors; actual code dependency was not established.
- **Unknown:** Sensor use, calculation source, calibration steps, and screen layout.
- **Evidence:** `ev_b97caf2a9f49d85f6ce467f57f483d268d10b9b3fe7d137bfb270099830bf805`, `ev_32944f8a6a36bf3f3eb20651131c7365b09f929052a59d57731ec287712a12f8`, `ev_5759bc1ed62ad5ea63e8dc5ecc327a048c3dfc94bd86ab592c25389371e3bb83`, `ev_db6aff248d905d610f5e67810ae753c054ff2130db7ff4538e40b132d1a7ee1b`, `ev_e1da8b1964770471afaf2078706f7ab6c5392c4e03696fa13416257d25f9ac16`, `ev_05c1f6c2ab3547ccce70c095559a6ad9ec9054f4f4217b7b273a5981faa12128`

## Athkar and duas

- **Verification:** Observed feature strings and bundled database name; runtime unverified.
- **Observed:** Strings name athkar and duas, and the APK contains athkar_duas.db.
- **Behavior:** Inferred: the app can present devotional text and may track completion.
- **Dependencies:** athkar_duas.db by filename. AthkarCompletion model.
- **Unknown:** Actual schema, categories, source, completion rules, and offline behavior.
- **Evidence:** `ev_a515a1161c2ab139e888b0749cb24fb0bceef12319a40a2c2fecf7e0ac5e5708`, `ev_a515a1161c2ab139e888b0749cb24fb0bceef12319a40a2c2fecf7e0ac5e5708`, `ev_97394cff8bbfe06329439c2496576fca3732a967b2fafa88d59cceb6f2e0e36c`, `ev_da0f10e0c54356306c1de1e68d24503382352e033afd096e2d5b810e3cc4cc11`, `ev_4abac963d58f8fa70214549776d798933d1de95a8bba41fe5369c8f1262b9db3`, `ev_81bdafc400a10a130f43cac89b48072c15095673e0ebfc2e10fbf740e659d02b`, `ev_988da5bf451618fdb79677f2aaa5b047f1d310da713471b1fce45c062e4afa00`, `ev_68e06b198c904e77a5ba7ca123f5bad0926a019a2273044dcfcbc0b3617e5274`, `ev_65c3b2089d5998b75b20f115d94412b2f641834090f4cc03f867c6b1cbbc762d`, `ev_61673d9c6428891a4d336fb7206fb0ad39da0fb678bf1c43fa858539dfd026ef`, `ev_b97caf2a9f49d85f6ce467f57f483d268d10b9b3fe7d137bfb270099830bf805`, `ev_32944f8a6a36bf3f3eb20651131c7365b09f929052a59d57731ec287712a12f8`, `ev_f138cd73199c9cc4bb6ad2dcfae17d0ba8077255a109d0b8fb29818a8b896e5e`

## Dua Community

- **Verification:** Observed named string and deep-link host; destination behavior unverified.
- **Observed:** The manifest accepts the goldenquran dua-community host and strings name Dua Community.
- **Behavior:** The deep-link host is observed. What the community page displays or lets a user do is unknown.
- **Dependencies:** MainActivity deep-link handling. Network/account dependencies are not established.
- **Unknown:** Destination screen, sign-in rules, posts, moderation, and server APIs.
- **Evidence:** `ev_26731ad05568d33e2d46d39425c3f6e21343e27d1ff95f7a0a5fb3bba7874ebf`, `ev_24b65ad3b0aa13e4630a7dfd206de7d2d9c4725b60caad9c37b1c15d334ab9f5`, `ev_68e06b198c904e77a5ba7ca123f5bad0926a019a2273044dcfcbc0b3617e5274`, `ev_65c3b2089d5998b75b20f115d94412b2f641834090f4cc03f867c6b1cbbc762d`, `ev_61673d9c6428891a4d336fb7206fb0ad39da0fb678bf1c43fa858539dfd026ef`

## Masbaha counter

- **Verification:** Observed deep-link host and feature name; counting behavior inferred.
- **Observed:** The manifest accepts a masbaha deep-link host; masbaha is named in feature resources/class inventory.
- **Behavior:** Inferred: a counter may record repeated recitations.
- **Dependencies:** MainActivity deep-link handling. Persistence is unknown.
- **Unknown:** Counter controls, reset behavior, saved history, and exact screen.
- **Evidence:** `ev_26731ad05568d33e2d46d39425c3f6e21343e27d1ff95f7a0a5fb3bba7874ebf`, `ev_24b65ad3b0aa13e4630a7dfd206de7d2d9c4725b60caad9c37b1c15d334ab9f5`, `ev_b97caf2a9f49d85f6ce467f57f483d268d10b9b3fe7d137bfb270099830bf805`, `ev_32944f8a6a36bf3f3eb20651131c7365b09f929052a59d57731ec287712a12f8`, `ev_5759bc1ed62ad5ea63e8dc5ecc327a048c3dfc94bd86ab592c25389371e3bb83`, `ev_db6aff248d905d610f5e67810ae753c054ff2130db7ff4538e40b132d1a7ee1b`, `ev_e1da8b1964770471afaf2078706f7ab6c5392c4e03696fa13416257d25f9ac16`

## Khetma reading plan

- **Verification:** Observed model and named strings; progress behavior inferred.
- **Observed:** A Khetma model and Khetma-related strings are present.
- **Behavior:** Inferred: a reading plan may track progress toward completing the Quran.
- **Dependencies:** Khetma model. Quran chapter/page data.
- **Unknown:** Plan creation, schedule, reminders, progress updates, and storage.
- **Evidence:** `ev_2192a005abb265111e3eb899a09ad94cd2780c8a707400201289acfa6486cf6f`, `ev_32944f8a6a36bf3f3eb20651131c7365b09f929052a59d57731ec287712a12f8`, `e`, `v`, `_`, `e`, `1`, `d`, `a`, `8`, `b`, `1`, `9`, `6`, `4`, `7`, `7`, `0`, `4`, `7`, `1`, `a`, `f`, `a`, `f`, `2`, `0`, `7`, `8`, `7`, `0`, `6`, `f`, `7`, `a`, `b`, `6`, `c`, `5`, `3`, `9`, `2`, `c`, `4`, `e`, `0`, `3`, `6`, `9`, `6`, `f`, `a`, `1`, `3`, `4`, `1`, `6`, `2`, `5`, `7`, `d`, `2`, `5`, `f`, `9`, `a`, `c`, `1`, `6`

## Tasmee recitation practice

- **Verification:** Inferred from model, fragment, workers, and labels; runtime unverified.
- **Observed:** TasmeeFragment and TasmeeSession models are recorded. Evidence names fields for chapter/range, duration, correct/missed/wrong words, hints, and score; strings describe a one-time model download for offline use and a score-upload worker.
- **Behavior:** Inferred: a person practices reciting a selected Quran range and receives recognition feedback and a score.
- **Dependencies:** Quran text/range selection. Recognition model download. Score upload worker.
- **Unknown:** Recognition accuracy, exact voice flow, offline operation, upload conditions, and whether the feature runs.
- **Evidence:** `ev_8d8a994d7236b381f49b17d4dc5fcb5877e99aaa726a4641ea9bbcd99e3e5d37`, `ev_3813fe3b4d09b4a8152d71561278fd9bc4b8c993eb02447f2d4649890f8f94cc`, `ev_61673d9c6428891a4d336fb7206fb0ad39da0fb678bf1c43fa858539dfd026ef`, `ev_b97caf2a9f49d85f6ce467f57f483d268d10b9b3fe7d137bfb270099830bf805`, `ev_32944f8a6a36bf3f3eb20651131c7365b09f929052a59d57731ec287712a12f8`, `ev_5759bc1ed62ad5ea63e8dc5ecc327a048c3dfc94bd86ab592c25389371e3bb83`, `ev_db6aff248d905d610f5e67810ae753c054ff2130db7ff4538e40b132d1a7ee1b`, `ev_e1da8b1964770471afaf2078706f7ab6c5392c4e03696fa13416257d25f9ac16`

## Hadith collection

- **Verification:** Observed named content and search terms; runtime unverified.
- **Observed:** Strings name An-Nawawi's Forty Hadith and hadith search.
- **Behavior:** Inferred: a person can browse or search a hadith collection.
- **Dependencies:** Book/library content and search models.
- **Unknown:** Full collection, source, translations, and screen path.
- **Evidence:** `ev_68e06b198c904e77a5ba7ca123f5bad0926a019a2273044dcfcbc0b3617e5274`, `ev_65c3b2089d5998b75b20f115d94412b2f641834090f4cc03f867c6b1cbbc762d`, `ev_61673d9c6428891a4d336fb7206fb0ad39da0fb678bf1c43fa858539dfd026ef`, `ev_b97caf2a9f49d85f6ce467f57f483d268d10b9b3fe7d137bfb270099830bf805`, `ev_32944f8a6a36bf3f3eb20651131c7365b09f929052a59d57731ec287712a12f8`, `ev_5759bc1ed62ad5ea63e8dc5ecc327a048c3dfc94bd86ab592c25389371e3bb83`, `ev_db6aff248d905d610f5e67810ae753c054ff2130db7ff4538e40b132d1a7ee1b`, `ev_80abce67c3995730a6e7f50f3c604b87bf3b3680ce136b2df26a15c3d151949c`, `ev_4ccbcdca4f775a5da9139ee11d4bbf84a67fc4f8ab9a559494f488c1947a4d0f`

## Books and library reader

- **Verification:** Observed library reader class and deep-link host; screen contents partly unknown.
- **Observed:** LibraryReaderFragment is present. MainActivity accepts the library deep-link host; book search labels are recorded.
- **Behavior:** Inferred: the app includes a book/library browsing and reading area.
- **Dependencies:** LibraryReaderFragment. Book data and search models.
- **Unknown:** Book list, downloads, reader layout, and exact deep-link destination.
- **Evidence:** `ev_8b02d869709d2d76e099527c445e48fb81f43e3cc3d6f5c26442f82d84724b5e`, `ev_26731ad05568d33e2d46d39425c3f6e21343e27d1ff95f7a0a5fb3bba7874ebf`, `ev_24b65ad3b0aa13e4630a7dfd206de7d2d9c4725b60caad9c37b1c15d334ab9f5`, `ev_80abce67c3995730a6e7f50f3c604b87bf3b3680ce136b2df26a15c3d151949c`, `ev_4ccbcdca4f775a5da9139ee11d4bbf84a67fc4f8ab9a559494f488c1947a4d0f`, `ev_61673d9c6428891a4d336fb7206fb0ad39da0fb678bf1c43fa858539dfd026ef`, `ev_b97caf2a9f49d85f6ce467f57f483d268d10b9b3fe7d137bfb270099830bf805`, `ev_32944f8a6a36bf3f3eb20651131c7365b09f929052a59d57731ec287712a12f8`, `ev_5759bc1ed62ad5ea63e8dc5ecc327a048c3dfc94bd86ab592c25389371e3bb83`, `ev_db6aff248d905d610f5e67810ae753c054ff2130db7ff4538e40b132d1a7ee1b`

## Live sessions and calls

- **Verification:** Observed strings and manifest components; runtime unverified.
- **Observed:** Live-session strings and live-call/messaging components are recorded.
- **Behavior:** Inferred: live or interactive session screens may be available.
- **Dependencies:** Manifest services/receivers; network and audio permissions are declared.
- **Unknown:** Whether sessions are video/audio/text, signaling provider, access rules, and runtime availability.
- **Evidence:** `ev_9949e162820c1752548663f20a86c9033660ccfd252cbbeebc0e54ceac8821c0`, `ev_9110bed55a2cfa96177f886cfce173b8f0de9b97c9897ff4221e58cba3a8c002`, `ev_391dfd2a90e6006f0d95dbff5e7151df31a77cc3d9893f34115308a301952505`, `ev_d98e00581bef96d3db871ebafbcb70e17c17835eb6cefddaf11b1144b131f1e6`, `ev_67d05f730f699fcb51e734a5f60fbe3c785f1cb301f11904e40afc48ec2c96bb`, `ev_2e97d4b9df5dbfd63432f9379d76e16a480beac7ac615002c0b9febf1a6e27cd`, `ev_32944f8a6a36bf3f3eb20651131c7365b09f929052a59d57731ec287712a12f8`, `ev_5759bc1ed62ad5ea63e8dc5ecc327a048c3dfc94bd86ab592c25389371e3bb83`, `ev_db6aff248d905d610f5e67810ae753c054ff2130db7ff4538e40b132d1a7ee1b`, `ev_55cb1857387ddb7ebec559676ad1724de0f8dd23f12885df156be909cd84ec23`

## Worship tracking and statistics

- **Verification:** Observed local models; displayed behavior inferred.
- **Observed:** Statistics, AthkarCompletion, and PrayerCheckin models are present.
- **Behavior:** Inferred: the app may summarize reading or worship activity.
- **Dependencies:** Local tracking models. Storage and sync destination unknown.
- **Unknown:** Metric definitions, aggregation windows, charts, and persistence.
- **Evidence:** `ev_491981fd821bd23cbd10b961634230250467e4be4f32274100698e31ed994143`, `ev_8d8a994d7236b381f49b17d4dc5fcb5877e99aaa726a4641ea9bbcd99e3e5d37`, `ev_3813fe3b4d09b4a8152d71561278fd9bc4b8c993eb02447f2d4649890f8f94cc`, `ev_2192a005abb265111e3eb899a09ad94cd2780c8a707400201289acfa6486cf6f`, `ev_3ac55afecc178890337f7a9cf6e6b8d38f01b56a287db9a62e0587aadb128c7e`, `ev_9291c81216a31a8e58df7ca71a13409a3c8f0c163e7e70ff6f21c6c8a36208c4`, `ev_f138cd73199c9cc4bb6ad2dcfae17d0ba8077255a109d0b8fb29818a8b896e5e`, `ev_7b95177c7ec0b99ec1febe3c990ff41799b127e5777a967b8fc58ea04af2b2d4`

## Islamic events, zakat, and related tools

- **Verification:** Class-name evidence only; behavior and availability unverified.
- **Observed:** The 541-class inventory names event, zakat, and related tool areas.
- **Behavior:** Only feature-area names are known; no workflow is established.
- **Dependencies:** Specific service or data dependencies are unknown.
- **Unknown:** Screens, calculations, data source, localization, and enabled status.
- **Evidence:** `ev_e1da8b1964770471afaf2078706f7ab6c5392c4e03696fa13416257d25f9ac16`, `ev_05c1f6c2ab3547ccce70c095559a6ad9ec9054f4f4217b7b273a5981faa12128`

## Sync, notifications, and reminders

- **Verification:** Observed workers and receivers; actual scheduling and network behavior unverified.
- **Observed:** Sync workers, messaging components, reminder jobs, and notification-related permissions are declared.
- **Behavior:** Inferred: background jobs may sync account/reading data and trigger reminders or notifications.
- **Dependencies:** WorkManager, Firebase Messaging, Android notification/alarm services.
- **Unknown:** What is synced, server API, when work is scheduled, retry rules, notification contents, and runtime permission flow.
- **Evidence:** `ev_55cb1857387ddb7ebec559676ad1724de0f8dd23f12885df156be909cd84ec23`, `ev_9925014e76a9d8f343e69e6a9f7a5fff65dbc154f32020f68420dda08617630f`, `ev_f00468268997427851cfe570700502c3b25b4cf102db552435f4676cc03d3541`, `ev_9949e162820c1752548663f20a86c9033660ccfd252cbbeebc0e54ceac8821c0`, `ev_9110bed55a2cfa96177f886cfce173b8f0de9b97c9897ff4221e58cba3a8c002`, `ev_391dfd2a90e6006f0d95dbff5e7151df31a77cc3d9893f34115308a301952505`, `ev_d98e00581bef96d3db871ebafbcb70e17c17835eb6cefddaf11b1144b131f1e6`, `ev_67d05f730f699fcb51e734a5f60fbe3c785f1cb301f11904e40afc48ec2c96bb`, `ev_2e97d4b9df5dbfd63432f9379d76e16a480beac7ac615002c0b9febf1a6e27cd`

## Settings and saved reader state

- **Verification:** Observed models; storage and save behavior unknown.
- **Observed:** Reader preference/page-position and user Mushaf models are recorded. Settings-related classes appear in the saved class evidence.
- **Behavior:** Inferred: the app may remember reading position and display preferences.
- **Dependencies:** UserMushaf and reader models. Storage and sync services are not mapped.
- **Unknown:** Exact preference keys, storage mechanism, save timing, reset behavior, and sync.
- **Evidence:** `ev_491981fd821bd23cbd10b961634230250467e4be4f32274100698e31ed994143`, `ev_8d8a994d7236b381f49b17d4dc5fcb5877e99aaa726a4641ea9bbcd99e3e5d37`, `ev_3813fe3b4d09b4a8152d71561278fd9bc4b8c993eb02447f2d4649890f8f94cc`, `ev_2192a005abb265111e3eb899a09ad94cd2780c8a707400201289acfa6486cf6f`, `ev_3ac55afecc178890337f7a9cf6e6b8d38f01b56a287db9a62e0587aadb128c7e`, `ev_9291c81216a31a8e58df7ca71a13409a3c8f0c163e7e70ff6f21c6c8a36208c4`, `ev_92f844f1aa4d89b49815c5ed4eff8552e267e94515a550e99f7b4e39376cbc6c`, `ev_e1da8b1964770471afaf2078706f7ab6c5392c4e03696fa13416257d25f9ac16`


## Arabic labels

The cited string records are default-locale pages. The resource-table summary reports 87 locales, but no Arabic translation rows were included in the cited default pages. This inventory does not invent Arabic translations. Exact Arabic labels remain unknown until Arabic-locale values are read from evidence. (Evidence: `ev_68e06b198c904e77a5ba7ca123f5bad0926a019a2273044dcfcbc0b3617e5274`, `ev_65c3b2089d5998b75b20f115d94412b2f641834090f4cc03f867c6b1cbbc762d`, `ev_61673d9c6428891a4d336fb7206fb0ad39da0fb678bf1c43fa858539dfd026ef`, `ev_3bc35bc101d739e5853efa813f0d6c4a250685918a8cd4ec19e03029503c4b54`.)
