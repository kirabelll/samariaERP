import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

interface OldCustomer {
  id: number;
  customer_type: string;
  company_name: string;
  firstname: string;
  lastname: string;
  tin_no: string;
  withholding: string;
  withhold: string;
  phone_no: string;
  email: string;
  contact_person: string;
  office_location: string;
  status: string;
  registered_by: string;
  approved_by: string;
}

interface OldSupplier {
  id: number;
  supplier_name: string;
  supplier_tin: string;
  supplier_category: string;
  contact_person: string;
  phone_number: string;
  status: string;
  address: string;
  registered_by: string;
}

interface OldTransporter {
  id: number;
  transporter_type: string;
  company_name: string;
  firstname: string;
  lastname: string;
  tin_no: string;
  withholding: string;
  withhold: string;
  phone_no: string;
  email: string;
  contact_person: string;
  office_location: string;
  status: string;
  registered_by: string;
}

interface OldItem {
  id: number;
  item: string;
  item_category: string;
  unit: string;
  registered_by: string;
  status: string;
  item_type: string;
}

interface OldUser {
  id: number;
  username: string;
  password: string;
  email: string;
  user_type: string;
  first_name: string;
  last_name: string;
  phone: string;
  status: string;
}

interface OldCompany {
  id: number;
  company_name: string;
  tin: string;
  phone_1: string;
  phone_2: string;
  address: string;
  email: string;
  website: string;
  registration_no: string;
}

interface OldCoupon {
  id: number;
  coupon_no: string;
  factory_id: number;
  purchase_id: number;
  tonnage: number;
  status: string;
  collected_date: string;
  collected_by: string;
  handed_over_to: string;
  handover_date: string;
  handover_proof: string;
  used_date: string;
  return_date: string;
  notes: string;
}

interface OldDelivery {
  id: number;
  delivery_no: string;
  customer_id: number;
  item_id: number;
  quantity: number;
  driver_name: string;
  truck_plate_no: string;
  delivered_to: string;
  delivery_date: string;
  status: string;
  registered_by: string;
}

interface OldTransaction {
  id: number;
  transaction_type: string;
  amount: number;
  transaction_date: string;
  reference_no: string;
  description: string;
  status: string;
  remarks: string;
  customer_id: number;
  related_id: number;
}

function readSqlFile(filePath: string): string {
  return fs.readFileSync(filePath, "utf-8");
}

