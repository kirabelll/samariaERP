import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transporter = await prisma.transporter.findUnique({
      where: { id: params.id },
      include: { trucks: true },
    });

    if (!transporter) {
      return NextResponse.json(
        { success: false, error: 'Transporter not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: transporter });
  } catch (error: any) {
    console.error('Error fetching transporter:', error);
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
    const { trucks: incomingTrucks, ...transporterData } = body;

    const transporter = await prisma.transporter.findUnique({
      where: { id: params.id },
    });

    if (!transporter) {
      return NextResponse.json(
        { success: false, error: 'Transporter not found' },
        { status: 404 }
      );
    }

    const updatedTransporter = await prisma.$transaction(async (tx) => {
      // Update transporter fields
      const updated = await tx.transporter.update({
        where: { id: params.id },
        data: {
          companyName: transporterData.companyName || transporter.companyName,
          transporterType: transporterData.transporterType || transporter.transporterType,
          firstName: transporterData.firstName !== undefined ? transporterData.firstName : transporter.firstName,
          lastName: transporterData.lastName !== undefined ? transporterData.lastName : transporter.lastName,
          tin: transporterData.tin !== undefined ? transporterData.tin : transporter.tin,
          phone: transporterData.phone !== undefined ? transporterData.phone : transporter.phone,
          email: transporterData.email !== undefined ? transporterData.email : transporter.email,
          contactPerson: transporterData.contactPerson !== undefined ? transporterData.contactPerson : transporter.contactPerson,
          location: transporterData.location !== undefined ? transporterData.location : transporter.location,
          status: transporterData.status || transporter.status,
          withholding: transporterData.withholding !== undefined ? transporterData.withholding : transporter.withholding,
          withholdRate: transporterData.withholdRate !== undefined ? transporterData.withholdRate : transporter.withholdRate,
        },
        include: { trucks: true },
      });

      // Handle trucks if provided
      if (incomingTrucks && Array.isArray(incomingTrucks)) {
        const incomingIds = incomingTrucks
          .filter((t: any) => t.id)
          .map((t: any) => t.id);

        // Delete trucks that are in DB but not in the incoming list
        await tx.truck.deleteMany({
          where: {
            transporterId: params.id,
            id: { notIn: incomingIds },
          },
        });

        // Create/update trucks
        for (const truck of incomingTrucks) {
          if (truck.id) {
            // Update existing truck
            await tx.truck.update({
              where: { id: truck.id },
              data: {
                plateNo: truck.plateNo,
                truckType: truck.truckType || null,
                capacity: truck.capacity || null,
                capacityUnit: truck.capacityUnit || null,
                driverName: truck.driverName || null,
                ownerName: truck.ownerName || null,
                ownerPhone: truck.ownerPhone || null,
                ownerTin: truck.ownerTin || null,
              },
            });
          } else {
            // Create new truck
            await tx.truck.create({
              data: {
                plateNo: truck.plateNo,
                truckType: truck.truckType || null,
                capacity: truck.capacity || null,
                capacityUnit: truck.capacityUnit || null,
                driverName: truck.driverName || null,
                ownerName: truck.ownerName || null,
                ownerPhone: truck.ownerPhone || null,
                ownerTin: truck.ownerTin || null,
                transporterId: params.id,
                status: 'Active',
              },
            });
          }
        }
      }

      // Fetch updated transporter with trucks
      return tx.transporter.findUnique({
        where: { id: params.id },
        include: { trucks: true },
      });
    });

    return NextResponse.json({ success: true, data: updatedTransporter });
  } catch (error: any) {
    console.error('Error updating transporter:', error);
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
    const searchParams = request.nextUrl.searchParams;
    const isPermanent = searchParams.get('permanent') === 'true' || searchParams.get('hard') === 'true';

    const transporter = await prisma.transporter.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            trucks: true,
            agreements: true,
            aggDeliveries: true,
            truckPayments: true,
            settlements: true,
            recoveries: true,
          },
        },
      },
    });

    if (!transporter) {
      return NextResponse.json(
        { success: false, error: 'Transporter not found' },
        { status: 404 }
      );
    }

    // If already Inactive or requested permanent delete
    if (transporter.status === 'Inactive' || isPermanent) {
      const counts = transporter._count;
      const linked: string[] = [];
      if (counts.trucks > 0) linked.push(`${counts.trucks} truck(s)`);
      if (counts.agreements > 0) linked.push(`${counts.agreements} agreement(s)`);
      if (counts.aggDeliveries > 0) linked.push(`${counts.aggDeliveries} aggregate delivery(ies)`);
      if (counts.truckPayments > 0) linked.push(`${counts.truckPayments} payment(s)`);
      if (counts.settlements > 0) linked.push(`${counts.settlements} settlement(s)`);
      if (counts.recoveries > 0) linked.push(`${counts.recoveries} recovery(ies)`);

      if (linked.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot permanently delete transporter because it is referenced in: ${linked.join(', ')}. Please remove or reassign these records first.`,
          },
          { status: 400 }
        );
      }

      // Hard delete
      await prisma.transporter.delete({
        where: { id: params.id },
      });

      return NextResponse.json({
        success: true,
        message: 'Transporter permanently deleted from database',
      });
    }

    // Soft delete - set status to Inactive
    const deletedTransporter = await prisma.transporter.update({
      where: { id: params.id },
      data: { status: 'Inactive' },
    });

    return NextResponse.json({
      success: true,
      message: 'Transporter deactivated successfully (status set to Inactive)',
      data: deletedTransporter,
    });
  } catch (error: any) {
    console.error('Error deleting transporter:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
