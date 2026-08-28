export interface CustomAuctionCard {
  id: string;
  number: number;
  text: string;
  category: 'power' | 'sick';
  isFlipped?: boolean;
}

export const DEFAULT_POWER_CARDS: CustomAuctionCard[] = [];

export const DEFAULT_SICK_CARDS: CustomAuctionCard[] = [];
