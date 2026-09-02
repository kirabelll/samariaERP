import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agreement = await prisma.transporterAgreement.findUnique({
      where: { id: params.id },
      include: {
        transporter: {
          select: {
            id: true,
            companyName: true,
            code: true,
            phone: true,
            email: true,
            driverName: true,
            association: { select: { id: true, name: true } },
            trucks: { select: { id: true, plateNo: true, truckType: true, capacity: true, capacityUnit: true } },
          },
        },
        pricingItems: true,
        agreementItems: true,
      },
    });

    if (!agreement) {
      return NextResponse.json(
        { success: false, error: 'Agreement not found' },
        { status: 404 }
      );
    }

    // Enrich with supplier + item info
    const supplier = agreement.supplierId
      ? await prisma.supplier.findUnique({
          where: { id: agreement.supplierId },
          select: { id: true, companyName: true, code: true, category: true },
        })
      : null;

    const itemIds = (agreement.agreementItems || []).map((ai: any) => ai.itemId);
    const items = itemIds.length > 0
      ? await prisma.item.findMany({
          where: { id: { in: itemIds } },
          select: { id: true, name: true, code: true, unit: true, category: true },
        })
      : [];
    const itemMap = Object.fromEntries(items.map((i: any) => [i.id, i]));

    const enriched = {
      ...agreement,
      supplier,
      agreementItems: (agreement.agreementItems || []).map((ai: any) => ({
        ...ai,
        item: itemMap[ai.itemId] || null,
      })),
    };

    return NextResponse.json({ success: true, data: enriched });
  } catch (error: any) {
    console.error('Error fetching agreement:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      supplierId,
      supplierAgreementId,
      productType,
      validFrom,
      validTo,
      terms,
      status,
      loadingSite,
      offloadingSite,
      deliverySites,
      pricePerUnit,
      aggregateValue,
      unitType,
      amount,
      loadSize,
      associationServiceCharge,
      associationChargeEnabled,
      agreementItems,
    } = body;

    const agreement = await prisma.transporterAgreement.findUnique({
      where: { id: params.id },
    });

    if (!agreement) {
      return NextResponse.json(
        { success: false, error: 'Agreement not found' },
        { status: 404 }
      );
    }

    // Status transition validation
    if (status && status !== agreement.status) {
      const allowedTransitions: Record<string, string[]> = {
        Draft: ['Active', 'Rejected', 'Cancelled', 'Deactivated', 'Void'],
        Active: ['Expired', 'Cancelled', 'Void', 'Deactivated', 'Draft'],
        Rejected: ['Draft', 'Active', 'Deactivated'],
        Expired: ['Active', 'Draft', 'Cancelled', 'Deactivated', 'Void'],
        Cancelled: ['Active', 'Draft', 'Deactivated', 'Void'],
        Void: ['Active', 'Draft', 'Deactivated'],
        Deactivated: ['Active', 'Draft', 'Cancelled', 'Expired', 'Void'],
      };

      const allowed = allowedTransitions[agreement.status] || [];
      if (!allowed.includes(status)) {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot transition from "${agreement.status}" to "${status}". Allowed: ${allowed.join(', ') || 'none'}`,
          },
          { status: 400 }
        );
      }
    }

    const updatedAgreement = await prisma.$transaction(async (tx) => {
      const updated = await tx.transporterAgreement.update({
        where: { id: params.id },
        data: {
          supplierId: supplierId !== undefined ? (supplierId || null) : agreement.supplierId,
          supplierAgreementId: supplierAgreementId !== undefined ? (supplierAgreementId || null) : (agreement as any).supplierAgreementId,
          productType: productType || agreement.productType,
          validFrom: validFrom ? (typeof validFrom === 'string' && validFrom.match(/^\d{4}-\d{2}-\d{2}$/) 
            ? new Date(validFrom + 'T00:00:00.000Z') 
            : new Date(validFrom)) : agreement.validFrom,
          validTo: validTo ? (typeof validTo === 'string' && validTo.match(/^\d{4}-\d{2}-\d{2}$/) 
            ? new Date(validTo + 'T23:59:59.999Z') 
            : new Date(validTo)) : agreement.validTo,
          terms: terms !== undefined ? terms : agreement.terms,
          status: status || agreement.status,
          loadingSite: loadingSite !== undefined ? loadingSite : agreement.loadingSite,
          offloadingSite: offloadingSite !== undefined ? offloadingSite : agreement.offloadingSite,
          deliverySites: deliverySites !== undefined ? (deliverySites ? JSON.stringify(deliverySites) : null) : (agreement as any).deliverySites,
          pricePerUnit: pricePerUnit !== undefined ? (pricePerUnit ? parseFloat(pricePerUnit) : null) : agreement.pricePerUnit,
          aggregateValue: aggregateValue !== undefined ? (aggregateValue ? parseFloat(aggregateValue) : null) : agreement.aggregateValue,
          unitType: unitType !== undefined ? unitType : agreement.unitType,
          amount: amount !== undefined ? (amount ? parseFloat(amount) : null) : agreement.amount,
          loadSize: loadSize !== undefined ? (loadSize ? parseFloat(loadSize) : null) : agreement.loadSize,
          associationServiceCharge: associationServiceCharge !== undefined ? (associationServiceCharge ? parseFloat(associationServiceCharge) : 0) : agreement.associationServiceCharge,
          associationChargeEnabled: associationChargeEnabled !== undefined ? associationChargeEnabled : (agreement as any).associationChargeEnabled,
        },
      });

      // Replace agreementItems if provided
      if (Array.isArray(agreementItems)) {
        await tx.transporterAgreementItem.deleteMany({
          where: { agreementId: params.id },
        });
        if (agreementItems.length > 0) {
          await Promise.all(
            agreementItems
              .filter((ai: any) => ai.itemId)
              .map((ai: any) =>
                tx.transporterAgreementItem.create({
                  data: {
                    agreementId: params.id,
                    itemId: ai.itemId,
                    transportRate: parseFloat(ai.transportRate) || 0,
                    aggregateValue: parseFloat(ai.aggregateValue) || 0,
                  },
                })
              )
          );
        }
      }

      return tx.transporterAgreement.findUnique({
        where: { id: params.id },
        include: {
          transporter: { select: { companyName: true, code: true } },
          pricingItems: true,
          agreementItems: true,
        },
      });
    });

    return NextResponse.json({ success: true, data: updatedAgreement });
  } catch (error: any) {
    console.error('Error updating agreement:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agreement = await prisma.transporterAgreement.findUnique({
      where: { id: params.id },
    });

    if (!agreement) {
      return NextResponse.json(
        { success: false, error: 'Agreement not found' },
        { status: 404 }
      );
    }

    // Soft delete - set status to Cancelled
    const deletedAgreement = await prisma.transporterAgreement.update({
      where: { id: params.id },
      data: { status: 'Cancelled' },
      include: {
        transporter: { select: { companyName: true, code: true } },
        pricingItems: true,
      },
    });

    return NextResponse.json({ success: true, message: 'Agreement deleted successfully', data: deletedAgreement });
  } catch (error: any) {
    console.error('Error deleting agreement:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
