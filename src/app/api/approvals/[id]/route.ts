import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { approveRecord, rejectRecord } from '@/lib/approval-workflow';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET single approval detail
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const approval = await prisma.approval.findUnique({
      where: { id: params.id },
      include: {
        requester: { select: { firstName: true, lastName: true } },
        approver: { select: { firstName: true, lastName: true } },
      },
    });

    if (!approval) {
      return NextResponse.json({ success: false, error: 'Approval not found' }, { status: 404 });
    }

    // Get all approvals for the same record (full history)
    const history = await prisma.approval.findMany({
      where: { module: approval.module, recordId: approval.recordId },
      orderBy: { level: 'asc' },
      include: {
        requester: { select: { firstName: true, lastName: true } },
        approver: { select: { firstName: true, lastName: true } },
      },
    });

    return NextResponse.json({ success: true, data: approval, history });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH — Approve or Reject (with Telegram notifications)
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, notes, reason } = body;
    // action: 'approve' | 'reject'

    let result;

    if (action === 'approve') {
      result = await approveRecord(params.id, userId, notes);
    } else if (action === 'reject') {
      result = await rejectRecord(params.id, userId, reason || notes || 'Rejected');
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use "approve" or "reject".' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Error processing approval:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT — Keep backward compatibility (legacy)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    const body = await request.json();
    const { status, notes } = body;

    if (status === 'APPROVED' || status === 'Approved') {
      const result = await approveRecord(params.id, userId || '', notes);
      return NextResponse.json({ success: true, ...result });
    } else if (status === 'REJECTED' || status === 'Rejected') {
      const result = await rejectRecord(params.id, userId || '', notes || 'Rejected');
      return NextResponse.json({ success: true, ...result });
    }

    // Fallback: direct update for other statuses (e.g. CANCELLED)
    const approval = await prisma.approval.update({
      where: { id: params.id },
      data: { status, notes, resolvedAt: new Date() },
    });

    return NextResponse.json({ success: true, data: approval });
  } catch (error: any) {
    console.error('Error updating approval:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
