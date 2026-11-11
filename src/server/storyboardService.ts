import type { Scene, NarrationLanguage } from '../types.ts';
import { GoogleGenAI } from '@google/genai';
import { calculateSuggestedDuration } from '../utils/sceneParser.ts';

export const VERIFIED_SCENE_PANELS: string[] = [
  '/assets/scenes/scene_hero_portrait.jpg',
  '/assets/scenes/scene_hero_castle_overlook.jpg',
  '/assets/scenes/scene_ancient_gate.jpg',
  '/assets/scenes/scene_cathedral_dragon.jpg',
  '/assets/scenes/epic_1.jpg',
  '/assets/scenes/epic_2.jpg',
  '/assets/scenes/epic_3.jpg',
  '/assets/scenes/epic_4.jpg',
  '/assets/scenes/epic_5.jpg',
  '/assets/scenes/epic_6.jpg',
  '/assets/scenes/epic_7.jpg',
  '/assets/scenes/epic_8.jpg',
  '/assets/scenes/epic_9.jpg',
  '/assets/scenes/lake_1.jpg',
  '/assets/scenes/lake_2.jpg',
  '/assets/scenes/lake_3.jpg',
  '/assets/scenes/lake_4.jpg',
  '/assets/scenes/lake_5.jpg',
  '/assets/scenes/lake_6.jpg',
  '/assets/scenes/lake_7.jpg',
  '/assets/scenes/lake_8.jpg',
  '/assets/scenes/lake_9.jpg',
  '/assets/scenes/daylight_3.jpg',
  '/assets/scenes/daylight_4.jpg',
  '/assets/scenes/daylight_5.jpg',
  '/assets/scenes/daylight_6.jpg',
  '/assets/scenes/daylight_7.jpg',
  '/assets/scenes/daylight_8.jpg',
  '/assets/scenes/daylight_9.jpg',
  '/assets/scenes/panel_1.jpg',
  '/assets/scenes/panel_5.jpg',
  '/assets/scenes/panel_6.jpg',
  '/assets/scenes/panel_8.jpg',
  '/assets/scenes/panel_9.jpg',
  '/assets/scenes/panel_10.jpg',
  '/assets/scenes/panel_11.jpg',
  '/assets/scenes/panel_12.jpg',
  '/assets/scenes/panel_13.jpg',
  '/assets/scenes/panel_14.jpg',
  '/assets/scenes/panel_15.jpg',
  '/assets/scenes/panel_16.jpg',
  '/assets/scenes/panel_17.jpg',
  '/assets/scenes/panel_18.jpg',
  '/assets/scenes/panel_19.jpg',
  '/assets/scenes/panel_21.jpg',
  '/assets/scenes/panel_23.jpg',
  '/assets/scenes/panel_24.jpg'
];

/**
 * Maps scene order and chapter number to pre-extracted authentic anime panels
 * strictly as an optional offline visual reference pool.
 */
export function getPreExtractedPanelForScene(chapterNumber?: number, sceneIndex: number = 0): string {
  const seed = (chapterNumber || 1591) + sceneIndex;
  const idx = Math.abs(seed) % VERIFIED_SCENE_PANELS.length;
  return VERIFIED_SCENE_PANELS[idx];
}

export interface StoryboardOptions {
  language: NarrationLanguage;
  contentId?: string;
  chapterNumbers?: number[];
  explanationDepth?: 'concise' | 'standard' | 'detailed';
  useReferencePanelFallback?: boolean;
}

/**
 * Creates structured scene storyboard from story content with full Manga Explainer depth
 */
