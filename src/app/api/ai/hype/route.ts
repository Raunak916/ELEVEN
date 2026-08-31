import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the API with the key from env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { playerName, role } = await req.json();

    if (!playerName) {
      return NextResponse.json(
        { success: false, error: 'Player name is required' },
        { status: 400 }
      );
    }

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

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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

    return NextResponse.json({
      success: true,
      hype: hypePoints.length === 3 ? hypePoints : [
        `Star ${role || 'player'} ready for the auction.`,
        `Brings immense quality to the pitch.`,
        `Highly sought after by top managers.`,
      ],
    });
  } catch (err) {
    console.error('Failed to generate hype:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to generate hype' },
      { status: 500 }
    );
  }
}
