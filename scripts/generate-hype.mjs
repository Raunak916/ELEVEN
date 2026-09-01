import { createClient } from '@libsql/client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

async function generateHypeForTopPlayers() {
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error("❌ Missing TURSO credentials in .env");
    process.exit(1);
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error("❌ Missing GEMINI_API_KEY in .env");
    process.exit(1);
  }

  const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  // Use gemini-2.5-flash as it has much higher free tier quotas
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  console.log("Fetching top 500 players by highest market value...");
  const { rows: players } = await turso.execute(`
    SELECT id, name, role FROM players 
    ORDER BY highest_market_value_eur DESC NULLS LAST
    LIMIT 500
  `);

  console.log(`Found ${players.length} players. Checking cache...`);

  // Find players not in cache
  const uncachedPlayers = [];
  for (const player of players) {
    const { rows: existing } = await turso.execute({
      sql: 'SELECT 1 FROM player_hype_cache WHERE player_id = ?',
      args: [player.id],
    });
    if (existing.length === 0) {
      uncachedPlayers.push(player);
    }
  }

  console.log(`${uncachedPlayers.length} players need hype generated.`);

  const BATCH_SIZE = 15;
  let count = 0;

  for (let i = 0; i < uncachedPlayers.length; i += BATCH_SIZE) {
    const batch = uncachedPlayers.slice(i, i + BATCH_SIZE);
    
    let success = false;
    let retryCount = 0;

    while (!success && retryCount < 5) {
      try {
        console.log(`[Batch ${i / BATCH_SIZE + 1}] Generating hype for ${batch.length} players...`);
        
        const playerListStr = batch.map(p => `- ID: ${p.id} | Name: ${p.name} | Role: ${p.role}`).join('\n');
        
        const prompt = `You are a hype man for a football (soccer) auction. 
I will give you a list of players. For EACH player, provide EXACTLY 3 short, punchy bullet points of their real-life career achievements, exciting stats, or hype factors that make them a valuable buy. Keep each point under 12 words. Do not use markdown bullet points like '*' or '-', just provide each point on a new line.

Return the response as a strict JSON object mapping the exact player ID to an array of 3 string bullet points.

Example JSON structure:
{
  "player_id_1": [
    "Scored 52 goals in his debut City season",
    "Won the historic Treble in 2023",
    "Ballon d'Or Runner-up and Premier League Golden Boot"
  ]
}

Players to process:
${playerListStr}
`;

        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        });
        
        const responseText = result.response.text();
        const batchResults = JSON.parse(responseText);

        for (const player of batch) {
          const hypePoints = batchResults[player.id];
          
          const finalHype = Array.isArray(hypePoints) && hypePoints.length === 3 ? hypePoints : [
            `Star ${player.role || 'player'} ready for the auction.`,
            `Brings immense quality to the pitch.`,
            `Highly sought after by top managers.`,
          ];

          await turso.execute({
            sql: 'INSERT OR IGNORE INTO player_hype_cache (player_id, hype_json, created_at) VALUES (?, ?, ?)',
            args: [player.id, JSON.stringify(finalHype), new Date().toISOString()],
          });
          count++;
        }

        success = true;
        
        // Wait 4 seconds between batches to stay under RPM limit
        await new Promise(resolve => setTimeout(resolve, 4000));
        
      } catch (err) {
        if (err.message.includes('429') || err.message.includes('Quota')) {
          console.warn(`⏳ Rate limit hit on batch! Waiting 10 seconds before retrying...`);
          await new Promise(resolve => setTimeout(resolve, 10000));
          retryCount++;
        } else {
          console.error(`❌ Failed to parse/generate batch:`, err.message);
          success = true; // Skip this batch if it's a parsing error or something else
        }
      }
    }
  }

  console.log(`✅ Successfully generated and cached hype for ${count} new players!`);
  process.exit(0);
}

generateHypeForTopPlayers();
