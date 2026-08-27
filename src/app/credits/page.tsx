import { Metadata } from 'next';
import { StarWarsCrawl } from '@/components/credits/star-wars-crawl';

export const metadata: Metadata = {
  title: 'About the Creator & Credits | Eleven',
  description: 'Experience the journey, vision, and technology behind Eleven in a 3D cinematic crawl.',
};

export default function CreditsPage() {
  return <StarWarsCrawl />;
}