function parseInsertStatements(
  tableName: string,
  sql: string
): Record<string, any>[] {
  const regex = new RegExp(
    `INSERT INTO \`${tableName}\`[\\s\\S]*?VALUES\\s*([\\s\\S]*?);`,
    "g"
  );
  const matches = sql.match(regex);

  if (!matches) return [];

  const results: Record<string, any>[] = [];

  for (const match of matches) {
    // Extract the VALUES content
    const valuesMatch = match.match(/VALUES\s*([\s\S]+);/);
    if (!valuesMatch) continue;

    const valuesStr = valuesMatch[1];

    // Extract column names from the INSERT statement
    const columnsMatch = match.match(/`(\w+)`\s*\(/);
    if (!columnsMatch) continue;

    // Find the column list - more robust parsing
    const columnListMatch = match.match(/\(([^)]+)\)\s*VALUES/);
    if (!columnListMatch) continue;

    const columns = columnListMatch[1]
      .split(",")
      .map((col) => col.trim().replace(/`/g, ""));

    // Parse individual value sets
    const valueSetRegex = /\(([^)]*(?:\([^)]*\)[^)]*)*)\)/g;
    let valueMatch;

    while ((valueMatch = valueSetRegex.exec(valuesStr)) !== null) {
      const valuesContent = valueMatch[1];
      const values = parseValues(valuesContent);

      if (values.length === columns.length) {
        const record: Record<string, any> = {};
        columns.forEach((col, idx) => {
          record[col] = values[idx];
        });
        results.push(record);
      }
    }
  }

  return results;
}

function parseValues(valuesStr: string): (string | null)[] {
  const values: (string | null)[] = [];
  let current = "";
  let inQuotes = false;
  let quoteChar = "";

  for (let i = 0; i < valuesStr.length; i++) {
    const char = valuesStr[i];
    const nextChar = valuesStr[i + 1];

    if ((char === "'" || char === '"') && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuotes) {
      if (nextChar === quoteChar) {
        current += char;
        i++;
      } else {
        inQuotes = false;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current.trim() === "" ? null : current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim() === "" ? null : current.trim());
  return values;
}

function mapCustomer(oldRow: OldCustomer) {
  const withholdRate = oldRow.withhold ? parseFloat(oldRow.withhold) : 2;
  const isCompany = oldRow.customer_type?.toLowerCase() === "company";

  return {
    code: `C-${oldRow.id}`,
    customerType: isCompany ? "COMPANY" : "INDIVIDUAL",
    companyName: oldRow.company_name || "Unknown",
    firstName: !isCompany ? oldRow.firstname : null,
    lastName: !isCompany ? oldRow.lastname : null,
    tin: oldRow.tin_no || null,
    phone: oldRow.phone_no || "",
    email: oldRow.email || null,
    contactPerson: oldRow.contact_person || null,
    location: oldRow.office_location || null,
    withholding: oldRow.withholding === "yes" || oldRow.withholding === "1",
    withholdRate: withholdRate,
    status: oldRow.status || "Active",
    registeredBy: oldRow.registered_by || null,
    approvedBy: oldRow.approved_by || null,
    division: "CONSTRUCTION",
  };
}

function mapSupplier(oldRow: OldSupplier) {
  return {
    code: `S-${oldRow.id}`,
    supplierType: "company",
    companyName: oldRow.supplier_name || "Unknown",
    tin: oldRow.supplier_tin || null,
    phone: oldRow.phone_number || null,
    contactPerson: oldRow.contact_person || null,
    location: oldRow.address || null,
    status: oldRow.status || "Active",
    registeredBy: oldRow.registered_by || null,
  };
}

function mapTransporter(oldRow: OldTransporter) {
  const withhold = oldRow.withhold ? parseFloat(oldRow.withhold) : 2;
  const isCompany = oldRow.transporter_type?.toLowerCase() === "company";

  return {
    code: `T-${oldRow.id}`,
    transporterType: oldRow.transporter_type || "company",
    companyName: oldRow.company_name || "Unknown",
    firstName: !isCompany ? oldRow.firstname : null,
    lastName: !isCompany ? oldRow.lastname : null,
    tin: oldRow.tin_no || null,
    phone: oldRow.phone_no || null,
    email: oldRow.email || null,
    contactPerson: oldRow.contact_person || null,
    location: oldRow.office_location || null,
    withholding: oldRow.withholding === "yes" || oldRow.withholding === "1",
    withholdRate: withhold,
    status: oldRow.status || "Active",
    registeredBy: oldRow.registered_by || null,
  };
}

function mapItem(oldRow: OldItem) {
  return {
    code: `I-${oldRow.id}`,
    name: oldRow.item || "Unknown",
    category: oldRow.item_category || "General",
    unit: oldRow.unit || "Pcs",
    itemType: oldRow.item_type || "sales",
    division: "CONSTRUCTION",
    status: oldRow.status || "Active",
    registeredBy: oldRow.registered_by || null,
  };
}

async function migrateCustomers(sqlContent: string) {
  console.log("Migrating customers...");
  const customers = parseInsertStatements("sam_customer", sqlContent) as OldCustomer[];
  console.log(`Found ${customers.length} customers to migrate`);

  for (const customer of customers) {
    try {
      const mapped = mapCustomer(customer);
      await prisma.customer.upsert({
        where: { code: mapped.code },
        update: {},
        create: {
          ...mapped,
          createdAt: new Date(),
        },
      });
    } catch (error) {
      console.error(`Error migrating customer ${customer.id}:`, error);
    }
  }
  console.log("Customers migration completed");
}

async function migrateSuppliers(sqlContent: string) {
  console.log("Migrating suppliers...");
  const suppliers = parseInsertStatements("sam_supplier", sqlContent) as OldSupplier[];
  console.log(`Found ${suppliers.length} suppliers to migrate`);

  for (const supplier of suppliers) {
    try {
      const mapped = mapSupplier(supplier);
      await prisma.supplier.upsert({
        where: { code: mapped.code },
        update: {},
        create: {
          ...mapped,
          createdAt: new Date(),
        },
      });
    } catch (error) {
      console.error(`Error migrating supplier ${supplier.id}:`, error);
    }
  }
  console.log("Suppliers migration completed");
}

async function migrateTransporters(sqlContent: string) {
  console.log("Migrating transporters...");
  const transporters = parseInsertStatements(
    "sam_transporter",
    sqlContent
  ) as OldTransporter[];
  console.log(`Found ${transporters.length} transporters to migrate`);

  for (const transporter of transporters) {
    try {
      const mapped = mapTransporter(transporter);
      await prisma.transporter.upsert({
        where: { code: mapped.code },
        update: {},
        create: {
          ...mapped,
          createdAt: new Date(),
        },
      });
    } catch (error) {
      console.error(`Error migrating transporter ${transporter.id}:`, error);
    }
  }
  console.log("Transporters migration completed");
}

async function migrateItems(sqlContent: string) {
  console.log("Migrating items...");
  const items = parseInsertStatements("sam_item", sqlContent) as OldItem[];
  console.log(`Found ${items.length} items to migrate`);

  for (const item of items) {
    try {
      const mapped = mapItem(item);
      await prisma.item.upsert({
        where: { code: mapped.code },
        update: {},
        create: {
          ...mapped,
          createdAt: new Date(),
        },
      });
    } catch (error) {
      console.error(`Error migrating item ${item.id}:`, error);
    }
  }
  console.log("Items migration completed");
}

async function main() {
  console.log("Starting MySQL data migration...");

  try {
    const sqlFilePath =
      "/sessions/vibrant-busy-meitner/mnt/Samaria_trading/samariac_samaria_update.sql";

    if (!fs.existsSync(sqlFilePath)) {
      console.error(`SQL file not found at ${sqlFilePath}`);
      return;
    }

    const sqlContent = readSqlFile(sqlFilePath);
    console.log("SQL file loaded successfully");

    // Migrate in order to respect foreign key constraints
    await migrateCustomers(sqlContent);
    await migrateSuppliers(sqlContent);
    await migrateTransporters(sqlContent);
    await migrateItems(sqlContent);

    console.log("MySQL data migration completed successfully!");
  } catch (error) {
    console.error("Error during migration:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
