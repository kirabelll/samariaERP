import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    app: 'samaria-erp',
    version: '1.0.0',
  });
}
