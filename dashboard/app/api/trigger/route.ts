import { NextResponse } from 'next/server';
import { triggerWorkflow } from '@/lib/github';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, domain, limit } = body;

    const validActions = ['scan', 'solve', 'claim', 'claim-live', 'status', 'auto-dry-run', 'auto-live'];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    await triggerWorkflow(action, domain, limit);
    return NextResponse.json({ success: true, message: 'Workflow triggered' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
