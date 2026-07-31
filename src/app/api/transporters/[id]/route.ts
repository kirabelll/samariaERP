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
                truckType: truck.truckType,
                capacity: truck.capacity,
                capacityUnit: truck.capacityUnit,
              },
            });
          } else {
            // Create new truck
            await tx.truck.create({
              data: {
                plateNo: truck.plateNo,
                truckType: truck.truckType,
                capacity: truck.capacity,
                capacityUnit: truck.capacityUnit,
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
    const transporter = await prisma.transporter.findUnique({
      where: { id: params.id },
    });

    if (!transporter) {
      return NextResponse.json(
        { success: false, error: 'Transporter not found' },
        { status: 404 }
      );
    }

    // Soft delete - set status to Inactive
    const deletedTransporter = await prisma.transporter.update({
      where: { id: params.id },
      data: { status: 'Inactive' },
    });

    return NextResponse.json({ success: true, message: 'Transporter deleted successfully', data: deletedTransporter });
  } catch (error: any) {
    console.error('Error deleting transporter:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
