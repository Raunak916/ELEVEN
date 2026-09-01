import { createClient } from '@libsql/client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

async function generateHypeForTopPlayers() {
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error("❌ Missing TURSO credentials in .env");
    process.exit(1);
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error("❌ Missing GEMINI_API_KEY in .env. You must provide one to batch-generate scout reports.");
    process.exit(1);
  }

  const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

  console.log("Fetching top 500 players by highest market value...");
  const { rows: players } = await turso.execute(`
    SELECT id, name, role FROM players 
    ORDER BY highest_market_value_eur DESC NULLS LAST
    LIMIT 500
  `);

  console.log(`Found ${players.length} players. Starting batch generation...`);

  let count = 0;
  for (const player of players) {
    const playerId = player.id;
    const playerName = player.name;
    const role = player.role;

    // Check if already in cache
    const { rows: existing } = await turso.execute({
      sql: 'SELECT 1 FROM player_hype_cache WHERE player_id = ?',
      args: [playerId],
    });

    if (existing.length > 0) {
      console.log(`[Skipping] ${playerName} already has cached hype.`);
      continue;
    }

    try {
      console.log(`[Generating] Hype for ${playerName}...`);
      const prompt = `You are a hype man for a football (soccer) auction. 
The current player being auctioned is ${playerName} (Role: ${role || 'Footballer'}).
Provide EXACTLY 3 short, punchy bullet points of their real-life career achievements, exciting stats, or hype factors that make them a valuable buy. 
Keep each point under 12 words. Do not use markdown bullet points like '*' or '-', just provide each point on a new line. 
Example for Haaland:
Scored 52 goals in his debut City season
Won the historic Treble in 2023
Ballon d'Or Runner-up and Premier League Golden Boot`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      const hypePoints = responseText
        .split('\n')
        .map(line => line.replace(/^[-*•\d.]\s*/, '').trim())
        .filter(line => line.length > 0)
        .slice(0, 3);

      const finalHype = hypePoints.length === 3 ? hypePoints : [
        `Star ${role || 'player'} ready for the auction.`,
        `Brings immense quality to the pitch.`,
        `Highly sought after by top managers.`,
      ];

      await turso.execute({
        sql: 'INSERT OR IGNORE INTO player_hype_cache (player_id, hype_json, created_at) VALUES (?, ?, ?)',
        args: [playerId, JSON.stringify(finalHype), new Date().toISOString()],
      });

      count++;
      
      // Delay to avoid aggressive rate-limiting (4 seconds = 15 RPM for free tier)
      await new Promise(resolve => setTimeout(resolve, 4000));
    } catch (err) {
      console.error(`❌ Failed to generate hype for ${playerName}:`, err.message);
    }
  }

  console.log(`✅ Successfully generated and cached hype for ${count} new players!`);
  process.exit(0);
}

generateHypeForTopPlayers();