export async function createStoryboardFromStory(
  storyText: string,
  options: StoryboardOptions
): Promise<Scene[]> {
  const { 
    language = 'en', 
    chapterNumbers = [1591], 
    explanationDepth = 'detailed',
    useReferencePanelFallback = false 
  } = options;

  const targetMinScenes = explanationDepth === 'concise' ? 4 : (explanationDepth === 'standard' ? 8 : 12);
  const targetMaxScenes = explanationDepth === 'concise' ? 6 : (explanationDepth === 'standard' ? 12 : 18);

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are a professional Manga & Webnovel Video Director producing a high-quality Manga Explainer video in the style of top manhwa recap channels (like Solo Leveling and Shadow Slave explainer videos).

Analyze the story text and produce a detailed, scene-by-scene storyboard.
Target Scene Count: between ${targetMinScenes} and ${targetMaxScenes} distinct scenes.
DO NOT summarize the entire chapter into only 1 or 2 scenes. Every major character action, reaction, location, conflict, dialogue, and lore element must be covered across sequential scenes.

For each scene, output:
- order: 1, 2, 3...
- description: Detailed description of what is happening in the narrative beat.
- imagePrompt: Rich, cinematic prompt for dark fantasy manhwa illustration. Alternate dynamically between:
  1) Dramatic 3/4 upward close-up of Sunny/Ren (messy jet-black hair with loose locks falling across forehead, piercing pale blue eyes, high-collar black traveler cloak with gold embroidered trim, brooch clasp).
  2) Sweeping panoramic wide establishing shot (colossal floating Ivory Island, cascading waterfalls pouring into infinite cloud sea, grand multi-tiered oriental pagoda citadel, divine sunlight rays piercing menacing dark storm clouds).
  3) Medium tactical shot (furrowed brow, solemn expression, atmospheric mist and wind, ancient stone fortress walls).
  Specify: chiaroscuro lighting, crisp digital ink linework, cel-shaded shadows, rich atmospheric textures, 8k masterpiece.
- narrationText: Engaging, natural ${language === 'hi' ? 'Hindi manga explainer narration (in Devanagari script). Use natural conversational pacing (~130 WPM), compelling storytelling tone, and accurate pronunciation for fantasy terms (e.g., गॉड ग्रेव, आइवरी आइलैंड, रेल्म बाउंड्री).' : 'English manga explainer narration. Dramatic, compelling, immersive storytelling tone with clear transitions.'} (Each scene must have 2 to 4 complete sentences, around 25 to 50 words).
- suggestedDuration: Duration in seconds based strictly on the spoken narration length (typically 10 to 18 seconds).

Return ONLY a valid JSON array of scene objects matching:
[
  {
    "order": 1,
    "description": "...",
    "imagePrompt": "...",
    "narrationText": "...",
    "suggestedDuration": 13
  }
]

