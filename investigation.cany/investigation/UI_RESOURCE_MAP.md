# UI Resource Map

## Inventory

| Resource group | Recorded count | Evidence |
|---|---:|---|
| Total APK archive entries | 1,283 | `ev_a515a1161c2ab139e888b0749cb24fb0bceef12319a40a2c2fecf7e0ac5e5708` |
| `assets/` files | 194 | `ev_a515a1161c2ab139e888b0749cb24fb0bceef12319a40a2c2fecf7e0ac5e5708` |
| `res/` files | 904 | `ev_a515a1161c2ab139e888b0749cb24fb0bceef12319a40a2c2fecf7e0ac5e5708` |
| Layout XML files | 63 (58 unqualified, five configuration-qualified) | `ev_84305f3349eb9ca08aa801416a4e6f8ffed63159ad159edfb602ad87346da97a`, `ev_966c4245b55dfd1fc69ac0a2a52fc4c96420d1253511ccbec1b7933f7ab59987`, `ev_ad3c8e16e648bab99f50b31fecdf9f0d97e58b7ed6594dd6a69f33293de1c461` |
| `res/xml/` files | 9 | `ev_966c4245b55dfd1fc69ac0a2a52fc4c96420d1253511ccbec1b7933f7ab59987` |
| `res/menu/` files | 0 found in the archive index | `ev_84305f3349eb9ca08aa801416a4e6f8ffed63159ad159edfb602ad87346da97a` |
| Drawable-path files | 510 | `ev_a515a1161c2ab139e888b0749cb24fb0bceef12319a40a2c2fecf7e0ac5e5708` |
| Drawable resource-table entries | 535 | `ev_3bc35bc101d739e5853efa813f0d6c4a250685918a8cd4ec19e03029503c4b54` |
| Default-locale string entries | 3,215 | `ev_68e06b198c904e77a5ba7ca123f5bad0926a019a2273044dcfcbc0b3617e5274`, `ev_65c3b2089d5998b75b20f115d94412b2f641834090f4cc03f867c6b1cbbc762d`, `ev_61673d9c6428891a4d336fb7206fb0ad39da0fb678bf1c43fa858539dfd026ef`, `ev_b97caf2a9f49d85f6ce467f57f483d268d10b9b3fe7d137bfb270099830bf805`, `ev_32944f8a6a36bf3f3eb20651131c7365b09f929052a59d57731ec287712a12f8`, `ev_5759bc1ed62ad5ea63e8dc5ecc327a048c3dfc94bd86ab592c25389371e3bb83`, `ev_db6aff248d905d610f5e67810ae753c054ff2130db7ff4538e40b132d1a7ee1b` |
| Resource-table values across locales | 46,569 across 87 locales | `ev_3bc35bc101d739e5853efa813f0d6c4a250685918a8cd4ec19e03029503c4b54` |

The 535 resource-table drawables and 510 drawable-path files count different things. The app graph's `asset_files=9,865` conflicts with the archive's 194 direct assets; the discrepancy is unresolved. (Evidence: `ev_3bc35bc101d739e5853efa813f0d6c4a250685918a8cd4ec19e03029503c4b54`, `ev_a515a1161c2ab139e888b0749cb24fb0bceef12319a40a2c2fecf7e0ac5e5708`, `ev_6b8757ef5809e553de256cb13d37f331afb95e046b55d88231523f4164e1e35c`; unknown `unk_0f9e3f40d8844f4c`.)

## Recorded label groups

Default-locale labels name Quran reading and copies, verse search and bookmarks, audio reciters/downloads, Tafsir/translation, athkar/duas, Khetma, prayer times, qibla, masbaha, Tasmee, hadith, library, sync/offline states, and live sessions. These labels show named product areas, not proven screens or active features. (Evidence: `ev_68e06b198c904e77a5ba7ca123f5bad0926a019a2273044dcfcbc0b3617e5274`, `ev_65c3b2089d5998b75b20f115d94412b2f641834090f4cc03f867c6b1cbbc762d`, `ev_61673d9c6428891a4d336fb7206fb0ad39da0fb678bf1c43fa858539dfd026ef`, `ev_b97caf2a9f49d85f6ce467f57f483d268d10b9b3fe7d137bfb270099830bf805`, `ev_32944f8a6a36bf3f3eb20651131c7365b09f929052a59d57731ec287712a12f8`, `ev_5759bc1ed62ad5ea63e8dc5ecc327a048c3dfc94bd86ab592c25389371e3bb83`, `ev_db6aff248d905d610f5e67810ae753c054ff2130db7ff4538e40b132d1a7ee1b`.)

## Arabic labels

The cited string pages have `config=default` and English labels in their recorded rows. The resource-table summary reports 87 locales; Arabic resources may exist, but the Arabic value rows were not part of these cited pages. No Arabic wording is guessed here. (Evidence: `ev_68e06b198c904e77a5ba7ca123f5bad0926a019a2273044dcfcbc0b3617e5274`, `ev_db6aff248d905d610f5e67810ae753c054ff2130db7ff4538e40b132d1a7ee1b`, `ev_3bc35bc101d739e5853efa813f0d6c4a250685918a8cd4ec19e03029503c4b54`.)

## What the archive does not tell us

File counts do not identify which layout is shown at runtime or which view uses each drawable. The saved evidence does not map every resource ID to a screen. The absence of menu XML does not rule out menus built by code. (Evidence: `ev_a515a1161c2ab139e888b0749cb24fb0bceef12319a40a2c2fecf7e0ac5e5708`, `ev_3bc35bc101d739e5853efa813f0d6c4a250685918a8cd4ec19e03029503c4b54`.)
