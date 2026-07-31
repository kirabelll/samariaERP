import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateSupplierCode } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) {
      whereClause.status = status;
    }

    const [data, total] = await Promise.all([
      prisma.supplier.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.supplier.count({ where: whereClause }),
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
    console.error('Error fetching suppliers:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      companyName,
      supplierType,
      firstName,
      lastName,
      tin,
      phone,
      email,
      contactPerson,
      location,
      category,
      bankAccounts,
      status,
      withholding,
      withholdRate,
    } = body;

    if (!companyName || !phone) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: companyName, phone' },
        { status: 400 }
      );
    }

    const supplier = await prisma.$transaction(async (tx) => {
      const count = await tx.supplier.count();
      const code = generateSupplierCode(count + 1);

      // Create supplier
      const newSupplier = await tx.supplier.create({
        data: {
          code,
          companyName,
          supplierType: supplierType || 'company',
          firstName: firstName || null,
          lastName: lastName || null,
          tin: tin || null,
          phone,
          email: email || null,
          contactPerson: contactPerson || null,
          location: location || null,
          category: category || null,
          status: status || 'Active',
          withholding: withholding || false,
          withholdRate: withholdRate || 2,
        },
      });

      // Create bank accounts if provided
      if (bankAccounts && Array.isArray(bankAccounts) && bankAccounts.length > 0) {
        await tx.supplierBank.createMany({
          data: bankAccounts.map((bank: any, index: number) => ({
            supplierId: newSupplier.id,
            bankName: bank.bankName,
            accountNo: bank.accountNo,
            accountName: bank.accountName || null,
            branch: null,
            isDefault: index === 0, // Set first bank account as default
          })),
        });
      }

      return newSupplier;
    });

    return NextResponse.json(
      { success: true, data: supplier },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating supplier:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
