import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export const dynamic = 'force-dynamic';

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads');

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const module = searchParams.get('module') || '';
    const docType = searchParams.get('docType') || '';

    const skip = (page - 1) * limit;

    const recordId = searchParams.get('recordId') || '';

    const whereClause: any = {};
    if (search) {
      whereClause.fileName = { contains: search, mode: 'insensitive' };
    }
    if (module) {
      whereClause.module = module;
    }
    if (recordId) {
      whereClause.recordId = recordId;
    }
    if (docType) {
      whereClause.docType = docType;
    }

    const [data, total] = await Promise.all([
      prisma.document.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { uploadedAt: 'desc' },
      }),
      prisma.document.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const module = formData.get('module') as string;
    const recordId = formData.get('recordId') as string;
    const docType = formData.get('docType') as string;
    const uploadedBy = formData.get('uploadedBy') as string;

    if (!file || !module || !recordId || !docType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: file, module, recordId, docType' },
        { status: 400 }
      );
    }

    // Create upload directory if it doesn't exist
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}-${file.name}`;
    const filePath = join(UPLOAD_DIR, filename);

    // Save file
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    // Save document record in database
    const document = await prisma.document.create({
      data: {
        module,
        recordId,
        docType,
        fileName: file.name,
        filePath: `/uploads/${filename}`,
        uploadedBy: uploadedBy || null,
        verified: false,
      },
    });

    return NextResponse.json(
      { success: true, data: document },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
