// Plain JavaScript seed - runs with just `node prisma/seed.mjs`
// No tsx or TypeScript required

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Hash passwords
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const defaultPasswordHash = await bcrypt.hash('password123', 10);

  // Create admin user
  console.log('Creating admin user...');
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash: adminPasswordHash },
    create: {
      username: 'admin',
      email: 'admin@samaria.com',
      passwordHash: adminPasswordHash,
      firstName: 'Wondemagen',
      lastName: 'Kebede',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });
  console.log('Admin user created/updated');

  // Create sample users
  const users = [
    { username: 'procurement_user', email: 'aynalem@samaria.com', firstName: 'Aynalem', lastName: 'Girma', role: 'PROCUREMENT', department: 'Procurement' },
    { username: 'sales_user', email: 'sara@samaria.com', firstName: 'Sara', lastName: 'Tesfaye', role: 'SALES', department: 'Sales' },
    { username: 'finance_user', email: 'natnael@samaria.com', firstName: 'Natnael', lastName: 'Dessalegn', role: 'FINANCE', department: 'Finance' },
    { username: 'hr_user', email: 'yidnek@samaria.com', firstName: 'Yidnek', lastName: 'Negesse', role: 'HR', department: 'Human Resources' },
    { username: 'medical_pharmacist', email: 'abebe@samaria.com', firstName: 'Abebe', lastName: 'Abebe', role: 'MEDICAL_PHARMACIST', department: 'Medical' },
    { username: 'medical_druggist', email: 'tigist@samaria.com', firstName: 'Tigist', lastName: 'Haile', role: 'MEDICAL_DRUGGIST', department: 'Medical' },
    { username: 'warehouse_user', email: 'dawit@samaria.com', firstName: 'Dawit', lastName: 'Mengistu', role: 'WAREHOUSE', department: 'Warehouse' },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: { passwordHash: defaultPasswordHash },
      create: {
        ...u,
        passwordHash: defaultPasswordHash,
        status: 'ACTIVE',
      },
    });
    console.log(`User ${u.username} created/updated`);
  }

  // Create company
  console.log('Creating company record...');
  const existingCompany = await prisma.company.findFirst({ where: { tin: '0090536209' } });
  if (!existingCompany) {
    await prisma.company.create({
      data: {
        name: 'Samaria Trading One Member PLC',
        nameAmharic: 'ሳማርያ ትሬዲንግ አንድ አባል ኃላ.የተ.የግ.ማ',
        tin: '0090536209',
        phone: '+251974859966',
        phone2: '+251974859966',
        email: 'wondeb2@icloud.com',
        website: 'www.samariaconstruction.com',
        location: 'Addis Ababa',
        regNo: '3233670012',
        withholding: true,
      },
    });
    console.log('Company created');
  } else {
    console.log('Company already exists');
  }

  // Create tax table
  console.log('Creating tax table entries...');
  const taxEntries = [
    { minIncome: 0, maxIncome: 600, rate: 0, deduction: 0 },
    { minIncome: 601, maxIncome: 1650, rate: 10, deduction: 60 },
    { minIncome: 1651, maxIncome: 3200, rate: 15, deduction: 142.5 },
    { minIncome: 3201, maxIncome: 5250, rate: 20, deduction: 302.5 },
    { minIncome: 5251, maxIncome: 7800, rate: 25, deduction: 565 },
    { minIncome: 7801, maxIncome: 10900, rate: 30, deduction: 955 },
    { minIncome: 10901, maxIncome: 999999, rate: 35, deduction: 1500 },
  ];

  for (const entry of taxEntries) {
    await prisma.taxTable.upsert({
      where: { minIncome_maxIncome: { minIncome: entry.minIncome, maxIncome: entry.maxIncome } },
      update: {},
      create: { ...entry, effectiveFrom: new Date('2024-01-01') },
    });
  }
  console.log('Tax table entries created');

  // Create chart of accounts
  console.log('Creating chart of accounts...');
  const accounts = [
    { code: '1000', name: 'Current Assets', type: 'Asset', parent: null },
    { code: '1010', name: 'Cash', type: 'Asset', parent: '1000' },
    { code: '1020', name: 'Bank Accounts', type: 'Asset', parent: '1000' },
    { code: '1030', name: 'Accounts Receivable', type: 'Asset', parent: '1000' },
    { code: '1040', name: 'Inventory', type: 'Asset', parent: '1000' },
    { code: '2000', name: 'Current Liabilities', type: 'Liability', parent: null },
    { code: '2010', name: 'Accounts Payable', type: 'Liability', parent: '2000' },
    { code: '2020', name: 'Sales Tax Payable', type: 'Liability', parent: '2000' },
    { code: '3000', name: 'Equity', type: 'Equity', parent: null },
    { code: '3010', name: 'Capital Stock', type: 'Equity', parent: '3000' },
    { code: '3020', name: 'Retained Earnings', type: 'Equity', parent: '3000' },
    { code: '4000', name: 'Sales Revenue', type: 'Revenue', parent: null },
    { code: '4010', name: 'Product Sales', type: 'Revenue', parent: '4000' },
    { code: '4020', name: 'Service Income', type: 'Revenue', parent: '4000' },
    { code: '5000', name: 'Operating Expenses', type: 'Expense', parent: null },
    { code: '5010', name: 'Cost of Goods Sold', type: 'Expense', parent: '5000' },
    { code: '5020', name: 'Salaries and Wages', type: 'Expense', parent: '5000' },
    { code: '5030', name: 'Utilities', type: 'Expense', parent: '5000' },
    { code: '5040', name: 'Rent', type: 'Expense', parent: '5000' },
  ];

  const accountMap = {};
  for (const acc of accounts) {
    const parentId = acc.parent ? accountMap[acc.parent] : null;
    const created = await prisma.chartOfAccount.upsert({
      where: { accountCode: acc.code },
      update: {},
      create: {
        accountCode: acc.code,
        accountName: acc.name,
        accountType: acc.type,
        ...(parentId ? { parentId } : {}),
      },
    });
    accountMap[acc.code] = created.id;
  }
  console.log('Chart of accounts created');

  // Create units
  console.log('Creating units...');
  const units = [
    { name: 'M3', symbol: 'm³' },
    { name: 'Qtl', symbol: 'qtl' },
    { name: 'Pcs', symbol: 'pcs' },
    { name: 'Kg', symbol: 'kg' },
    { name: 'Ton', symbol: 'ton' },
    { name: 'Liter', symbol: 'ltr' },
    { name: 'Box', symbol: 'box' },
    { name: 'Pack', symbol: 'pack' },
  ];
  for (const unit of units) {
    await prisma.unit.upsert({ where: { name: unit.name }, update: {}, create: unit });
  }
  console.log('Units created');

  // Create categories
  console.log('Creating categories...');
  const categories = ['aggregate', 'cement', 'sand', 'construction materials', 'medical', 'spare parts', 'office supplies'];
  for (const name of categories) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name, type: 'item' } });
  }
  console.log('Categories created');

  console.log('Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
