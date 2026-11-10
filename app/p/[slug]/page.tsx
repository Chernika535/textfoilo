import { eq, and } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { getDb } from '@/db';
import { publications } from '@/db/schema';
import { validatePortfolio } from '@/lib/model';
import { PortfolioSite } from '@/components/textfolio/portfolio';
export const dynamic = 'force-dynamic';
export default async function PublishedPortfolio({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pub = await getDb().select().from(publications).where(and(eq(publications.slug,slug),eq(publications.active,1))).get();
  if (!pub) notFound();
  return <PortfolioSite portfolio={validatePortfolio(JSON.parse(pub.document))} />;
}
