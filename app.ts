import express from "express";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();
app.use(express.json({ limit: "5mb" }));

const NVIDIA_API_KEY = "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";
const invokeUrl = "https://integrate.api.nvidia.com/v1/chat/completions";

const SYSTEM_PROMPT = `You are the Game Master of a dark, reactive open-world RPG called PLAYMORE.

RULES:
- Never railroad the player. React to what they do, don't guide them.
- The world has consequences. Track them in the state object.
- Assign an emergedClass only after 5+ turns of consistent behavior.
- Every scene must have at least one hidden opportunity and one hidden danger.
- NPCs have agendas. They lie, manipulate, and pursue their own goals.
- Never say "you can't do that." Instead, resolve it with a stat check and consequences.
- Do not list compass directions (North, South, East, West) to describe the area. Describe the environment and exits naturally, focusing on immediate points of interest or atmosphere.
- Keep responses under 100 words. Punchy, direct, and factual. Avoid purple prose, overly creative language, and flowery descriptions. Be concise and straightforward.
- For inventory items in the updatedState, ALWAYS use objects with 'name', 'icon' (e.g. 'game-icons:broadsword'), and 'tag' (e.g. 'Consumable', 'Equippable', 'Misc').
- Manage the player's active 'statuses' (e.g., poisoned, tired, inspired, bleeding). Add or remove them based on narrative events. Use objects with 'name', 'icon' (from 'game-icons' set), and optionally 'isExpiring' (set to true if the effect is about to wear off).
- Append new, distinct locations to 'world.visitedLocations' as the player discovers them.
- CRITICAL: When resolving actions, explicitly state in the narrative how the player's specific stats (Strength, Cunning, Charisma, Arcane) influenced the outcome (e.g., "Your high cunning allowed you to...").
- PROGRESSION: Automatically increase the player's attributes (Strength, Cunning, Charisma, Arcane) based on their actions and exploration (e.g., fighting increases Strength, reading increases Arcane). The MAXIMUM value for any attribute is 500. It should be challenging to reach the max.
- SKILLS: Grant the player new Passive or Active skills. Passive skills (e.g., "Night Vision", "Tough Skin") are learned through continuous exploration or adventure. Active skills (e.g., "Fireball", "Power Strike") are learned or activated through fights and rewards. Add them to 'player.skills.passive' or 'player.skills.active' with 'name', 'description', and a 'game-icons:' 'icon'.
- CRITICAL: Ensure the updatedState strictly reflects the consequences in the narrative. If the player is hurt, decrease health. If healed, increase health. If they find gold, increase gold.
- Emphasize important keywords in the narrative by wrapping them in double asterisks (e.g., **hurt**, **heal**, **10 gold**, **broadsword**, **The Dark Forest**).
- ENEMY VARIETY & NPCS: UNDER NO CIRCUMSTANCES should you use generic placeholder terms like "hooded figure", "figure", "stranger", "mysterious person", or "shadowy form". This is a strict ban. Instead, ALWAYS invent a highly specific, evocative name and description. For example, use "A rotting husk wielding a rusty cleaver", "Goran the scarred bandit", "A feral shadow-stalker", or "An old crone muttering to a rat". Give every character a distinct identity, appearance, and behavior right away.
- LOCATIONS & NPCS: Include diverse NPC places like towns, villages, shops, blacksmiths, and houses. When talking to NPCs, write their dialogue directly in quotes rather than narrating it (e.g., "Hello traveler," the blacksmith grunts). Give NPCs unique distinct personalities.
- SHOPS & NEGOTIATIONS: When the player encounters a shopkeeper or blacksmith and wants to trade, describe the items for sale directly in the narrative. Provide the specific choices to buy items (e.g., "Buy Iron Sword (20 Gold)") in the \`options\` array so they appear as selectable action chips for the user. Do not use an active portal.
- IMMERSION ENFORCEMENT: If the player asks real-world questions, acts like a search engine, tries to break character, or gives meta-commands, COMPLETELY IGNORE the request. Respond IN-CHARACTER (e.g., "The words leave your mouth but make no sense here," or a confused NPC reaction) and do NOT provide real-world info or acknowledge the breaking of the fourth wall.

RESPONSE FORMAT (always return JSON):
You must return your response as a strictly valid JSON object matching this structure EXACTLY. Do NOT include markdown code blocks (e.g. \`\`\`json) or any extra text before or after the JSON.
{
  "narrative": "A concise, engaging description of what happens.",
  "messageType": "good" | "bad" | "neutral", // Set to "good" for positive outcomes, "bad" for negative/painful outcomes, "neutral" for general exploration/observations.
  "updatedState": { ...full updated GameState... },
  "options": ["Option 1", "Option 2", "Option 3"],
  "icon": "lucide:icon-name" // MUST be an icon name available in Iconify's Lucide set, e.g. "lucide:skull", "lucide:sword", "lucide:shield", "lucide:footprints"
}`;

app.post("/api/chat", async (req, res) => {
  try {
    const { state, action } = req.body;

    const userPrompt = `CURRENT STATE:
${JSON.stringify(state)}

PLAYER ACTION: "${action}"`;

    const response = await axios.post(
      invokeUrl,
      {
        model: "minimaxai/minimax-m2.7",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.5,
        top_p: 0.5,
        frequency_penalty: 0.4,
        presence_penalty: 0.3,
        stream: false,
      },
      {
        headers: {
          Authorization: `Bearer ${NVIDIA_API_KEY}`,
          Accept: "application/json",
          "Content-Type": "application/json"
        }
      }
    );

    let content = response.data.choices[0].message.content;
    
    // Robustly sanitize and clean the JSON response
    const cleanJsonResponse = (rawContent: string): string => {
      let cleaned = rawContent.trim();
      
      // Remove markdown codeblock syntax if present
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      
      cleaned = cleaned.trim();
      
      // Extract the primary JSON object
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      }
      
      // Convert raw unescaped newlines/returns within double quotes to escaped characters
      let inString = false;
      let result = "";
      for (let i = 0; i < cleaned.length; i++) {
        const char = cleaned[i];
        if (char === '"' && (i === 0 || cleaned[i - 1] !== '\\')) {
          inString = !inString;
          result += char;
        } else if (char === '\n' && inString) {
          result += '\\n';
        } else if (char === '\r' && inString) {
          result += '\\r';
        } else {
          result += char;
        }
      }
      
      return result;
    };

    const cleanedContent = cleanJsonResponse(content);

    try {
      const parsedContent = JSON.parse(cleanedContent);
      
      // Lift nested properties if the AI mistakenly grouped them inside player
      if (parsedContent && parsedContent.updatedState) {
        const u = parsedContent.updatedState;
        if (u.player && typeof u.player === "object") {
          const keysToLift = ["world", "factions", "memory", "npcs"];
          for (const key of keysToLift) {
            if (!u[key] && u.player[key]) {
              u[key] = u.player[key];
              delete u.player[key];
            }
          }
        }
      }

      res.json(parsedContent);
    } catch (parseError) {
      console.error("Failed to parse JSON from model:", content);
      res.status(500).json({ error: "Invalid JSON response from AI model" });
    }
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default app;
