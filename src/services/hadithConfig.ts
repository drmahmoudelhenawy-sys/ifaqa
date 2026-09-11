export type HadithCollectionId =
  | 'bukhari'
  | 'muslim'
  | 'abudawud'
  | 'tirmidhi'
  | 'nasai'
  | 'ibnmajah';
export type HadithLanguage = 'ara';
export type HadithProviderId = 'fawazahmed-cdn';

export interface HadithEditionDescriptor {
  id: string;
  name: string;
  collection: HadithCollectionId;
  language: HadithLanguage;
}

export interface HadithSourceConfig {
  id: HadithProviderId;
  name: string;
  baseUrl: string;
  sourceType: 'api' | 'json-repository';
  language: HadithLanguage;
  supportedCollections: HadithCollectionId[];
  editions: Record<HadithCollectionId, string>;
}

export const HADITH_SOURCE_CONFIG: HadithSourceConfig = {
  id: 'fawazahmed-cdn',
  name: 'Fawaz Ahmed Hadith API (jsDelivr mirror)',
  baseUrl: 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1',
  sourceType: 'json-repository',
  language: 'ara',
  supportedCollections: ['bukhari', 'muslim', 'abudawud', 'tirmidhi', 'nasai', 'ibnmajah'],
  editions: {
    bukhari: 'ara-bukhari',
    muslim: 'ara-muslim',
    abudawud: 'ara-abudawud',
    tirmidhi: 'ara-tirmidhi',
    nasai: 'ara-nasai',
    ibnmajah: 'ara-ibnmajah',
  },
};

export const HADITH_EDITIONS: HadithEditionDescriptor[] = [
  {
    id: HADITH_SOURCE_CONFIG.editions.bukhari,
    name: 'صحيح البخاري',
    collection: 'bukhari',
    language: 'ara',
  },
  {
    id: HADITH_SOURCE_CONFIG.editions.muslim,
    name: 'صحيح مسلم',
    collection: 'muslim',
    language: 'ara',
  },
  {
    id: HADITH_SOURCE_CONFIG.editions.abudawud,
    name: 'سنن أبي داود',
    collection: 'abudawud',
    language: 'ara',
  },
  {
    id: HADITH_SOURCE_CONFIG.editions.tirmidhi,
    name: 'سنن الترمذي',
    collection: 'tirmidhi',
    language: 'ara',
  },
  {
    id: HADITH_SOURCE_CONFIG.editions.nasai,
    name: 'سنن النسائي',
    collection: 'nasai',
    language: 'ara',
  },
  {
    id: HADITH_SOURCE_CONFIG.editions.ibnmajah,
    name: 'سنن ابن ماجه',
    collection: 'ibnmajah',
    language: 'ara',
  },
];

export function getEditionIdForCollection(collection: HadithCollectionId): string {
  return HADITH_SOURCE_CONFIG.editions[collection];
}

export function buildHadithEditionUrl(edition: string, minified = false): string {
  const suffix = minified ? '.min.json' : '.json';
  return `${HADITH_SOURCE_CONFIG.baseUrl}/editions/${edition}${suffix}`;
}

export function getHadithEditionUrl(collection: HadithCollectionId): string {
  return buildHadithEditionUrl(getEditionIdForCollection(collection));
}

export function getHadithDownloadUrl(edition: string): string {
  return buildHadithEditionUrl(edition);
}
