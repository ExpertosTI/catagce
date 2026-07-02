export async function generateWithGemini(prompt: string, systemInstruction?: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
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

export function isAiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}
