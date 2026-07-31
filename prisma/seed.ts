import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database seed...");

  try {
    // Hash passwords
    const adminPasswordHash = await bcrypt.hash("admin123", 10);
    const defaultPasswordHash = await bcrypt.hash("password123", 10);

    // Create default admin user
    console.log("Creating admin user...");
    const adminUser = await prisma.user.upsert({
      where: { username: "admin" },
      update: {},
      create: {
        username: "admin",
        email: "admin@samaria.com",
        passwordHash: adminPasswordHash,
        firstName: "Wondemagen",
        lastName: "Kebede",
        role: "ADMIN",
        status: "ACTIVE",
      },
    });
    console.log("Admin user created:", adminUser.id);

    // Create sample users for each role
    console.log("Creating sample users...");

    const procurementUser = await prisma.user.upsert({
      where: { username: "procurement_user" },
      update: {},
      create: {
        username: "procurement_user",
        email: "aynalem@samaria.com",
        passwordHash: defaultPasswordHash,
        firstName: "Aynalem",
        lastName: "Girma",
        role: "PROCUREMENT",
        department: "Procurement",
        status: "ACTIVE",
      },
    });
    console.log("Procurement user created:", procurementUser.id);

    const salesUser = await prisma.user.upsert({
      where: { username: "sales_user" },
      update: {},
      create: {
        username: "sales_user",
        email: "sara@samaria.com",
        passwordHash: defaultPasswordHash,
        firstName: "Sara",
        lastName: "Tesfaye",
        role: "SALES",
        department: "Sales",
        status: "ACTIVE",
      },
    });
    console.log("Sales user created:", salesUser.id);

    const financeUser = await prisma.user.upsert({
      where: { username: "finance_user" },
      update: {},
      create: {
        username: "finance_user",
        email: "natnael@samaria.com",
        passwordHash: defaultPasswordHash,
        firstName: "Natnael",
        lastName: "Dessalegn",
        role: "FINANCE",
        department: "Finance",
        status: "ACTIVE",
      },
    });
    console.log("Finance user created:", financeUser.id);

    const hrUser = await prisma.user.upsert({
      where: { username: "hr_user" },
      update: {},
      create: {
        username: "hr_user",
        email: "yidnek@samaria.com",
        passwordHash: defaultPasswordHash,
        firstName: "Yidnek",
        lastName: "Negesse",
        role: "HR",
        department: "Human Resources",
        status: "ACTIVE",
      },
    });
    console.log("HR user created:", hrUser.id);

    const medicalPharmacistUser = await prisma.user.upsert({
      where: { username: "medical_pharmacist" },
      update: {},
      create: {
        username: "medical_pharmacist",
        email: "abebe@samaria.com",
        passwordHash: defaultPasswordHash,
        firstName: "Abebe",
        lastName: "Abebe",
        role: "MEDICAL_PHARMACIST",
        department: "Medical",
        status: "ACTIVE",
      },
    });
    console.log("Medical Pharmacist user created:", medicalPharmacistUser.id);

    const medicalDruggistUser = await prisma.user.upsert({
      where: { username: "medical_druggist" },
      update: {},
      create: {
        username: "medical_druggist",
        email: "tigist@samaria.com",
        passwordHash: defaultPasswordHash,
        firstName: "Tigist",
        lastName: "Haile",
        role: "MEDICAL_DRUGGIST",
        department: "Medical",
        status: "ACTIVE",
      },
    });
    console.log("Medical Druggist user created:", medicalDruggistUser.id);

    const warehouseUser = await prisma.user.upsert({
      where: { username: "warehouse_user" },
      update: {},
      create: {
        username: "warehouse_user",
        email: "dawit@samaria.com",
        passwordHash: defaultPasswordHash,
        firstName: "Dawit",
        lastName: "Mengistu",
        role: "WAREHOUSE",
        department: "Warehouse",
        status: "ACTIVE",
      },
    });
    console.log("Warehouse user created:", warehouseUser.id);

    // Create company record
    console.log("Creating company record...");
    const existingCompany = await prisma.company.findFirst({ where: { tin: "0090536209" } });
    if (!existingCompany) {
      const company = await prisma.company.create({
        data: {
          name: "Samaria Trading One Member PLC",
          nameAmharic: "ሳማርያ ትሬዲንግ አንድ አባል ኃላ.የተ.የግ.ማ",
          tin: "0090536209",
          phone: "+251974859966",
          phone2: "+251974859966",
          email: "wondeb2@icloud.com",
          website: "www.samariaconstruction.com",
          location: "Addis Ababa",
          regNo: "3233670012",
          withholding: true,
        },
      });
      console.log("Company created:", company.id);
    } else {
      console.log("Company already exists");
    }

    // Create Ethiopian income tax table entries
    console.log("Creating tax table entries...");
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
        where: {
          minIncome_maxIncome: {
            minIncome: entry.minIncome,
            maxIncome: entry.maxIncome,
          },
        },
        update: {},
        create: {
          minIncome: entry.minIncome,
          maxIncome: entry.maxIncome,
          rate: entry.rate,
          deduction: entry.deduction,
          effectiveFrom: new Date("2024-01-01"),
        },
      });
    }
    console.log("Tax table entries created");

    // Create chart of accounts
    console.log("Creating chart of accounts...");

    // Assets
    const asset1000 = await prisma.chartOfAccount.upsert({
      where: { accountCode: "1000" },
      update: {},
      create: {
        accountCode: "1000",
        accountName: "Current Assets",
        accountType: "Asset",
      },
    });

    const asset1010 = await prisma.chartOfAccount.upsert({
      where: { accountCode: "1010" },
      update: {},
      create: {
        accountCode: "1010",
        accountName: "Cash",
        accountType: "Asset",
        parentId: asset1000.id,
      },
    });

    const asset1020 = await prisma.chartOfAccount.upsert({
      where: { accountCode: "1020" },
      update: {},
      create: {
        accountCode: "1020",
        accountName: "Bank Accounts",
        accountType: "Asset",
        parentId: asset1000.id,
      },
    });

    const asset1030 = await prisma.chartOfAccount.upsert({
      where: { accountCode: "1030" },
      update: {},
      create: {
        accountCode: "1030",
        accountName: "Accounts Receivable",
        accountType: "Asset",
        parentId: asset1000.id,
      },
    });

    const asset1040 = await prisma.chartOfAccount.upsert({
      where: { accountCode: "1040" },
      update: {},
      create: {
        accountCode: "1040",
        accountName: "Inventory",
        accountType: "Asset",
        parentId: asset1000.id,
      },
    });

    // Liabilities
    const liability2000 = await prisma.chartOfAccount.upsert({
      where: { accountCode: "2000" },
      update: {},
      create: {
        accountCode: "2000",
        accountName: "Current Liabilities",
        accountType: "Liability",
      },
    });

    const liability2010 = await prisma.chartOfAccount.upsert({
      where: { accountCode: "2010" },
      update: {},
      create: {
        accountCode: "2010",
        accountName: "Accounts Payable",
        accountType: "Liability",
        parentId: liability2000.id,
      },
    });

    const liability2020 = await prisma.chartOfAccount.upsert({
      where: { accountCode: "2020" },
      update: {},
      create: {
        accountCode: "2020",
        accountName: "Sales Tax Payable",
        accountType: "Liability",
        parentId: liability2000.id,
      },
    });

    // Equity
    const equity3000 = await prisma.chartOfAccount.upsert({
      where: { accountCode: "3000" },
      update: {},
      create: {
        accountCode: "3000",
        accountName: "Equity",
        accountType: "Equity",
      },
    });

    const equity3010 = await prisma.chartOfAccount.upsert({
      where: { accountCode: "3010" },
      update: {},
      create: {
        accountCode: "3010",
        accountName: "Capital Stock",
        accountType: "Equity",
        parentId: equity3000.id,
      },
    });

    const equity3020 = await prisma.chartOfAccount.upsert({
      where: { accountCode: "3020" },
      update: {},
      create: {
        accountCode: "3020",
        accountName: "Retained Earnings",
        accountType: "Equity",
        parentId: equity3000.id,
      },
    });

    // Revenue
    const revenue4000 = await prisma.chartOfAccount.upsert({
      where: { accountCode: "4000" },
      update: {},
      create: {
        accountCode: "4000",
        accountName: "Sales Revenue",
        accountType: "Revenue",
      },
    });

    const revenue4010 = await prisma.chartOfAccount.upsert({
      where: { accountCode: "4010" },
      update: {},
      create: {
        accountCode: "4010",
        accountName: "Product Sales",
        accountType: "Revenue",
        parentId: revenue4000.id,
      },
    });

    const revenue4020 = await prisma.chartOfAccount.upsert({
      where: { accountCode: "4020" },
      update: {},
      create: {
        accountCode: "4020",
        accountName: "Service Income",
        accountType: "Revenue",
        parentId: revenue4000.id,
      },
    });

    // Expenses
    const expense5000 = await prisma.chartOfAccount.upsert({
      where: { accountCode: "5000" },
      update: {},
      create: {
        accountCode: "5000",
        accountName: "Operating Expenses",
        accountType: "Expense",
      },
    });

    const expense5010 = await prisma.chartOfAccount.upsert({
      where: { accountCode: "5010" },
      update: {},
      create: {
        accountCode: "5010",
        accountName: "Cost of Goods Sold",
        accountType: "Expense",
        parentId: expense5000.id,
      },
    });

    const expense5020 = await prisma.chartOfAccount.upsert({
      where: { accountCode: "5020" },
      update: {},
      create: {
        accountCode: "5020",
        accountName: "Salaries and Wages",
        accountType: "Expense",
        parentId: expense5000.id,
      },
    });

    const expense5030 = await prisma.chartOfAccount.upsert({
      where: { accountCode: "5030" },
      update: {},
      create: {
        accountCode: "5030",
        accountName: "Utilities",
        accountType: "Expense",
        parentId: expense5000.id,
      },
    });

    const expense5040 = await prisma.chartOfAccount.upsert({
      where: { accountCode: "5040" },
      update: {},
      create: {
        accountCode: "5040",
        accountName: "Rent",
        accountType: "Expense",
        parentId: expense5000.id,
      },
    });

    console.log("Chart of accounts created");

    // Create units
    console.log("Creating units...");
    const units = [
      { name: "M3", symbol: "m³" },
      { name: "Qtl", symbol: "qtl" },
      { name: "Pcs", symbol: "pcs" },
      { name: "Kg", symbol: "kg" },
      { name: "Ton", symbol: "ton" },
      { name: "Liter", symbol: "ltr" },
      { name: "Box", symbol: "box" },
      { name: "Pack", symbol: "pack" },
    ];

    for (const unit of units) {
      await prisma.unit.upsert({
        where: { name: unit.name },
        update: {},
        create: {
          name: unit.name,
          symbol: unit.symbol,
        },
      });
    }
    console.log("Units created");

    // Create categories
    console.log("Creating categories...");
    const categories = [
      "aggregate",
      "cement",
      "sand",
      "construction materials",
      "medical",
      "spare parts",
      "office supplies",
    ];

    for (const categoryName of categories) {
      await prisma.category.upsert({
        where: { name: categoryName },
        update: {},
        create: {
          name: categoryName,
          type: "item",
        },
      });
    }
    console.log("Categories created");

    console.log("Database seed completed successfully!");
  } catch (error) {
    console.error("Error during seed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
