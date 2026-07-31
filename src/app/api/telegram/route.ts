import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { testTelegramConnection, verifyBotToken } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

// POST - test connection or save settings
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    // Only admins can configure bot settings
    if ((session.user as any).role !== 'ADMIN' && (session.user as any).role !== 'MANAGER') {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { action, botToken, chatId } = body;

    if (action === 'verify_token') {
      if (!botToken) {
        return NextResponse.json({ success: false, error: 'Bot token is required' }, { status: 400 });
      }
      const result = await verifyBotToken(botToken);
      return NextResponse.json({ success: result.ok, data: result });
    }

    if (action === 'test_message') {
      if (!chatId) {
        return NextResponse.json({ success: false, error: 'Chat ID is required' }, { status: 400 });
      }
      // If botToken is __use_saved__, use the saved token from DB
      let token = botToken;
      if (!token || token === '__use_saved__') {
        const saved = await prisma.systemSetting.findUnique({ where: { key: 'telegram_bot_token' } });
        token = saved?.value || '';
      }
      if (!token) {
        return NextResponse.json({ success: false, error: 'No bot token configured. Ask admin to set it up in System > Notifications.' }, { status: 400 });
      }
      const result = await testTelegramConnection(token, chatId);
      return NextResponse.json({ success: result.ok, data: result });
    }

    if (action === 'save_settings') {
      if (!botToken) {
        return NextResponse.json({ success: false, error: 'Bot token is required' }, { status: 400 });
      }

      // Save bot token to system settings
      await prisma.systemSetting.upsert({
        where: { key: 'telegram_bot_token' },
        update: { value: botToken },
        create: { key: 'telegram_bot_token', value: botToken },
      });

      // Save notification enabled flag
      await prisma.systemSetting.upsert({
        where: { key: 'telegram_enabled' },
        update: { value: 'true' },
        create: { key: 'telegram_enabled', value: 'true' },
      });

      return NextResponse.json({ success: true, message: 'Settings saved' });
    }

    if (action === 'disable') {
      await prisma.systemSetting.upsert({
        where: { key: 'telegram_enabled' },
        update: { value: 'false' },
        create: { key: 'telegram_enabled', value: 'false' },
      });
      return NextResponse.json({ success: true, message: 'Telegram notifications disabled' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to process request' }, { status: 500 });
  }
}

// GET - get current telegram settings (masked token)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const tokenSetting = await prisma.systemSetting.findUnique({
      where: { key: 'telegram_bot_token' },
    });

    const enabledSetting = await prisma.systemSetting.findUnique({
      where: { key: 'telegram_enabled' },
    });

    const token = tokenSetting?.value || '';
    const maskedToken = token ? `${token.slice(0, 8)}...${token.slice(-4)}` : '';

    return NextResponse.json({
      success: true,
      data: {
        configured: !!token,
        enabled: enabledSetting?.value === 'true',
        maskedToken,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch settings' }, { status: 500 });
  }
}