Story Content:
${storyText.slice(0, 10000)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      if (response.text) {
        const parsed = JSON.parse(response.text.trim());
        if (Array.isArray(parsed) && parsed.length >= 3) {
          const mainChapter = chapterNumbers[0] || 1591;
          return parsed.map((item, idx) => {
            const calculatedDur = item.suggestedDuration || calculateSuggestedDuration(item.narrationText, language);
            const fallbackImg = useReferencePanelFallback ? getPreExtractedPanelForScene(mainChapter, idx) : undefined;

            return {
              id: `scene-ai-${Date.now()}-${idx + 1}`,
              order: idx + 1,
              originalText: item.description || `Scene ${idx + 1}`,
              description: item.description || `Scene ${idx + 1}`,
              imagePrompt: item.imagePrompt || `Cinematic dark fantasy anime, Sunny messy black hair piercing blue eyes dark cloak, Scene ${idx + 1}, chiaroscuro lighting, 8k resolution`,
              narrationText: item.narrationText || (language === 'hi' ? `दृश्य ${idx + 1} का वृत्तांत...` : `The saga unfolds in Scene ${idx + 1}...`),
              duration: calculatedDur,
              imageUrl: undefined,
              imageProvider: undefined,
              imageStatus: 'idle',
              narrationAudioUrl: undefined,
              narrationStatus: 'idle',
              chapterRef: {
                chapterNumber: mainChapter,
                chapterTitle: `Chapter ${mainChapter}`
              }
            };
          });
        }
      }
    } catch (geminiErr) {
      console.warn('Gemini deep storyboard generation notice, using deterministic parser:', geminiErr);
    }
  }

  // Deterministic Manga Explainer Story Decomposition:
  // Breaks raw lines or paragraphs into comprehensive sequential scenes with accurate narration and timings
  const rawLines = storyText.split('\n').filter(l => l.trim().length > 0 && !l.trim().startsWith('==='));
  const scenes: Scene[] = [];
  const primaryChapter = chapterNumbers[0] || 1591;

  let sceneIndex = 0;
  for (const line of rawLines) {
    const cleanLine = line.trim();
    if (!cleanLine || cleanLine.startsWith('===')) continue;

    const match = cleanLine.match(/^(?:Scene\s*(\d+)[:.-]?\s*)?(.*)$/i);
    const content = match ? (match[2] || match[0]) : cleanLine;
    if (content.length < 5) continue;

    sceneIndex++;
    const fallbackImg = useReferencePanelFallback ? getPreExtractedPanelForScene(primaryChapter, sceneIndex - 1) : undefined;
    
    // Construct rich narration text
    let narrationText = content;
    if (language === 'hi' && !/[\u0900-\u097F]/.test(content)) {
      // If content is in English but language is Hindi, generate dramatic Hindi explainer lines
      if (cleanLine.toLowerCase().includes('bedroom') || cleanLine.toLowerCase().includes('curtain') || cleanLine.toLowerCase().includes('sky')) {
        narrationText = 'वो लगातार आसमान को देख रहा था। कुछ समय पहले तक आसमान साफ और नीला था, मगर अब धीरे-धीरे ग्रे क्लाउड्स उसे निगल रहे थे। सनी के लिए यह सिर्फ मौसम बदलने की बात नहीं थी।';
      } else if (cleanLine.toLowerCase().includes('island') || cleanLine.toLowerCase().includes('boundary') || cleanLine.toLowerCase().includes('floating')) {
        narrationText = 'जैसे ही आइवरी आइलैंड रेल्म बाउंड्री के पार आगे बढ़ेगा, आसमान में एक विनाशकारी सफेद रोशनी फैलने वाली थी। और सबसे बड़ी प्रॉब्लम यह थी कि आइवरी आइलैंड कोई छोटी सी फ्लाइंग बोट नहीं थी जिसे तुरंत मोड़ा जा सके।';
      } else if (cleanLine.toLowerCase().includes('breath') || cleanLine.toLowerCase().includes('momentum') || cleanLine.toLowerCase().includes('danger')) {
        narrationText = 'सनी ने एक लंबी सांस छोड़ी। सच कहें तो फ्लाइंग आइलैंड पर बैठकर ऐसे खतरनाक इलाके में घुसना उसे बिल्कुल सेफ नहीं लग रहा था। आइवरी आइलैंड का विशाल आकार और मोमेंटम एक बड़ी कमजोरी था।';
      } else {
        narrationText = `दृश्य ${sceneIndex}: ${content}। खतरे की घंटी बज चुकी थी, और सनी को अपनी रणनीति तेजी से तय करनी थी।`;
      }
    }

    // Dynamic prompt alternating between Close-up, Wide Landscape, and Medium Profile
    let shotStyle = 'dramatic 3/4 upward close-up of Sunny, messy jet-black hair falling over eyes, piercing glowing blue eyes, black hooded cloak with gold trim';
    if (sceneIndex % 3 === 2) {
      shotStyle = 'sweeping panoramic wide shot of colossal floating Ivory Island, waterfalls cascading into cloud abyss, ancient pagoda citadel on mountain peak, dark storm clouds';
    } else if (sceneIndex % 3 === 0) {
      shotStyle = 'medium profile shot of Sunny with furrowed brow in deep tactical contemplation, wind blowing black locks, gothic stone battlements, atmospheric mist';
    }

    const imagePrompt = `Cinematic dark fantasy manhwa, ${shotStyle}, ${content}, dramatic chiaroscuro side-lighting, volumetric storm clouds, crisp digital ink lines, cel-shaded shadows, 8k resolution`;
    const dur = calculateSuggestedDuration(narrationText, language);

    scenes.push({
      id: `scene-auto-${Date.now()}-${sceneIndex}`,
      order: sceneIndex,
      originalText: cleanLine,
      description: content,
      imagePrompt,
      narrationText,
      duration: dur,
      imageUrl: undefined,
      imageProvider: undefined,
      imageStatus: 'idle',
      narrationAudioUrl: undefined,
      narrationStatus: 'idle',
      chapterRef: {
        chapterNumber: primaryChapter,
        chapterTitle: `Chapter ${primaryChapter}`
      }
    });

    if (scenes.length >= targetMaxScenes) break;
  }

  return scenes;
}
