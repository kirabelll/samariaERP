import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Telegram Bot Webhook — handles incoming messages from @samariaerpBot.
 *
 * Flow:
 *   /start           → Replies with the user's chat ID + instructions
 *   /start <username> → Auto-links the Telegram account to the ERP user
 *   /link <username>  → Same as /start <username>
 *   /myid             → Just returns the chat ID
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const message = body?.message;
    if (!message?.text || !message?.chat?.id) {
      return NextResponse.json({ ok: true }); // Ignore non-text updates
    }

    const chatId = String(message.chat.id);
    const text = message.text.trim();
    const firstName = message.from?.first_name || '';

    // Get bot token
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'telegram_bot_token' },
    });
    const botToken = setting?.value;
    if (!botToken) {
      return NextResponse.json({ ok: true });
    }

    // Check if this chat is already linked to a user
    const existingUser = await prisma.user.findFirst({
      where: { telegramChatId: chatId },
      select: { firstName: true, lastName: true, username: true, role: true },
    });

    // Parse command
    const parts = text.split(/\s+/);
    const command = parts[0].toLowerCase().replace(/@.*$/, ''); // strip @botname
    const arg = parts[1] || '';

    let reply = '';

    if (command === '/start' && !arg) {
      if (existingUser) {
        reply =
          `👋 Welcome back, <b>${existingUser.firstName}</b>!\n\n` +
          `✅ Your Telegram is linked to <b>${existingUser.username}</b> (${existingUser.role}).\n` +
          `You will receive notifications for approvals, orders, and other events based on your role.\n\n` +
          `🆔 Your Chat ID: <code>${chatId}</code>`;
      } else {
        reply =
          `👋 Hello${firstName ? ` ${firstName}` : ''}! Welcome to <b>Samaria ERP (@wonde_samaria)</b>.\n\n` +
          `🆔 Your Telegram Chat ID is:\n<code>${chatId}</code>\n\n` +
          `<b>To receive notifications:</b>\n` +
          `1️⃣ Copy the Chat ID above\n` +
          `2️⃣ Go to your ERP profile: <b>My Profile → Telegram Notifications</b>\n` +
          `3️⃣ Paste the Chat ID and click Save\n\n` +
          `<b>Or link automatically:</b>\n` +
          `Type <code>/link your_username</code>\n` +
          `Example: <code>/link henok</code>`;
      }
    } else if (command === '/myid') {
      reply = `🆔 Your Telegram Chat ID:\n<code>${chatId}</code>`;
    } else if ((command === '/start' && arg) || command === '/link') {
      const username = arg || parts[1] || '';
      if (!username) {
        reply = `⚠️ Please provide your ERP username.\nExample: <code>/link henok</code>`;
      } else {
        // Find user by username (case-insensitive)
        const user = await prisma.user.findFirst({
          where: {
            username: { equals: username, mode: 'insensitive' },
            status: 'ACTIVE',
          },
          select: { id: true, firstName: true, lastName: true, username: true, role: true, telegramChatId: true },
        });

        if (!user) {
          reply =
            `❌ No active ERP user found with username "<b>${username}</b>".\n\n` +
            `Please check your username and try again, or enter the Chat ID manually in your ERP profile.\n\n` +
            `🆔 Your Chat ID: <code>${chatId}</code>`;
        } else if (user.telegramChatId && user.telegramChatId !== chatId) {
          reply =
            `⚠️ User <b>${user.username}</b> is already linked to a different Telegram account.\n\n` +
            `To change it, go to your ERP profile and update the Chat ID manually.\n\n` +
            `🆔 Your Chat ID: <code>${chatId}</code>`;
        } else if (user.telegramChatId === chatId) {
          reply =
            `✅ Already linked! <b>${user.firstName} ${user.lastName}</b> (${user.role})\n\n` +
            `You're all set to receive notifications.`;
        } else {
          // Link the account
          await prisma.user.update({
            where: { id: user.id },
            data: { telegramChatId: chatId },
          });

          reply =
            `✅ <b>Successfully linked!</b>\n\n` +
            `👤 ERP User: <b>${user.firstName} ${user.lastName}</b>\n` +
            `🏷 Role: ${user.role}\n` +
            `🆔 Chat ID: <code>${chatId}</code>\n\n` +
            `You will now receive Telegram notifications for:\n` +
            `• Approval requests for your role\n` +
            `• Approval results on your submissions\n` +
            `• Module-specific events (orders, payments, etc.)`;
        }
      }
    } else if (command === '/help') {
      reply =
        `📚 <b>Samaria ERP (@wonde_samaria) Commands</b>\n\n` +
        `/start — Get your Chat ID & setup instructions\n` +
        `/link <username> — Link your Telegram to your ERP account\n` +
        `/myid — Show your Chat ID\n` +
        `/status — Check your linked account\n` +
        `/help — Show this help message`;
    } else if (command === '/status') {
      if (existingUser) {
        reply =
          `✅ <b>Account Linked</b>\n\n` +
          `👤 ${existingUser.firstName} ${existingUser.lastName}\n` +
          `🏷 Role: ${existingUser.role}\n` +
          `🆔 Chat ID: <code>${chatId}</code>`;
      } else {
        reply =
          `❌ <b>Not Linked</b>\n\n` +
          `Your Telegram is not linked to any ERP account.\n` +
          `Use <code>/link your_username</code> to connect.\n\n` +
          `🆔 Your Chat ID: <code>${chatId}</code>`;
      }
    } else {
      // Unknown command or regular text
      reply =
        `🤖 I'm the Samaria ERP notification bot.\n\n` +
        `Use /start to get started or /help for commands.`;
    }

    // Send reply
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: reply,
        parse_mode: 'HTML',
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Telegram Webhook] Error:', error);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram
  }
}

// GET — health check / webhook verification
export async function GET() {
  return NextResponse.json({ ok: true, webhook: 'active' });
}
