import { NextResponse } from 'next/server';
import { fetchOpenBounties, fetchSolvedBounties, fetchDailyReport } from '@/lib/github';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get('file') || 'all';

  try {
    if (file === 'all') {
      const [openBounties, solvedBounties, dailyReport] = await Promise.all([
        fetchOpenBounties(),
        fetchSolvedBounties(),
        fetchDailyReport()
      ]);
      return NextResponse.json(
        { openBounties, solvedBounties, dailyReport },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
          }
        }
      );
    } else if (file === 'open_bounties') {
      const openBounties = await fetchOpenBounties();
      return NextResponse.json(openBounties, {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' }
      });
    } else if (file === 'solved_bounties') {
      const solvedBounties = await fetchSolvedBounties();
      return NextResponse.json(solvedBounties, {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' }
      });
    } else if (file === 'daily_report') {
      const dailyReport = await fetchDailyReport();
      return NextResponse.json(dailyReport, {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' }
      });
    } else {
      return NextResponse.json({ error: 'Invalid file parameter' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
