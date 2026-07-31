import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'));
    const deliveryId = searchParams.get('deliveryId');

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (deliveryId) {
      where.deliveryId = deliveryId;
    }

    // Get total count for pagination
    const total = await prisma.aggregateProof.count({ where });

    // Get paginated proofs with delivery/dispatch linkage
    const proofs = await prisma.aggregateProof.findMany({
      where,
      skip,
      take: limit,
      include: {
        delivery: {
          select: {
            id: true,
            dispatchNo: true,
            status: true,
            loadedVolume: true,
            deliveredVolume: true,
            shortageVolume: true,
            customerId: true,
            transporterId: true,
          },
        },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: proofs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching aggregate proofs:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const deliveryId = formData.get('deliveryId') as string;
    const proofType = formData.get('proofType') as string;
    const file = formData.get('file') as File;

    // Validate required fields
    if (!deliveryId || !proofType || !file) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: deliveryId, proofType, file',
        },
        { status: 400 }
      );
    }

    // Verify delivery exists
    const delivery = await prisma.aggregateDelivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery) {
      return NextResponse.json(
        { success: false, error: 'Aggregate delivery not found' },
        { status: 400 }
      );
    }

    // Save file to a temporary location or storage service
    // For now, store the file path as: uploads/proofs/[deliveryId]/[timestamp]-[filename]
    const timestamp = Date.now();
    const filePath = `uploads/proofs/${deliveryId}/${timestamp}-${file.name}`;

    // TODO: Implement actual file storage (e.g., AWS S3, local filesystem, etc.)
    // For this example, we're just storing the path in the database

    // Create proof record
    const proof = await prisma.aggregateProof.create({
      data: {
        deliveryId,
        proofType,
        filePath,
        uploadedBy: undefined, // Will be set by middleware or auth
        verified: false,
      },
    });

    return NextResponse.json({ success: true, data: proof }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating aggregate proof:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
