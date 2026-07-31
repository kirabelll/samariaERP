import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateProformaPDF } from '@/lib/pdf-generator';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Proforma ID required' }, { status: 400 });
    }

    const proforma = await prisma.proforma.findUnique({
      where: { id: parseInt(id) },
      include: { customer: true },
    });

    if (!proforma) {
      return NextResponse.json({ error: 'Proforma not found' }, { status: 404 });
    }

    const pdfBuffer = await generateProformaPDF(proforma);

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Proforma-${proforma.proformaNo}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating proforma PDF:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
