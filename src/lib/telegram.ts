import { prisma } from './prisma';

// Role-to-module mapping: which roles should receive notifications for which modules
const ROLE_MODULE_MAP: Record<string, string[]> = {
  ADMIN: ['SALES', 'PURCHASING', 'FINANCE', 'HR', 'MEDICAL', 'CEMENT', 'AGGREGATE', 'SYSTEM', 'APPROVAL'],
  MANAGER: ['SALES', 'PURCHASING', 'FINANCE', 'HR', 'MEDICAL', 'CEMENT', 'AGGREGATE', 'SYSTEM', 'APPROVAL'],
  SALES: ['SALES', 'APPROVAL'],
  PROCUREMENT: ['PURCHASING', 'APPROVAL'],
  FINANCE: ['FINANCE', 'SALES', 'APPROVAL'],
  HR: ['HR', 'APPROVAL'],
  MEDICAL_PHARMACIST: ['MEDICAL', 'APPROVAL'],
  MEDICAL_DRUGGIST: ['MEDICAL', 'APPROVAL'],
  WAREHOUSE: ['PURCHASING', 'CEMENT', 'AGGREGATE', 'APPROVAL'],
  AUDITOR: ['FINANCE', 'SYSTEM'],
};

/**
 * Get Telegram bot token from system settings
 */
async function getBotToken(): Promise<string | null> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'telegram_bot_token' },
    });
    return setting?.value || null;
  } catch {
    return process.env.TELEGRAM_BOT_TOKEN || null;
  }
}

/**
 * Send a message via Telegram Bot API
 */
async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  message: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const data = await response.json();
    if (!data.ok) {
      return { ok: false, error: data.description || 'Telegram API error' };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Network error' };
  }
}

/**
 * Get users who should receive notifications for a given module
 */
async function getRecipients(module: string, specificRoles?: string[]): Promise<{ id: string; telegramChatId: string; role: string }[]> {
  try {
    // Find all active users with telegram chat IDs
    const users = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        telegramChatId: { not: null },
      },
      select: {
        id: true,
        telegramChatId: true,
        role: true,
      },
    });

    // Filter by role-module mapping
    return users.filter((user) => {
      if (specificRoles && specificRoles.length > 0) {
        return specificRoles.includes(user.role);
      }
      const allowedModules = ROLE_MODULE_MAP[user.role] || [];
      return allowedModules.includes(module);
    }).map((u) => ({
      id: u.id,
      telegramChatId: u.telegramChatId!,
      role: u.role,
    }));
  } catch {
    return [];
  }
}

/**
 * Format notification message with emoji and structure
 */
function formatMessage(event: string, module: string, details: Record<string, any>): string {
  const moduleEmojis: Record<string, string> = {
    SALES: '🛒',
    PURCHASING: '📦',
    FINANCE: '💰',
    HR: '👥',
    MEDICAL: '💊',
    CEMENT: '🏗️',
    AGGREGATE: '🚚',
    SYSTEM: '⚙️',
    APPROVAL: '✅',
  };

  const eventTitles: Record<string, string> = {
    // Sales events
    order_created: '📋 New Sales Order',
    order_confirmed: '✅ Sales Order Confirmed',
    invoice_created: '🧾 New Invoice Created',
    payment_received: '💵 Payment Received',
    payment_verified: '✅ Payment Verified',
    proforma_created: '📄 New Proforma',
    delivery_created: '🚛 New Delivery',
    agreement_created: '📝 New Sales Agreement',
    // Purchasing events
    po_created: '📦 New Purchase Order',
    po_approved: '✅ Purchase Order Approved',
    grv_received: '📥 Goods Received',
    // Finance events
    journal_posted: '📊 Journal Entry Posted',
    bank_transaction: '🏦 Bank Transaction',
    vat_filed: '📋 VAT Period Filed',
    // HR events
    leave_requested: '📅 Leave Request',
    leave_approved: '✅ Leave Approved',
    payroll_processed: '💰 Payroll Processed',
    advance_requested: '💸 Advance Requested',
    advance_approved: '✅ Advance Approved',
    // Medical events
    medical_request: '💊 Medical Request',
    pricing_updated: '💲 Pricing Updated',
    // Cement events
    cement_purchase: '🏗️ Cement Purchase',
    cement_lifting: '🏗️ Cement Lifting',
    // Aggregate events
    aggregate_dispatch: '🚚 Aggregate Dispatch',
    aggregate_delivery: '📦 Aggregate Delivered',
    aggregate_delivery_shortage: '⚠️ Aggregate Delivery — SHORTAGE',
    aggregate_verified: '✅ Aggregate Verified',
    aggregate_settled: '💰 Aggregate Settled',
    truck_payment: '🚛 Truck Payment',
    // System events
    approval_needed: '🔔 Approval Required',
    approval_resolved: '✅ Approval Resolved',
    user_created: '👤 New User Created',
  };

  const emoji = moduleEmojis[module] || '📌';
  const title = eventTitles[event] || `${emoji} ${event}`;

  let msg = `<b>${title}</b>\n`;
  msg += `<i>${module}</i>\n\n`;

  // Add details
  for (const [key, value] of Object.entries(details)) {
    if (value !== null && value !== undefined && value !== '') {
      const label = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (s) => s.toUpperCase())
        .trim();
      msg += `${label}: <b>${value}</b>\n`;
    }
  }

  msg += `\n🕐 ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}`;

  return msg;
}

