import { NextResponse } from 'next/server';
import { fetchLatestWorkflowRun } from '@/lib/github';

export async function GET() {
  try {
    const workflow = await fetchLatestWorkflowRun();
    return NextResponse.json({ workflow });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
