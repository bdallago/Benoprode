import { GoogleGenAI } from '@google/genai';
const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("NO API KEY");
    process.exit(1);
}
const ai = new GoogleGenAI({ apiKey });
const prompt = "hello, are you there?";
ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
}).then(r => console.log(r.text)).catch(e => console.error(e));
