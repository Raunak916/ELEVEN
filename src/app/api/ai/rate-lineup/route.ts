import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AiTeamRating } from '@/lib/types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface PlayerPayload {
  slot?: string;
  role: string;
  name: string;
  team: string;
  nationality: string;
  category?: string;
}

interface RateLineupPayload {
  teamId: string;
  teamName: string;
  owner: string;
  formation: string;
  starters: PlayerPayload[];
  bench: PlayerPayload[];
  totalSquad: number;
}

export async function POST(req: Request) {
  try {
    const body: RateLineupPayload = await req.json();
    const { teamName, owner, formation, starters, bench } = body;

    if (!teamName || !starters || starters.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Team name and starting lineup are required' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      // Fallback heuristics if key is not provided
      const starterCount = starters.length;
      const baseScore = Math.min(9.5, Math.max(5.0, 5.0 + (starterCount / 11) * 3.5));
      const fallbackRating: AiTeamRating = {
        overallRating: Number(baseScore.toFixed(1)),
        verdictTitle: starterCount >= 11 ? 'Tactically Sound Matchday Squad' : 'Incomplete Lineup in Progress',
        styleArchetype: 'Balanced Modern Pressing System',
        subRatings: {
          defense: Number((baseScore - 0.2).toFixed(1)),
          midfield: Number((baseScore + 0.1).toFixed(1)),
          attack: Number((baseScore).toFixed(1)),
          depth: Number(Math.min(9.0, 6.0 + (bench.length * 0.5)).toFixed(1)),
        },
        verdictSummary: `${teamName} managed by ${owner} sets up in a ${formation}. The squad demonstrates solid structural balance across all thirds of the pitch.`,
        strengths: [
          `Disciplined tactical setup in ${formation}`,
          `Good positional versatility in core roles`,
          `${starters.length} active starting positions locked in`,
        ],
        weaknesses: [
          starterCount < 11 ? 'Starting XI is missing key starting slots' : 'High tactical workload required in transition',
          bench.length < 3 ? 'Limited bench rotation for late-game fatigue' : 'Defensive recovery pace against elite wingers',
        ],
        keyPlayer: {
          name: starters[0]?.name || 'Captain',
          reason: 'Key structural anchor dictating match tempo and organizing team shape.',
        },
        generatedAt: new Date().toISOString(),
      };

      return NextResponse.json({ success: true, rating: fallbackRating });
    }

    // Build the detailed tactical prompt
    const startersListText = starters
      .map(
        (p, idx) =>
          `${idx + 1}. [${p.slot || p.role}] ${p.name} (Club: ${p.team}, Nat: ${p.nationality}${
            p.category && p.category !== 'CURRENT' ? `, Tier: ${p.category}` : ''
          })`
      )
      .join('\n');

    const benchListText =
      bench.length > 0
        ? bench
            .map(
              (p, idx) =>
                `${idx + 1}. [${p.role}] ${p.name} (${p.team}, ${p.nationality})`
            )
            .join('\n')
        : '(No reserve bench players)';

    const prompt = `You are a world-class football tactical director, UEFA Pro License coach, and senior scout.
Evaluate this football auction team and its tactical starting XI rigorously:

TEAM PROFILE:
- Team Name: "${teamName}"
- Manager/Owner: "${owner}"
- Formation: ${formation}
- Starting XI (${starters.length}/11 slots filled):
${startersListText}

RESERVES & BENCH (${bench.length} players):
${benchListText}

EVALUATION CRITERIA:
1. Overall Rating (out of 10, e.g. 8.7 or 9.4). Be honest, calibrated, and analytical based on real-world player capabilities, tactical synergy, and role suitability.
2. Verdict Title: Punchy editorial title e.g. "Champions League Calibre Superteam", "High-Octane Counter-Attacking Threat", "Work-in-Progress with Generational Talent".
3. Style Archetype: Tactical identity e.g. "Fluid Positional Play & High Counterpress", "Compact Low-Block with Lethal Wing Transitions", "Direct Box-to-Box Physical Dominance".
4. Sub-Ratings (each 1.0 - 10.0):
   - defense (Goalkeeper, Center Backs, Fullbacks, defensive recovery)
   - midfield (Control, tempo dictation, creativity, pressing)
   - attack (Goal threat, winger 1v1 ability, striker finishing, movement)
   - depth (Bench quality, tactical versatility, rotation capability)
5. Verdict Summary: 2-3 crisp, authoritative sentences reviewing their competitive ceiling and matchday identity.
6. Strengths: Exactly 3 bullet points highlighting their biggest tactical advantages.
7. Weaknesses: Exactly 2 bullet points detailing tactical risks, gaps, or transition vulnerabilities.
8. Key Player / Talisman: Select the single most influential player on this pitch and explain why they make this system tick in 1 clear sentence.

Provide your response in raw JSON adhering strictly to this schema:
{
  "overallRating": 8.9,
  "verdictTitle": "string",
  "styleArchetype": "string",
  "subRatings": {
    "defense": 8.7,
    "midfield": 9.2,
    "attack": 9.0,
    "depth": 8.0
  },
  "verdictSummary": "string",
  "strengths": ["string", "string", "string"],
  "weaknesses": ["string", "string"],
  "keyPlayer": {
    "name": "string",
    "reason": "string"
  }
}`;

    const modelsToTry = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
    ];

    let responseText = '';
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
          },
        });

        const result = await model.generateContent(prompt);
        responseText = result.response.text();
        if (responseText) break;
      } catch (err) {
        lastError = err;
        console.warn(`Gemini rating attempt with ${modelName} failed, trying next fallback...`);
      }
    }

    if (!responseText) {
      throw lastError || new Error('Failed to generate AI rating from model cascade');
    }

    const parsed = JSON.parse(responseText);

    const finalRating: AiTeamRating = {
      overallRating: Math.min(10, Math.max(1, Number(parsed.overallRating) || 8.0)),
      verdictTitle: parsed.verdictTitle || 'Tactically Balanced Squad',
      styleArchetype: parsed.styleArchetype || 'Modern Dynamic System',
      subRatings: {
        defense: Math.min(10, Math.max(1, Number(parsed.subRatings?.defense) || 8.0)),
        midfield: Math.min(10, Math.max(1, Number(parsed.subRatings?.midfield) || 8.0)),
        attack: Math.min(10, Math.max(1, Number(parsed.subRatings?.attack) || 8.0)),
        depth: Math.min(10, Math.max(1, Number(parsed.subRatings?.depth) || 7.5)),
      },
      verdictSummary: parsed.verdictSummary || 'Solid tactical setup across all lines.',
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 3) : ['Good structural balance', 'Creative midfield'],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses.slice(0, 2) : ['Potential transition exposure'],
      keyPlayer: {
        name: parsed.keyPlayer?.name || starters[0]?.name || 'Talisman',
        reason: parsed.keyPlayer?.reason || 'Essential anchor orchestrating match flow.',
      },
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, rating: finalRating });
  } catch (error: any) {
    console.error('Rate lineup API error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to analyze team lineup' },
      { status: 500 }
    );
  }
}
