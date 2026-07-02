export async function generateWithGemini(
  prompt: string,
  systemInstruction?: string,
  apiKey?: string | null,
): Promise<string | null> {
  const key = apiKey?.trim() || process.env.GEMINI_API_KEY;
  if (!key) return null;
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      ...(systemInstruction ? { systemInstruction } : {}),
    });
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch {
    return null;
  }
}

export function isAiConfigured(apiKey?: string | null): boolean {
  return Boolean(apiKey?.trim() || process.env.GEMINI_API_KEY);
}
