import { Metadata } from 'next';
import { StarWarsCrawl } from '@/components/credits/star-wars-crawl';

export const metadata: Metadata = {
  title: 'About | Eleven',
  description: 'About Eleven and its creator.',
};

export default function AboutPage() {
  return <StarWarsCrawl />;
}
