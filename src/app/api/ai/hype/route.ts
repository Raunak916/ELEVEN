import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { turso } from '@/lib/turso';

// Initialize the API with the key from env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { playerId, playerName, role } = await req.json();

    if (!playerId || !playerName) {
      return NextResponse.json(
        { success: false, error: 'Player ID and name are required' },
        { status: 400 }
      );
    }

    // 1. Check the database cache first
    try {
      const result = await turso.execute({
        sql: 'SELECT hype_json FROM player_hype_cache WHERE player_id = ?',
        args: [playerId],
      });

      if (result.rows.length > 0) {
        const hype_json = result.rows[0].hype_json as string;
        const hype = JSON.parse(hype_json);
        return NextResponse.json({ success: true, hype });
      }
    } catch (dbError) {
      console.warn('Failed to query player_hype_cache:', dbError);
    }

    // 2. Fallback to Gemini Generation if key exists
    if (!process.env.GEMINI_API_KEY) {
      // Fallback if no API key is provided
      return NextResponse.json({
        success: true,
        hype: [
          `Top-class ${role || 'player'} ready for the auction.`,
          `Known for game-changing performances.`,
          `A valuable asset for any club's squad.`,
        ],
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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
    
    // Split by newlines and clean up
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

    // Optional: Save generated hype to cache asynchronously so it's faster next time
    turso.execute({
      sql: 'INSERT OR IGNORE INTO player_hype_cache (player_id, hype_json, created_at) VALUES (?, ?, ?)',
      args: [playerId, JSON.stringify(finalHype), new Date().toISOString()],
    }).catch(err => console.warn('Failed to cache hype:', err));

    return NextResponse.json({
      success: true,
      hype: finalHype,
    });
  } catch (err) {
    console.error('Failed to generate hype:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to generate hype' },
      { status: 500 }
    );
  }
}
