# Evidence and Coverage

## Scope

The active target is one supplied `base.apk`, target ID `t_89de96aaf1e7`, SHA-256 `89de96aaf1e71fe7d07e602bc6fc25606f23ae90d7946b4990fa0c438bc70f32`. The session lists 123 evidence records and 17 findings. (Evidence: `ev_55cb1857387ddb7ebec559676ad1724de0f8dd23f12885df156be909cd84ec23`, `ev_e1da8b1964770471afaf2078706f7ab6c5392c4e03696fa13416257d25f9ac16`, `ev_a515a1161c2ab139e888b0749cb24fb0bceef12319a40a2c2fecf7e0ac5e5708`.)

This report uses the saved static APK evidence. It does not claim that the app was launched, screens were tapped, a device was changed, or background jobs ran. Static class/resource evidence cannot confirm runtime behavior.

## Coverage table

| Area | What was examined | What remains unknown |
|---|---|---|
| Package and signature | Package metadata, SDK range, permissions, signatures | Certificate trust/revocation and split package completeness |
| Manifest | 63 components and public entry points | Runtime-enabled components and actual navigation after entry |
| Classes | All 541 app-namespace classes across two DEX files | Full function behavior and call paths |
| Resources | 3,215 default strings; resource-table summary across 87 locales | Arabic value rows and complete screen-to-resource mapping |
| Archive | All 1,283 entries, including layouts, XML, assets, and DB filenames | Why graph asset count differs; contents of DB files |
| Runtime | No app runtime behavior in this report | Feature availability, post-launch downloads, device-dependent behavior |

Package/manifest evidence: `ev_55cb1857387ddb7ebec559676ad1724de0f8dd23f12885df156be909cd84ec23`, `ev_39750d92941a3a038f6c33eebb7f83ff2cabe3b7e295d68bce50c6589675a9cf`, `ev_24b65ad3b0aa13e4630a7dfd206de7d2d9c4725b60caad9c37b1c15d334ab9f5`. Class evidence: `ev_e1da8b1964770471afaf2078706f7ab6c5392c4e03696fa13416257d25f9ac16`, `ev_05c1f6c2ab3547ccce70c095559a6ad9ec9054f4f4217b7b273a5981faa12128`. Resource evidence: `ev_68e06b198c904e77a5ba7ca123f5bad0926a019a2273044dcfcbc0b3617e5274`, `ev_65c3b2089d5998b75b20f115d94412b2f641834090f4cc03f867c6b1cbbc762d`, `ev_61673d9c6428891a4d336fb7206fb0ad39da0fb678bf1c43fa858539dfd026ef`, `ev_b97caf2a9f49d85f6ce467f57f483d268d10b9b3fe7d137bfb270099830bf805`, `ev_32944f8a6a36bf3f3eb20651131c7365b09f929052a59d57731ec287712a12f8`, `ev_5759bc1ed62ad5ea63e8dc5ecc327a048c3dfc94bd86ab592c25389371e3bb83`, `ev_db6aff248d905d610f5e67810ae753c054ff2130db7ff4538e40b132d1a7ee1b`, `ev_3bc35bc101d739e5853efa813f0d6c4a250685918a8cd4ec19e03029503c4b54`. Archive evidence: `ev_a515a1161c2ab139e888b0749cb24fb0bceef12319a40a2c2fecf7e0ac5e5708`, `ev_84305f3349eb9ca08aa801416a4e6f8ffed63159ad159edfb602ad87346da97a`, `ev_966c4245b55dfd1fc69ac0a2a52fc4c96420d1253511ccbec1b7933f7ab59987`, `ev_ad3c8e16e648bab99f50b31fecdf9f0d97e58b7ed6594dd6a69f33293de1c461`.

## Open unknowns

1. **Archive inventory:** graph says `asset_files=9,865`; direct archive list shows 194 assets. `unk_0f9e3f40d8844f4c`. Evidence: `ev_6b8757ef5809e553de256cb13d37f331afb95e046b55d88231523f4164e1e35c`, `ev_a515a1161c2ab139e888b0749cb24fb0bceef12319a40a2c2fecf7e0ac5e5708`.
2. **SQLite schemas:** table names, columns, indexes, relations, and counts for the three DBs are unknown. `unk_85988a97c784b919`. Evidence: `ev_a515a1161c2ab139e888b0749cb24fb0bceef12319a40a2c2fecf7e0ac5e5708`, `ev_97394cff8bbfe06329439c2496576fca3732a967b2fafa88d59cceb6f2e0e36c`, `ev_da0f10e0c54356306c1de1e68d24503382352e033afd096e2d5b810e3cc4cc11`, `ev_4abac963d58f8fa70214549776d798933d1de95a8bba41fe5369c8f1262b9db3`, `ev_81bdafc400a10a130f43cac89b48072c15095673e0ebfc2e10fbf740e659d02b`, `ev_988da5bf451618fdb79677f2aaa5b047f1d310da713471b1fce45c062e4afa00`.
3. **Screens/navigation:** actual layouts, routes, dialogs, and deep-link destinations are unknown. `unk_8f043049b1fb4680`. Evidence: `ev_24b65ad3b0aa13e4630a7dfd206de7d2d9c4725b60caad9c37b1c15d334ab9f5`, `ev_e1da8b1964770471afaf2078706f7ab6c5392c4e03696fa13416257d25f9ac16`.
4. **Runtime features:** which named features work and whether more code/content downloads after launch. `unk_b1dc948f2dc1cb29`. Evidence: `ev_e1da8b1964770471afaf2078706f7ab6c5392c4e03696fa13416257d25f9ac16`, `ev_68e06b198c904e77a5ba7ca123f5bad0926a019a2273044dcfcbc0b3617e5274`.
5. **Settings persistence:** mapping to databases, preference stores, or sync services. `unk_dc29dad3bbf55350`. Evidence: `ev_491981fd821bd23cbd10b961634230250467e4be4f32274100698e31ed994143`, `ev_8d8a994d7236b381f49b17d4dc5fcb5877e99aaa726a4641ea9bbcd99e3e5d37`.
6. **Split packages:** whether this base APK is complete. `unk_eb8d7be46fb15305`. Evidence: `ev_6b8757ef5809e553de256cb13d37f331afb95e046b55d88231523f4164e1e35c`, `ev_a515a1161c2ab139e888b0749cb24fb0bceef12319a40a2c2fecf7e0ac5e5708`.

## Arabic wording

The cited string rows use the default configuration and contain English labels. The resource summary lists 87 locales but does not provide the Arabic rows in this evidence view. Arabic labels are therefore left untranslated and unguessed. (Evidence: `ev_68e06b198c904e77a5ba7ca123f5bad0926a019a2273044dcfcbc0b3617e5274`, `ev_3bc35bc101d739e5853efa813f0d6c4a250685918a8cd4ec19e03029503c4b54`.)
