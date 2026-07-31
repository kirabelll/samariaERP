import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        middleName: true,
        lastName: true,
        phone: true,
        role: true,
        department: true,
        branch: true,
        telegramChatId: true,
        status: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        permissions: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    console.error('Error fetching user:', error);
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
    // Authenticate the request
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const currentUserRole = (session.user as any)?.role;
    const currentUserId = (session.user as any)?.id;

    const body = await request.json();
    const { username, email, password, firstName, middleName, lastName, phone, department, role, status, telegramChatId } = body;

    const existing = await prisma.user.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Only ADMIN can change another user's password
    if (password && password.trim() && currentUserRole !== 'ADMIN' && currentUserId !== params.id) {
      return NextResponse.json(
        { success: false, error: 'Only administrators can change other users\' passwords' },
        { status: 403 }
      );
    }

    // Only ADMIN can change user roles
    if (role && role !== existing.role && currentUserRole !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Only administrators can change user roles' },
        { status: 403 }
      );
    }

    // Only ADMIN can change user status
    if (status && status !== existing.status && currentUserRole !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Only administrators can change user status' },
        { status: 403 }
      );
    }

    // Check for duplicate username/email (excluding current user)
    if (username || email) {
      const duplicate = await prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: params.id } },
            {
              OR: [
                ...(username ? [{ username }] : []),
                ...(email ? [{ email }] : []),
              ],
            },
          ],
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { success: false, error: 'Username or email already exists' },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (firstName) updateData.firstName = firstName;
    if (middleName !== undefined) updateData.middleName = middleName;
    if (lastName) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (telegramChatId !== undefined) updateData.telegramChatId = telegramChatId || null;
    if (department !== undefined) updateData.department = department;
    if (role && currentUserRole === 'ADMIN') updateData.role = role;
    if (status && currentUserRole === 'ADMIN') updateData.status = status;

    if (password && password.trim()) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        middleName: true,
        lastName: true,
        phone: true,
        telegramChatId: true,
        role: true,
        department: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    console.error('Error updating user:', error);
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
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Only administrators can deactivate users' },
        { status: 403 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    await prisma.user.update({
      where: { id: params.id },
      data: { status: 'INACTIVE' },
    });

    return NextResponse.json({ success: true, message: 'User deactivated' });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
