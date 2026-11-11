import { Scene, NarrationLanguage } from '../types';

export function calculateSuggestedDuration(text: string, lang: NarrationLanguage = 'en'): number {
  if (!text || text.trim().length === 0) return 4;
  const clean = text.trim();
  // Count punctuation pauses (commas, periods, question marks, danda ।)
  const pauseMarks = (clean.match(/[,.;:!?।]/g) || []).length;
  const pauseSeconds = pauseMarks * 0.25; // ~250ms per natural breathing pause

  const words = clean.split(/\s+/).filter(Boolean).length;
  // Hindi narration cadence is ~2.15 words/sec (130 WPM), English is ~2.35 words/sec
  const wordsPerSecond = lang === 'hi' ? 2.15 : 2.35;
  const speechSeconds = words / wordsPerSecond;
  const totalSeconds = Math.round(speechSeconds + pauseSeconds);

  // Minimum 4s (to let viewer absorb visual), maximum 24s per scene
  return Math.min(Math.max(totalSeconds, 4), 24);
}

/**
 * Parses user-pasted text from ChatGPT or Gemini into structured Scene items.
 * Preserves original scene order, text, and meaning.
 */
export function parseScenesFromText(inputText: string, defaultLanguage: NarrationLanguage = 'en'): Scene[] {
  if (!inputText || !inputText.trim()) {
    return [];
  }

  const raw = inputText.trim();
  const scenes: Scene[] = [];

  // Patterns for scene separators:
  // e.g. "Scene 1", "[Scene 1]", "### Scene 1", "--- Scene 1 ---", "Scene #1", "1."
  const sceneRegex = /(?:^|\n)(?:(?:---|\*\*\*)\s*)?(?:\[?\s*(?:Scene|दृश्य|Part|भाग)\s*#?\s*(\d+)[:\]\-\s]*|(?:\d+)\.\s+)(.*?)(?=(?:\n(?:(?:---|\*\*\*)\s*)?(?:\[?\s*(?:Scene|दृश्य|Part|भाग)\s*#?\s*\d+[:\]\-\s]*|(?:\d+)\.\s+))|$)/gsi;

  let match: RegExpExecArray | null;
  let matchesFound = 0;

  while ((match = sceneRegex.exec(raw)) !== null) {
    matchesFound++;
    const sceneNumberStr = match[1];
    const sceneBody = match[2] ? match[2].trim() : match[0].trim();
    const sceneNumber = sceneNumberStr ? parseInt(sceneNumberStr, 10) : matchesFound;

    const parsed = parseSingleSceneContent(sceneBody, sceneNumber, defaultLanguage);
    scenes.push(parsed);
  }

  // If the regex didn't catch distinct scenes (e.g., user just pasted paragraphs separated by blank lines or "---")
  if (scenes.length === 0) {
    const blocks = raw.split(/\n{2,}|\n---+\n/).filter(b => b.trim().length > 0);
    blocks.forEach((block, idx) => {
      scenes.push(parseSingleSceneContent(block.trim(), idx + 1, defaultLanguage));
    });
  }

  // Fallback: If still single block
  if (scenes.length === 0 && raw.length > 0) {
    scenes.push(parseSingleSceneContent(raw, 1, defaultLanguage));
  }

  // Ensure consecutive order is strictly maintained
  return scenes.map((s, idx) => ({
    ...s,
    order: idx + 1,
  }));
}

function parseSingleSceneContent(block: string, sceneNum: number, lang: NarrationLanguage): Scene {
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
  
  let description = '';
  let narrationText = '';
  let customPrompt = '';
  let duration: number | null = null;

  for (const line of lines) {
    // Check for Visual / Description label
    if (/^(?:Visual|Description|Scene Description|Visuals|दृश्यकला|विवरण)[:\-]/i.test(line)) {
      description += (description ? ' ' : '') + line.replace(/^(?:Visual|Description|Scene Description|Visuals|दृश्यकला|विवरण)[:\-]\s*/i, '');
    }
    // Check for Narration / Dialogue / Voiceover label
    else if (/^(?:Narration|Voiceover|Voice Over|Dialogue|Audio|वर्णन|आवाज|कथन)[:\-]/i.test(line)) {
      narrationText += (narrationText ? ' ' : '') + line.replace(/^(?:Narration|Voiceover|Voice Over|Dialogue|Audio|वर्णन|आवाज|कथन)[:\-]\s*/i, '');
    }
    // Check for Image Prompt label
    else if (/^(?:Image Prompt|Prompt|Art Prompt|चित्र प्रॉम्प्ट)[:\-]/i.test(line)) {
      customPrompt += (customPrompt ? ' ' : '') + line.replace(/^(?:Image Prompt|Prompt|Art Prompt|चित्र प्रॉम्प्ट)[:\-]\s*/i, '');
    }
    // Check for Duration label
    else if (/^(?:Duration|Timing|समय)[:\-]\s*(\d+)/i.test(line)) {
      const dMatch = line.match(/(\d+)/);
      if (dMatch) duration = parseInt(dMatch[1], 10);
    }
    else {
      // Unlabeled line
      if (!description && !narrationText) {
        description = line;
      } else if (!narrationText) {
        narrationText = line;
      } else {
        description += ' ' + line;
      }
    }
  }

  // If narration is missing, use the description as narration text so user story isn't lost
  if (!narrationText && description) {
    narrationText = description;
  }
  if (!description && narrationText) {
    description = narrationText;
  }
  if (!description && !narrationText) {
    description = block;
    narrationText = block;
  }

  // Construct dark fantasy anime image prompt
  const basePrompt = customPrompt || description;
  const imagePrompt = `cinematic dark fantasy anime, ${basePrompt}, dramatic chiaroscuro shadows, glowing purple magical aura, intense atmospheric depth, manga art aesthetic`;

  const calculatedDuration = duration || calculateSuggestedDuration(narrationText);

  return {
    id: `scene-${Date.now()}-${sceneNum}-${Math.random().toString(36).substring(2, 7)}`,
    order: sceneNum,
    originalText: block,
    description: description.trim(),
    imagePrompt: imagePrompt.trim(),
    narrationText: narrationText.trim(),
    duration: calculatedDuration,
    imageStatus: 'idle',
  };
}

export const SAMPLE_STORIES = {
  // Reference video exact authentic story preset
  referenceVideoStory: `Scene 1:
Visual: Sunny looks up at the gathering sky. Messy dark hair across his forehead, piercing pale blue eyes, high-collar black traveler cloak with gold embroidered trim. Ominous rolling dark grey thunderclouds overtaking the clear blue sky, distant ancient fortress walls.
Narration: वो लगातार आसमान को देख रहा था। कुछ समय पहले तक आसमान साफ और नीला था, मगर अब धीरे-धीरे ग्रे क्लाउड्स उसे निगल रहे थे। सनी के लिए यह सिर्फ मौसम बदलने की बात नहीं थी। क्योंकि गॉड ग्रेव में इन बादलों के पीछे छिपी हुई चीज किसी भी इंसान को पल भर में राख बना सकती थी।
Duration: 13s

Scene 2:
Visual: Sweeping panoramic wide establishing landscape shot. The colossal floating Ivory Island with lush green foliage, cascading waterfalls pouring into the infinite cloud sea below, ancient grand multi-tier pagoda architecture atop the mountain peak. Devastating white holy light breaking through towering storm clouds.
Narration: जैसे ही आइवरी आइलैंड रेल्म बाउंड्री के पार आगे बढ़ेगा, आसमान में एक विनाशकारी सफेद रोशनी फैलने वाली थी। जो भी सीधे उस रोशनी की चपेट में आएगा, उसका बचना लगभग नामुमकिन होगा। और सबसे बड़ी प्रॉब्लम यह थी कि आइवरी आइलैंड कोई छोटी सी फ्लाइंग बोट नहीं थी जिसे खतरा देखते ही तुरंत मोड़ा जा सके। इतनी विशाल चीज को रोकने के लिए समय चाहिए था, और यहां समय ही सबसे बड़ी कमी थी।
Duration: 18s

Scene 3:
Visual: Medium profile shot of Sunny in deep tactical contemplation, exhaling a long breath. Atmospheric mist and wind blowing his black locks, stone battlements of the floating citadel under the threatening sky.
Narration: सनी ने एक लंबी सांस छोड़ी। सच कहें तो फ्लाइंग आइलैंड पर बैठकर ऐसे खतरनाक इलाके में घुसना उसे बिल्कुल सेफ नहीं लग रहा था। आइवरी आइलैंड की एन्चांटमेंट्स कितनी भी पावरफुल क्यों न हों, उसका विशाल आकार और मोमेंटम एक बड़ी कमजोरी था। अगर बादल अचानक हट गए, तो आइलैंड तुरंत रुक नहीं पाएगा। और उस पर मौजूद हर इंसान का अंत हो सकता था।
Duration: 16s`,

  english: `Scene 1:
Visual: Ren stands on a shattered obsidian cliff above the abyssal chasm. Thunder cracks across the violet sky, illuminating his flowing dark mantle and cursed rune-etched blade.
Narration: In the forgotten era before the gods fell, the abyss was sealed by seven mortal blades. Today, the final seal cracked.
Duration: 6s

Scene 2:
Visual: A colossal stone gate covered in ancient glowing purple inscriptions begins to split open, releasing black smoke and glowing violet embers into the thunderstorm.
Narration: From the fissure crawled the shadows of ancient kings, hungry for the warmth of the living world.
Duration: 5s

Scene 3:
Visual: Close-up of Ren's face, his eyes igniting with a sharp crimson-violet flare as shadowy tendrils spiral around his right gauntlet.
Narration: Ren didn't draw his sword to save the kingdom. He drew it to settle a blood debt ten centuries in the making.
Duration: 5s

Scene 4:
Visual: A titanic winged shadow beast looms above the ruined cathedral, roaring with dark purple shockwaves shattering stained glass windows.
Narration: The harbinger has descended. Let the dark saga unfold.
Duration: 5s`,

  hindi: `दृश्य 1:
विवरण: वो लगातार आसमान को देख रहा था। कुछ समय पहले तक आसमान साफ और नीला था, मगर अब धीरे-धीरे ग्रे क्लाउड्स उसे निगल रहे थे।
वर्णन: वो लगातार आसमान को देख रहा था। कुछ समय पहले तक आसमान साफ और नीला था, मगर अब धीरे-धीरे ग्रे क्लाउड्स उसे निगल रहे थे। सनी के लिए यह सिर्फ मौसम बदलने की बात नहीं थी।
समय: 13s

दृश्य 2:
विवरण: जैसे ही आइवरी आइलैंड रेल्म बाउंड्री के पार आगे बढ़ेगा, आसमान में एक विनाशकारी सफेद रोशनी फैलने वाली थी।
वर्णन: जैसे ही आइवरी आइलैंड रेल्म बाउंड्री के पार आगे बढ़ेगा, आसमान में एक विनाशकारी सफेद रोशनी फैलने वाली थी। जो भी सीधे उस रोशनी की चपेट में आएगा, उसका बचना लगभग नामुमकिन होगा।
समय: 18s

दृश्य 3:
विवरण: सनी ने एक लंबी सांस छोड़ी। सच कहें तो फ्लाइंग आइलैंड पर बैठकर ऐसे खतरनाक इलाके में घुसना उसे बिल्कुल सेफ नहीं लग रहा था।
वर्णन: सनी ने एक लंबी सांस छोड़ी। सच कहें तो फ्लाइंग आइलैंड पर बैठकर ऐसे खतरनाक इलाके में घुसना उसे बिल्कुल सेफ नहीं लग रहा था। आइवरी आइलैंड का विशाल आकार और मोमेंटम एक बड़ी कमजोरी था।
समय: 16s`
};
