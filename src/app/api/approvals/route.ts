import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { MODULE_LABELS, MODULE_LINK_MAP, LEVEL_ROLES, MODULE_LEVEL_ROLES } from '@/lib/approval-workflow';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const userRole = (session?.user as any)?.role || '';

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const tab = searchParams.get('tab') || 'pending'; // pending | all | my-requests
    const module = searchParams.get('module') || '';
    const status = searchParams.get('status') || '';

    const skip = (page - 1) * limit;
    const whereClause: any = {};

    if (tab === 'pending') {
      // Show PENDING approvals that this user's role can approve
      whereClause.status = 'PENDING';

      // Filter by level→role mapping: only show approvals this user can act on
      if (userRole !== 'ADMIN') {
        // Find which modules+levels this role can approve
        const canApproveConditions: any[] = [];

        for (const [mod, levels] of Object.entries(MODULE_LEVEL_ROLES)) {
          for (const [lvl, roles] of Object.entries(levels)) {
            if ((roles as string[]).includes(userRole)) {
              canApproveConditions.push({ module: mod, level: parseInt(lvl) });
            }
          }
        }

        // Also check default LEVEL_ROLES
        for (const [lvl, info] of Object.entries(LEVEL_ROLES)) {
          if (info.roles.includes(userRole)) {
            canApproveConditions.push({ level: parseInt(lvl) });
          }
        }

        if (canApproveConditions.length > 0) {
          whereClause.OR = canApproveConditions;
        }
      }
    } else if (tab === 'my-requests') {
      // Show approvals the current user requested
      if (userId) {
        whereClause.requesterId = userId;
      }
    } else {
      // "all" tab — show everything
      if (status) {
        whereClause.status = status;
      }
    }

    if (module) {
      whereClause.module = module;
    }

    let data: any[] = [];
    let total = 0;
    let pendingCount = 0;

    try {
      [data, total, pendingCount] = await Promise.all([
        prisma.approval.findMany({
          where: whereClause,
          skip,
          take: limit,
          include: {
            requester: { select: { firstName: true, lastName: true } },
            approver: { select: { firstName: true, lastName: true } },
          },
          orderBy: { requestedAt: 'desc' },
        }),
        prisma.approval.count({ where: whereClause }),
        prisma.approval.count({ where: { status: 'PENDING' } }),
      ]);
    } catch (queryErr: any) {
      // Fallback: new columns may not exist yet — query without level filter
      console.warn('Approval query failed, trying fallback:', queryErr.message);
      const simpleWhere: any = {};
      if (tab === 'pending') simpleWhere.status = 'PENDING';
      if (tab === 'my-requests' && userId) simpleWhere.requesterId = userId;
      if (status) simpleWhere.status = status;
      if (module) simpleWhere.module = module;

      [data, total, pendingCount] = await Promise.all([
        prisma.approval.findMany({
          where: simpleWhere,
          skip,
          take: limit,
          include: {
            requester: { select: { firstName: true, lastName: true } },
            approver: { select: { firstName: true, lastName: true } },
          },
          orderBy: { requestedAt: 'desc' },
        }),
        prisma.approval.count({ where: simpleWhere }),
        prisma.approval.count({ where: { status: 'PENDING' } }),
      ]);
    }

    const formattedData = data.map((item: any) => {
      const moduleLabel = MODULE_LABELS[item.module] || item.module;
      const linkPath = MODULE_LINK_MAP[item.module] || '';
      const level = item.level ?? 1;
      const levelInfo = LEVEL_ROLES[level] || { title: `Level ${level}` };
      const daysOpen = Math.floor((Date.now() - item.requestedAt.getTime()) / (1000 * 60 * 60 * 24));

      return {
        id: item.id,
        module: item.module,
        moduleLabel,
        recordId: item.recordId,
        recordRef: item.recordRef || item.recordId?.slice(0, 8) || '',
        linkPath: linkPath ? `${linkPath}/${item.recordId}` : '',
        description: item.description || `${moduleLabel} approval`,
        level,
        levelTitle: levelInfo.title,
        requiredLevels: item.requiredLevels ?? 1,
        amount: item.amount ?? 0,
        requestedBy: item.requester
          ? `${item.requester.firstName} ${item.requester.lastName}`.trim()
          : '-',
        approvedBy: item.approver
          ? `${item.approver.firstName} ${item.approver.lastName}`.trim()
          : null,
        status: item.status,
        notes: item.notes,
        requestedAt: item.requestedAt,
        resolvedAt: item.resolvedAt,
        daysOpen,
        isOverdue: item.status === 'PENDING' && daysOpen > 3,
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedData,
      pendingCount,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching approvals:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