// ============================================================
// PUBLIC API
// ============================================================

export interface NotifyOptions {
  module: string;
  event: string;
  details: Record<string, any>;
  specificRoles?: string[];   // Override role-module mapping
  specificUserIds?: string[]; // Send to specific users
}

/**
 * Send notification to relevant users based on module and role mapping.
 * This is fire-and-forget — it won't block the calling process.
 */
export async function notify(options: NotifyOptions): Promise<void> {
  try {
    const botToken = await getBotToken();
    if (!botToken) {
      console.log('[Telegram] No bot token configured, skipping notification');
      return;
    }

    const message = formatMessage(options.event, options.module, options.details);

    let recipients: { id: string; telegramChatId: string }[];

    if (options.specificUserIds && options.specificUserIds.length > 0) {
      // Send to specific users
      const users = await prisma.user.findMany({
        where: {
          id: { in: options.specificUserIds },
          telegramChatId: { not: null },
          status: 'ACTIVE',
        },
        select: { id: true, telegramChatId: true },
      });
      recipients = users.map((u) => ({ id: u.id, telegramChatId: u.telegramChatId! }));
    } else {
      // Send to users based on role-module mapping
      recipients = await getRecipients(options.module, options.specificRoles);
    }

    if (recipients.length === 0) {
      console.log(`[Telegram] No recipients for ${options.module}/${options.event}`);
      return;
    }

    // Send to all recipients (fire-and-forget)
    for (const recipient of recipients) {
      // Log the notification
      const notification = await prisma.telegramNotification.create({
        data: {
          recipientId: recipient.id,
          chatId: recipient.telegramChatId,
          module: options.module,
          event: options.event,
          message,
          status: 'PENDING',
        },
      });

      // Send and update status
      const result = await sendTelegramMessage(botToken, recipient.telegramChatId, message);

      await prisma.telegramNotification.update({
        where: { id: notification.id },
        data: {
          status: result.ok ? 'SENT' : 'FAILED',
          errorMsg: result.error || null,
          sentAt: result.ok ? new Date() : null,
        },
      });
    }
  } catch (error) {
    console.error('[Telegram] Notification error:', error);
    // Don't throw — notifications should never break the main flow
  }
}

/**
 * Test the Telegram bot connection by sending a test message
 */
export async function testTelegramConnection(botToken: string, chatId: string): Promise<{ ok: boolean; error?: string }> {
  const message = '✅ <b>SAMARIA ERP</b>\n\nTelegram notification test successful!\nYour notifications are now connected.';
  return sendTelegramMessage(botToken, chatId, message);
}

/**
 * Get bot info to verify token is valid
 */
export async function verifyBotToken(botToken: string): Promise<{ ok: boolean; botName?: string; error?: string }> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/getMe`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.ok) {
      return { ok: true, botName: data.result.username };
    }
    return { ok: false, error: data.description || 'Invalid token' };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Network error' };
  }
}
