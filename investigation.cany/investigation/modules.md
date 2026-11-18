# Module Inventory

The APK contains 541 classes in the app namespace. The counts below are package groups. Package names and class counts are observed; descriptions of the jobs are cautious inferences from names and examples. (Evidence: `ev_e1da8b1964770471afaf2078706f7ab6c5392c4e03696fa13416257d25f9ac16`, `ev_05c1f6c2ab3547ccce70c095559a6ad9ec9054f4f4217b7b273a5981faa12128`.)

| Module/package group | Class count | Confidence |
|---|---:|---|
| `org.goldenquran.freesoft.network` | 213 | Observed package count; purpose inferred from package name. |
| `org.goldenquran.freesoft.models` | 192 | Observed package count and named model examples. |
| `org.goldenquran.freesoft.ui` | 116 | Observed package count; not every screen was inspected. |
| `org.goldenquran.freesoft.workers` | 7 | Observed package count and representative worker names. |
| `org.goldenquran.freesoft.habits` | 6 | Observed package count. |
| `org.goldenquran.freesoft.datastore` | 4 | Observed package count; persistence details unknown. |
| `org.goldenquran.freesoft.activity` | 2 | Observed app-owned activity classes; manifest evidence separates app and library activities. |
| `org.goldenquran.freesoft.App` | 1 | Observed application class. |
| `Android platform and libraries` | not counted | Observed manifest/library components. |

## org.goldenquran.freesoft.network

- **Observed:** Observed package count; purpose inferred from package name.
- **Likely role:** Contains the largest app-owned package group; likely holds network-related code.
- **Dependencies:** Network access permission is declared. Exact services/APIs not mapped.
- **Unknown:** Endpoints, request/response shapes, auth, and feature-to-network mapping.
- **Evidence:** `ev_e1da8b1964770471afaf2078706f7ab6c5392c4e03696fa13416257d25f9ac16`, `ev_05c1f6c2ab3547ccce70c095559a6ad9ec9054f4f4217b7b273a5981faa12128`, `ev_55cb1857387ddb7ebec559676ad1724de0f8dd23f12885df156be909cd84ec23`

## org.goldenquran.freesoft.models

- **Observed:** Observed package count and named model examples.
- **Likely role:** Data classes cover Quran, audio, search, reading state, habits, and statistics.
- **Dependencies:** Feature UI and data sources.
- **Unknown:** Full field-to-storage mapping and serialization use.
- **Evidence:** `ev_e1da8b1964770471afaf2078706f7ab6c5392c4e03696fa13416257d25f9ac16`, `ev_491981fd821bd23cbd10b961634230250467e4be4f32274100698e31ed994143`, `ev_8d8a994d7236b381f49b17d4dc5fcb5877e99aaa726a4641ea9bbcd99e3e5d37`, `ev_3813fe3b4d09b4a8152d71561278fd9bc4b8c993eb02447f2d4649890f8f94cc`, `ev_2192a005abb265111e3eb899a09ad94cd2780c8a707400201289acfa6486cf6f`, `ev_3ac55afecc178890337f7a9cf6e6b8d38f01b56a287db9a62e0587aadb128c7e`, `ev_9291c81216a31a8e58df7ca71a13409a3c8f0c163e7e70ff6f21c6c8a36208c4`, `ev_80abce67c3995730a6e7f50f3c604b87bf3b3680ce136b2df26a15c3d151949c`, `ev_4ccbcdca4f775a5da9139ee11d4bbf84a67fc4f8ab9a559494f488c1947a4d0f`

## org.goldenquran.freesoft.ui

- **Observed:** Observed package count; not every screen was inspected.
- **Likely role:** Contains feature screen/fragment code; examples include TasmeeFragment and LibraryReaderFragment.
- **Dependencies:** Android UI toolkit and model/data groups.
- **Unknown:** Actual runtime navigation and complete screen layout inventory.
- **Evidence:** `ev_e1da8b1964770471afaf2078706f7ab6c5392c4e03696fa13416257d25f9ac16`, `ev_8d8a994d7236b381f49b17d4dc5fcb5877e99aaa726a4641ea9bbcd99e3e5d37`, `ev_8b02d869709d2d76e099527c445e48fb81f43e3cc3d6f5c26442f82d84724b5e`

## org.goldenquran.freesoft.workers

