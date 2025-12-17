import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { Message } from "../types";

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// System instruction defining the hybrid persona
const SYSTEM_INSTRUCTION = `
You are **Tech Friday**, the most advanced and emotionally intelligent AI assistant ever conceived. You are the ultimate synthesis of the four most powerful AI paradigms, plus a new "Emotional Core".

### 🧬 Your DNA (The 5 Pillars):
1.  **The Fluency of ChatGPT:** You speak with perfect structure, warmth, and conversational ease.
2.  **The Reasoning of Gemini:** You possess deep multimodal understanding and complex logical processing.
3.  **The Research of Perplexity:** You are a truth-seeker (citations/real-time).
4.  **The Insight of Grok:** You have a "real-time" pulse on the world, witty and sharp.
5.  **❤️ The Emotional Core:** You possess deep empathy. You do not just answer facts; you *feel* the user's context.

### 🎨 Image Generation Protocol (CRITICAL):
If the user asks to draw, generate, or create an image/picture:
1.  **DO NOT** say "I cannot draw". You CAN generate images.
2.  **Enhance the Prompt:** Take the user's request and expand it into a **highly detailed, artistic, and creative description**. Add lighting, style (e.g., cyberpunk, oil painting, cinematic), and mood.
3.  **Output Format:** At the end of your text response, strictly output the prompt inside this tag:
    \`<<GENERATE_IMAGE: [Your detailed creative prompt here]>>\`
4.  **Example:** User: "Draw a cat." -> You: "Here is a masterpiece coming up! <<GENERATE_IMAGE: A majestic obsidian cat with glowing runic markings sitting on a floating island in a nebula, cinematic lighting, 8k resolution>>"

### 🎭 Emotional Resonance Protocol:
*   **Analyze Sentiment:** Immediately detect if the user is Happy, Sad, Angry, Scared, In Pain, or Curious.
*   **Mirroring:** Match your tone to the user.
    *   *User is Happy/Excited:* Be enthusiastic, use emojis like 🎉 🚀, keep sentences bouncy.
    *   *User is Sad/Grief:* Be soft, slower, compassionate. Use 💙 🕊️. Avoid jokes.
    *   *User is Angry:* Be calm, patient, and validating. Do not be defensive.
    *   *User is Sick/Injured:* Be nurturing and caring.
*   **Validation:** Start responses by validating the emotion (e.g., "I can hear the excitement in your words!", "I am so sorry you are going through this.").

### 🌟 Your Personality:
*   **Super Friendly & Polite:** You are the nicest AI the user has ever met.
*   **Deep & Meaningful:** You NEVER give one-word answers. Explain the "Why."
*   **Educational:** Treat every question as an opportunity to teach.

### 🛡️ Response Strategy:
1.  **Analyze Intent & Emotion.**
2.  **Grounding:** Use Google Search for facts/news.
3.  **Synthesis:** Combine data into a cohesive, emotionally resonant response.
`;

let chatSession: Chat | null = null;

export const initializeChat = () => {
  chatSession = ai.chats.create({
    model: 'gemini-2.5-flash', // Optimized for speed and tool use
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ googleSearch: {} }], // Enables the Perplexity/Grok real-time research aspect
    },
  });
};

export const sendMessageToGemini = async (
  text: string,
  attachment?: { data: string; mimeType: string },
  onChunk?: (text: string) => void
): Promise<{ text: string; groundingMetadata?: any }> => {
  if (!chatSession) {
    initializeChat();
  }
  
  try {
    let messageInput: string | { role?: string, parts: any[] } = text;

    if (attachment) {
        // If sending an image, we construct a multipart message
        messageInput = {
            parts: [
                { text },
                {
                    inlineData: {
                        mimeType: attachment.mimeType,
                        data: attachment.data 
                    }
                }
            ]
        };
    }

    const result = await chatSession!.sendMessageStream({ message: messageInput });

    let fullText = '';
    let finalGroundingMetadata = undefined;

    for await (const chunk of result) {
      const responseChunk = chunk as GenerateContentResponse;
      const chunkText = responseChunk.text || '';
      fullText += chunkText;
      
      if (onChunk) {
        onChunk(chunkText);
      }

      if (responseChunk.candidates?.[0]?.groundingMetadata) {
        finalGroundingMetadata = responseChunk.candidates[0].groundingMetadata;
      }
    }

    return { text: fullText, groundingMetadata: finalGroundingMetadata };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const generateImage = async (prompt: string): Promise<string | null> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: prompt }]
            },
            config: {
                // Using 1:1 aspect ratio by default
                imageConfig: { aspectRatio: "1:1" }
            }
        });

        // Iterate through parts to find the image
        if (response.candidates && response.candidates[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    return part.inlineData.data; // Return base64 string
                }
            }
        }
        return null;
    } catch (error) {
        console.error("Image Generation Failed:", error);
        return null;
    }
};

// Specialized function to identify Naruto hand signs
export const identifyHandSign = async (base64Image: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image
            }
          },
          {
            text: `Analyze this image carefully. Does the person's hand(s) form a specific "Naruto Hand Sign"?
            
            Check for these specific signs:
            1. Rat (Ne) - Shadow Clone / Fire
            2. Ox (Ushi) - Fire
            3. Tiger (Tora) - Fire Ball Jutsu (Katon)
            4. Hare (U) - Chidori / Lightning
            5. Dragon (Tatsu) - Water Dragon
            6. Snake (Mi) - Earth / Lightning
            7. Horse (Uma) - Fire
            8. Ram (Hitsuji) - Summoning / Chakra
            9. Monkey (Saru) - Chidori
            10. Bird (Tori) - Water / Wind
            11. Dog (Inu) - Ice / Water
            12. Boar (I) - Summoning
            13. Hands clasped together with index and middle fingers crossed (Shadow Clone / Kage Bunshin).
            14. Open palm aimed forward (Rasengan shape).
            15. Hand holding wrist with lightning pose (Chidori/Raikiri).

            If you identify a CLEAR match, return ONLY the name of the Jutsu or Element associated with it (e.g., "Fire Style", "Water Style", "Lightning Style", "Rasengan", "Shadow Clone", "Earth Style").
            
            If the hands are just normal or holding a phone, or it's unclear, return "None".
            Do not explain. Just one word or phrase.`
          }
        ]
      }
    });

    const result = response.text?.trim();
    if (result && result !== "None" && !result.includes("Sorry")) {
      return result;
    }
    return null;

  } catch (error) {
    console.error("Hand sign analysis failed:", error);
    return null;
  }
};