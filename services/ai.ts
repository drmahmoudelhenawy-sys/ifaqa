

import { GoogleGenAI } from "@google/genai";

// Initialize with the API Key from the environment
// Note: In this specific setup, we are using the process.env.API_KEY which is injected by the platform
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_PROMPT = `
You are a wise, gentle, and encouraging Islamic companion named "Rafiq". 
Your goal is to provide very short, heart-touching spiritual motivation based on the user's action.
Keep the tone sincere, hopeful, and rooted in Islamic values (Quran & Sunnah).
Output must be in Arabic.
Maximum length: 15-20 words.
Do not use markdown or emojis in the text output, just plain text.
`;

export const getSpiritualMessage = async (action: string, userName: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 1.2, // Higher creativity for varied responses
      },
      contents: `The user ${userName} just completed: ${action}. Give them a short encouraging quote or Dua.`,
    });

    return response.text || "تقبل الله منك وصرف عنك السوء.";
  } catch (error) {
    console.error("AI Generation Error:", error);
    // Fallback messages in case of API failure or offline
    const fallbacks = [
        "زادك الله حرصاً وقرباً.",
        "تقبل الله طاعتك ورفع قدرك.",
        "هنيئاً لك، استمر فالجنة تستحق.",
        "اللهم اجعلها في ميزان حسناتك.",
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
};