export const normalizeArabicText = (text: string) => {
  return text
    .replace(/[\u0617-\u061A\u064B-\u0652]/g, "") // Remove tashkeel
    .replace(/[أإآ]/g, "ا") // Normalize Alif
    .replace(/ة/g, "ه") // Normalize Ta-Marbuta
    .replace(/ى/g, "ي") // Normalize Ya
    .trim();
};