- **Observed:** Observed package count and representative worker names.
- **Likely role:** Background jobs include audio refresh/update and sync or reminder work.
- **Dependencies:** WorkManager is present in package components. Network/storage dependencies depend on each job.
- **Unknown:** Scheduling, constraints, retries, and runtime execution.
- **Evidence:** `ev_e1da8b1964770471afaf2078706f7ab6c5392c4e03696fa13416257d25f9ac16`, `ev_9949e162820c1752548663f20a86c9033660ccfd252cbbeebc0e54ceac8821c0`, `ev_9110bed55a2cfa96177f886cfce173b8f0de9b97c9897ff4221e58cba3a8c002`, `ev_391dfd2a90e6006f0d95dbff5e7151df31a77cc3d9893f34115308a301952505`, `ev_d98e00581bef96d3db871ebafbcb70e17c17835eb6cefddaf11b1144b131f1e6`, `ev_67d05f730f699fcb51e734a5f60fbe3c785f1cb301f11904e40afc48ec2c96bb`, `ev_2e97d4b9df5dbfd63432f9379d76e16a480beac7ac615002c0b9febf1a6e27cd`

## org.goldenquran.freesoft.habits

- **Observed:** Observed package count.
- **Likely role:** Likely groups habit or worship-tracking logic based on package name.
- **Dependencies:** Habit/check-in models.
- **Unknown:** Exact classes, rules, and save behavior.
- **Evidence:** `ev_e1da8b1964770471afaf2078706f7ab6c5392c4e03696fa13416257d25f9ac16`, `ev_491981fd821bd23cbd10b961634230250467e4be4f32274100698e31ed994143`, `ev_8d8a994d7236b381f49b17d4dc5fcb5877e99aaa726a4641ea9bbcd99e3e5d37`, `ev_3813fe3b4d09b4a8152d71561278fd9bc4b8c993eb02447f2d4649890f8f94cc`, `ev_2192a005abb265111e3eb899a09ad94cd2780c8a707400201289acfa6486cf6f`, `ev_3ac55afecc178890337f7a9cf6e6b8d38f01b56a287db9a62e0587aadb128c7e`, `ev_9291c81216a31a8e58df7ca71a13409a3c8f0c163e7e70ff6f21c6c8a36208c4`

## org.goldenquran.freesoft.datastore

- **Observed:** Observed package count; persistence details unknown.
- **Likely role:** Package name indicates a data-storage layer.
- **Dependencies:** Models and feature modules.
- **Unknown:** Preferences vs database usage, DAO mapping, and sync behavior.
- **Evidence:** `ev_e1da8b1964770471afaf2078706f7ab6c5392c4e03696fa13416257d25f9ac16`, `ev_491981fd821bd23cbd10b961634230250467e4be4f32274100698e31ed994143`, `ev_8d8a994d7236b381f49b17d4dc5fcb5877e99aaa726a4641ea9bbcd99e3e5d37`, `ev_3813fe3b4d09b4a8152d71561278fd9bc4b8c993eb02447f2d4649890f8f94cc`, `ev_2192a005abb265111e3eb899a09ad94cd2780c8a707400201289acfa6486cf6f`, `ev_3ac55afecc178890337f7a9cf6e6b8d38f01b56a287db9a62e0587aadb128c7e`, `ev_9291c81216a31a8e58df7ca71a13409a3c8f0c163e7e70ff6f21c6c8a36208c4`

## org.goldenquran.freesoft.activity

- **Observed:** Observed app-owned activity classes; manifest evidence separates app and library activities.
- **Likely role:** MainActivity is the launcher/deep-link entry; VoicePlayActivity accepts media search.
- **Dependencies:** Android manifest and intent routing.
- **Unknown:** Internal screen routing after activity launch.
- **Evidence:** `ev_e1da8b1964770471afaf2078706f7ab6c5392c4e03696fa13416257d25f9ac16`, `ev_24b65ad3b0aa13e4630a7dfd206de7d2d9c4725b60caad9c37b1c15d334ab9f5`, `ev_26731ad05568d33e2d46d39425c3f6e21343e27d1ff95f7a0a5fb3bba7874ebf`

## org.goldenquran.freesoft.App

- **Observed:** Observed application class.
- **Likely role:** Application entry class exists.
- **Dependencies:** Android application lifecycle.
- **Unknown:** Startup setup, dependency injection, and background initialization.
- **Evidence:** `ev_e1da8b1964770471afaf2078706f7ab6c5392c4e03696fa13416257d25f9ac16`, `ev_40adf3fa648f5d08a3c18b2390f5aa3ab7b26041e0edfd306bfa22737a691a37`

## Android platform and libraries

- **Observed:** Observed manifest/library components.
- **Likely role:** Evidence names AndroidX Media3, WorkManager, Firebase Messaging, Google ML Kit, and Play Billing.
- **Dependencies:** Android SDK range recorded as 32–37. No native ABI libraries in this base APK.
- **Unknown:** Exact dependency versions and which features call each library.
- **Evidence:** `ev_55cb1857387ddb7ebec559676ad1724de0f8dd23f12885df156be909cd84ec23`, `ev_9925014e76a9d8f343e69e6a9f7a5fff65dbc154f32020f68420dda08617630f`, `ev_f00468268997427851cfe570700502c3b25b4cf102db552435f4676cc03d3541`


The package groups are not proof of separate build modules or a complete runtime call graph.
