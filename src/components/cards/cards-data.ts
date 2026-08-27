export interface CustomAuctionCard {
  id: string;
  number: number;
  text: string;
  category: 'power' | 'sick';
  isFlipped?: boolean;
}

export const DEFAULT_POWER_CARDS: CustomAuctionCard[] = [
  {
    id: 'pc-1',
    number: 1,
    text: '+€25M Transfer Budget Bonus for this auction round.',
    category: 'power',
    isFlipped: false,
  },
  {
    id: 'pc-2',
    number: 2,
    text: 'Golden Gavel: Overrule any tied bid to instantly secure the drawn player.',
    category: 'power',
    isFlipped: false,
  },
  {
    id: 'pc-3',
    number: 3,
    text: 'Scouting Intel: Reveal the next 3 players in the draw queue.',
    category: 'power',
    isFlipped: false,
  },
  {
    id: 'pc-4',
    number: 4,
    text: 'Salary Cap Exemption: Sign 1 superstar without squad limit penalties.',
    category: 'power',
    isFlipped: false,
  },
  {
    id: 'pc-5',
    number: 5,
    text: 'Double Down: Double all matchday points scored by your captain.',
    category: 'power',
    isFlipped: false,
  },
  {
    id: 'pc-6',
    number: 6,
    text: 'Buyout Snatch: Purchase any unassigned player at baseline base price.',
    category: 'power',
    isFlipped: false,
  },
  {
    id: 'pc-7',
    number: 7,
    text: 'Tactical Mastermind: +10% chemistry bonus across all 4 field positions.',
    category: 'power',
    isFlipped: false,
  },
  {
    id: 'pc-8',
    number: 8,
    text: 'Clean Sheet Fortress: 1.5x score multiplier for Goalkeeper and Defenders.',
    category: 'power',
    isFlipped: false,
  },
];

export const DEFAULT_SICK_CARDS: CustomAuctionCard[] = [
  {
    id: 'sc-1',
    number: 1,
    text: 'Auction Freeze: Silence all rival bidding for 60 seconds (sealed blind bids only).',
    category: 'sick',
    isFlipped: false,
  },
  {
    id: 'sc-2',
    number: 2,
    text: 'Sudden Death: 10-second rapid blind countdown for the next drawn player.',
    category: 'sick',
    isFlipped: false,
  },
  {
    id: 'sc-3',
    number: 3,
    text: 'Identity Theft: Force a straight 1-for-1 player swap with any rival team.',
    category: 'sick',
    isFlipped: false,
  },
  {
    id: 'sc-4',
    number: 4,
    text: 'Revenue Siphon: Divert 15% of the highest bidder’s spend into your club vault.',
    category: 'sick',
    isFlipped: false,
  },
  {
    id: 'sc-5',
    number: 5,
    text: 'Ghost Bidder: Bid anonymously through an AI proxy with identity hidden.',
    category: 'sick',
    isFlipped: false,
  },
  {
    id: 'sc-6',
    number: 6,
    text: 'Curse Reversal: Instantly wipe away any penalty, injury handicap, or red card.',
    category: 'sick',
    isFlipped: false,
  },
  {
    id: 'sc-7',
    number: 7,
    text: 'Wildcard Joker: Reshuffle and redraw the entire current player pool.',
    category: 'sick',
    isFlipped: false,
  },
  {
    id: 'sc-8',
    number: 8,
    text: 'Golden Boot: 3x points on all knockout goals scored by your lead striker.',
    category: 'sick',
    isFlipped: false,
  },
];
