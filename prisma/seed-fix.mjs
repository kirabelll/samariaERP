// Fix existing CUID codes + Add sample data for all modules
// Run with: node prisma/seed-fix.mjs

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function generateCode(prefix, seq) {
  return `${prefix}-${String(seq).padStart(6, '0')}`;
}

async function fixExistingCodes() {
  console.log('\n=== Fixing existing record codes ===\n');

  // Fix Customers
  const customers = await prisma.customer.findMany({ orderBy: { createdAt: 'asc' } });
  for (let i = 0; i < customers.length; i++) {
    const code = generateCode('CUS', i + 1);
    if (customers[i].code !== code) {
      await prisma.customer.update({ where: { id: customers[i].id }, data: { code } });
      console.log(`  Customer "${customers[i].companyName}" code: ${customers[i].code} → ${code}`);
    }
  }

  // Fix Suppliers
  const suppliers = await prisma.supplier.findMany({ orderBy: { createdAt: 'asc' } });
  for (let i = 0; i < suppliers.length; i++) {
    const code = generateCode('SUP', i + 1);
    if (suppliers[i].code !== code) {
      await prisma.supplier.update({ where: { id: suppliers[i].id }, data: { code } });
      console.log(`  Supplier "${suppliers[i].companyName}" code: ${suppliers[i].code} → ${code}`);
    }
  }

  // Fix Transporters
  const transporters = await prisma.transporter.findMany({ orderBy: { createdAt: 'asc' } });
  for (let i = 0; i < transporters.length; i++) {
    const code = generateCode('TRA', i + 1);
    if (transporters[i].code !== code) {
      await prisma.transporter.update({ where: { id: transporters[i].id }, data: { code } });
      console.log(`  Transporter "${transporters[i].companyName}" code: ${transporters[i].code} → ${code}`);
    }
  }

  // Fix Factories
  const factories = await prisma.factory.findMany({ orderBy: { createdAt: 'asc' } });
  for (let i = 0; i < factories.length; i++) {
    const code = generateCode('FAC', i + 1);
    if (factories[i].code !== code) {
      await prisma.factory.update({ where: { id: factories[i].id }, data: { code } });
      console.log(`  Factory "${factories[i].name}" code: ${factories[i].code} → ${code}`);
    }
  }

  console.log('\nCode fix complete!\n');
}

async function seedSampleData() {
  console.log('\n=== Adding sample data ===\n');

  // ---- CUSTOMERS ----
  const existingCustomers = await prisma.customer.count();
  const sampleCustomers = [
    { companyName: 'Ethio Construction PLC', customerType: 'COMPANY', tin: '0012345678', phone: '+251911223344', email: 'info@ethioconstruction.et', contactPerson: 'Tadesse Bekele', division: 'CONSTRUCTION', creditLimit: 500000, creditTermDays: 30, location: 'Addis Ababa' },
    { companyName: 'Anbessa Building Materials', customerType: 'COMPANY', tin: '0023456789', phone: '+251922334455', email: 'sales@anbessa.et', contactPerson: 'Meron Alemu', division: 'CONSTRUCTION', creditLimit: 300000, creditTermDays: 15, location: 'Hawassa' },
    { companyName: 'Unity Medical Center', customerType: 'COMPANY', tin: '0034567890', phone: '+251933445566', email: 'procurement@unitymedical.et', contactPerson: 'Dr. Hanna Tesfaye', division: 'MEDICAL', creditLimit: 1000000, creditTermDays: 45, location: 'Addis Ababa' },
    { companyName: 'Bole International Hospital', customerType: 'COMPANY', tin: '0045678901', phone: '+251944556677', email: 'admin@bolehospital.et', contactPerson: 'Alemayehu Desta', division: 'MEDICAL', creditLimit: 750000, creditTermDays: 30, location: 'Addis Ababa' },
    { companyName: 'Habesha Real Estate', customerType: 'COMPANY', tin: '0056789012', phone: '+251955667788', email: 'info@habeshareal.et', contactPerson: 'Selamawit Mulugeta', division: 'CONSTRUCTION', creditLimit: 2000000, creditTermDays: 60, location: 'Adama' },
  ];

  for (let i = 0; i < sampleCustomers.length; i++) {
    const code = generateCode('CUS', existingCustomers + i + 1);
    const existing = await prisma.customer.findFirst({ where: { companyName: sampleCustomers[i].companyName } });
    if (!existing) {
      await prisma.customer.create({
        data: { code, status: 'Active', withholding: true, withholdRate: 2, ...sampleCustomers[i] },
      });
      console.log(`  Customer: ${code} - ${sampleCustomers[i].companyName}`);
    }
  }

  // ---- SUPPLIERS ----
  const existingSuppliers = await prisma.supplier.count();
  const sampleSuppliers = [
    { companyName: 'Derba MIDROC Cement', supplierType: 'company', tin: '0067890123', phone: '+251966778899', email: 'sales@derbacement.et', contactPerson: 'Girma Worku', location: 'Derba', category: 'Construction', banks: [{ bankName: 'Commercial Bank of Ethiopia', accountNo: '1000234567890', accountName: 'Derba MIDROC Cement PLC' }] },
    { companyName: 'Habesha Cement', supplierType: 'company', tin: '0078901234', phone: '+251977889900', email: 'info@habeshacement.et', contactPerson: 'Kebede Abera', location: 'Holeta', category: 'Construction', banks: [{ bankName: 'Awash Bank', accountNo: '2000345678901', accountName: 'Habesha Cement SC' }] },
    { companyName: 'Addis Medical Supply', supplierType: 'company', tin: '0089012345', phone: '+251988990011', email: 'supply@addismedical.et', contactPerson: 'Meskerem Hailu', location: 'Addis Ababa', category: 'Medicine/Medical', banks: [{ bankName: 'Bank of Abyssinia', accountNo: '3000456789012', accountName: 'Addis Medical Supply PLC' }, { bankName: 'Dashen Bank', accountNo: '4000567890123', accountName: 'Addis Medical Supply PLC' }] },
    { companyName: 'Ethio Aggregate PLC', supplierType: 'company', tin: '0090123456', phone: '+251999001122', email: 'info@ethioaggregate.et', contactPerson: 'Worku Legesse', location: 'Sululta', category: 'Construction', banks: [{ bankName: 'Oromia International Bank', accountNo: '5000678901234', accountName: 'Ethio Aggregate PLC' }] },
    { companyName: 'National Pharma Import', supplierType: 'company', tin: '0001234567', phone: '+251911112233', email: 'import@nationalpharma.et', contactPerson: 'Frehiwot Arega', location: 'Addis Ababa', category: 'Medicine/Medical', banks: [{ bankName: 'Commercial Bank of Ethiopia', accountNo: '6000789012345', accountName: 'National Pharma Import PLC' }] },
  ];

  for (let i = 0; i < sampleSuppliers.length; i++) {
    const code = generateCode('SUP', existingSuppliers + i + 1);
    const { banks, ...supplierData } = sampleSuppliers[i];
    const existing = await prisma.supplier.findFirst({ where: { companyName: supplierData.companyName } });
    if (!existing) {
      const supplier = await prisma.supplier.create({
        data: { code, status: 'Active', withholding: true, withholdRate: 2, ...supplierData },
      });
      // Add bank accounts
      if (banks && banks.length > 0) {
        for (let j = 0; j < banks.length; j++) {
          await prisma.supplierBank.create({
            data: { supplierId: supplier.id, ...banks[j], isDefault: j === 0 },
          });
        }
      }
      console.log(`  Supplier: ${code} - ${supplierData.companyName} (${banks.length} bank accounts)`);
    }
  }

  // ---- FACTORIES ----
  const existingFactories = await prisma.factory.count();
  const sampleFactories = [
    { name: 'Derba Cement Factory', factoryType: 'cement', suppliedMaterial: 'OPC, PPC Cement', location: 'Derba, North Shewa', phone: '+251116678899', contactPerson: 'Ato Berhanu', useCoupons: true, weighbridgeReq: true },
    { name: 'National Cement Factory', factoryType: 'cement', suppliedMaterial: 'OPC Cement 42.5R', location: 'Dire Dawa', phone: '+251254112233', contactPerson: 'Ato Mesfin', useCoupons: true, weighbridgeReq: true },
    { name: 'Sululta Aggregate Plant', factoryType: 'aggregate', suppliedMaterial: 'Crushed Stone, Base Course', location: 'Sululta', phone: '+251116445566', contactPerson: 'Ato Tesfaye', useCoupons: false, weighbridgeReq: true },
    { name: 'Sendafa Sand Mine', factoryType: 'sand', suppliedMaterial: 'River Sand, Manufactured Sand', location: 'Sendafa', phone: '+251116556677', contactPerson: 'Ato Daniel', useCoupons: false, weighbridgeReq: true },
    { name: 'Mugher Cement Enterprise', factoryType: 'cement', suppliedMaterial: 'PPC Cement', location: 'Mugher, West Shewa', phone: '+251116667788', contactPerson: 'Ato Solomon', useCoupons: true, weighbridgeReq: true },
  ];

  for (let i = 0; i < sampleFactories.length; i++) {
    const code = generateCode('FAC', existingFactories + i + 1);
    const existing = await prisma.factory.findFirst({ where: { name: sampleFactories[i].name } });
    if (!existing) {
      await prisma.factory.create({
        data: { code, status: 'Active', ...sampleFactories[i] },
      });
      console.log(`  Factory: ${code} - ${sampleFactories[i].name}`);
    }
  }

  // ---- TRANSPORTERS with TRUCKS ----
  const existingTransporters = await prisma.transporter.count();
  const sampleTransporters = [
    {
      companyName: 'Selam Transport PLC', transporterType: 'company', tin: '0011223344', phone: '+251911334455',
      email: 'dispatch@selamtransport.et', contactPerson: 'Assefa Biru', location: 'Addis Ababa',
      trucks: [
        { plateNo: '3-AA-12345', truckType: 'Trailer', capacity: 40, capacityUnit: 'm3' },
        { plateNo: '3-AA-12346', truckType: 'Trailer', capacity: 40, capacityUnit: 'm3' },
        { plateNo: '3-AA-12347', truckType: 'Truck', capacity: 12, capacityUnit: 'm3' },
      ],
    },
    {
      companyName: 'Abay Logistics', transporterType: 'company', tin: '0022334455', phone: '+251922445566',
      email: 'info@abaylogistics.et', contactPerson: 'Mulugeta Abebe', location: 'Addis Ababa',
      trucks: [
        { plateNo: '3-OR-54321', truckType: 'Trailer', capacity: 350, capacityUnit: 'quintal' },
        { plateNo: '3-OR-54322', truckType: 'Truck', capacity: 120, capacityUnit: 'quintal' },
      ],
    },
    {
      companyName: 'Rift Valley Transport', transporterType: 'company', tin: '0033445566', phone: '+251933556677',
      email: 'fleet@riftvalley.et', contactPerson: 'Ibrahim Mohammed', location: 'Adama',
      trucks: [
        { plateNo: '4-AD-11111', truckType: 'Trailer', capacity: 30, capacityUnit: 'ton' },
        { plateNo: '4-AD-11112', truckType: 'Truck', capacity: 10, capacityUnit: 'ton' },
        { plateNo: '4-AD-11113', truckType: 'Pickup', capacity: 3, capacityUnit: 'ton' },
      ],
    },
    {
      companyName: 'Dawit Haulage', transporterType: 'individual', tin: '0044556677', phone: '+251944667788',
      email: 'dawit.haul@gmail.com', contactPerson: 'Dawit Teshome', location: 'Bishoftu',
      trucks: [
        { plateNo: '3-AA-99988', truckType: 'Truck', capacity: 15, capacityUnit: 'm3' },
      ],
    },
    {
      companyName: 'Merkato Express Delivery', transporterType: 'company', tin: '0055667788', phone: '+251955778899',
      email: 'ops@merkatoexpress.et', contactPerson: 'Fitsum Gebre', location: 'Addis Ababa',
      trucks: [
        { plateNo: '3-AA-77766', truckType: 'Pickup', capacity: 50, capacityUnit: 'quintal' },
        { plateNo: '3-AA-77767', truckType: 'Truck', capacity: 100, capacityUnit: 'quintal' },
      ],
    },
  ];

  const transporterIds = [];
  for (let i = 0; i < sampleTransporters.length; i++) {
    const code = generateCode('TRA', existingTransporters + i + 1);
    const { trucks, ...transporterData } = sampleTransporters[i];
    const existing = await prisma.transporter.findFirst({ where: { companyName: transporterData.companyName } });
    if (!existing) {
      const transporter = await prisma.transporter.create({
        data: { code, status: 'Active', withholding: true, withholdRate: 2, ...transporterData },
      });
      transporterIds.push(transporter.id);
      // Add trucks
      for (const truck of trucks) {
        await prisma.truck.create({
          data: { transporterId: transporter.id, status: 'Active', ...truck },
        });
      }
      console.log(`  Transporter: ${code} - ${transporterData.companyName} (${trucks.length} trucks)`);
    } else {
      transporterIds.push(existing.id);
    }
  }

  // ---- TRANSPORT AGREEMENTS ----
  const existingAgreements = await prisma.transporterAgreement.count();
  if (existingAgreements === 0 && transporterIds.length >= 3) {
    const agreements = [
      {
        transporterId: transporterIds[0],
        productType: 'aggregate',
        validFrom: new Date('2025-01-01'),
        validTo: new Date('2025-12-31'),
        terms: 'Standard delivery within Addis Ababa. Payment net 30.',
        pricing: [
          { truckCategory: 'Trailer', holdingCapacity: 40, capacityUnit: 'm3', unitPrice: 450 },
          { truckCategory: 'Truck', holdingCapacity: 12, capacityUnit: 'm3', unitPrice: 500 },
        ],
      },
      {
        transporterId: transporterIds[1],
        productType: 'cement',
        validFrom: new Date('2025-01-01'),
        validTo: new Date('2025-06-30'),
        terms: 'Cement transport from Derba to Addis Ababa sites.',
        pricing: [
          { truckCategory: 'Trailer', holdingCapacity: 350, capacityUnit: 'quintal', unitPrice: 15 },
          { truckCategory: 'Truck', holdingCapacity: 120, capacityUnit: 'quintal', unitPrice: 18 },
        ],
      },
      {
        transporterId: transporterIds[2],
        productType: 'sand',
        validFrom: new Date('2025-03-01'),
        validTo: new Date('2026-02-28'),
        terms: 'Sand transport from Sendafa quarry. Weighbridge ticket required.',
        pricing: [
          { truckCategory: 'Trailer', holdingCapacity: 30, capacityUnit: 'ton', unitPrice: 600 },
          { truckCategory: 'Truck', holdingCapacity: 10, capacityUnit: 'ton', unitPrice: 700 },
          { truckCategory: 'Pickup', holdingCapacity: 3, capacityUnit: 'ton', unitPrice: 900 },
        ],
      },
    ];

    for (let i = 0; i < agreements.length; i++) {
      const agreementNo = `TA-${String(existingAgreements + i + 1).padStart(6, '0')}`;
      const { pricing, ...agreementData } = agreements[i];
      const agreement = await prisma.transporterAgreement.create({
        data: { agreementNo, status: 'Active', ...agreementData },
      });
      for (const item of pricing) {
        await prisma.transporterPricing.create({
          data: {
            agreementId: agreement.id,
            truckCategory: item.truckCategory,
            holdingCapacity: item.holdingCapacity,
            capacityUnit: item.capacityUnit,
            unitPrice: item.unitPrice,
            totalPrice: item.holdingCapacity * item.unitPrice,
          },
        });
      }
      console.log(`  Agreement: ${agreementNo} - ${agreements[i].productType} (${pricing.length} pricing items)`);
    }
  }

  console.log('\nSample data seeding complete!\n');
}

async function seedItems() {
  console.log('\n=== Adding Items/Products ===\n');

  const existingItems = await prisma.item.count();
  if (existingItems > 0) {
    console.log('  Items already exist, skipping...');
    return [];
  }

  const sampleItems = [
    // Construction - Aggregate
    { code: 'ITEM-000001', name: 'Crushed Stone 20mm', nameAmharic: 'ድንጋይ 20ሚሜ', category: 'Aggregate', unit: 'm3', itemType: 'sales', division: 'CONSTRUCTION', batchTracked: false, expiryTracked: false, manufacturer: 'Sululta Aggregate Plant', status: 'Active' },
    { code: 'ITEM-000002', name: 'Base Course Material', nameAmharic: 'ቤዝ ኮርስ', category: 'Aggregate', unit: 'm3', itemType: 'sales', division: 'CONSTRUCTION', batchTracked: false, expiryTracked: false, manufacturer: 'Sululta Aggregate Plant', status: 'Active' },
    { code: 'ITEM-000003', name: 'River Sand', nameAmharic: 'ሸለቃ ሮጥ', category: 'Sand', unit: 'm3', itemType: 'sales', division: 'CONSTRUCTION', batchTracked: false, expiryTracked: false, manufacturer: 'Sendafa Sand Mine', status: 'Active' },

    // Construction - Cement
    { code: 'ITEM-000004', name: 'OPC Cement 42.5R', nameAmharic: 'OPC ሲሚንት', category: 'Cement', unit: 'ton', itemType: 'sales', division: 'CONSTRUCTION', batchTracked: false, expiryTracked: false, manufacturer: 'Derba Cement', status: 'Active' },
    { code: 'ITEM-000005', name: 'PPC Cement', nameAmharic: 'PPC ሲሚንት', category: 'Cement', unit: 'ton', itemType: 'sales', division: 'CONSTRUCTION', batchTracked: false, expiryTracked: false, manufacturer: 'Habesha Cement', status: 'Active' },

    // Medical - Drugs (batch & expiry tracked)
    { code: 'ITEM-000006', name: 'Amoxicillin 500mg Capsule', nameAmharic: 'አሞክስኢሊን', category: 'Antibiotic', unit: 'box', itemType: 'medical', division: 'MEDICAL', batchTracked: true, expiryTracked: true, manufacturer: 'National Pharma Import', genericName: 'Amoxicillin', strength: '500mg', dosageForm: 'Capsule', status: 'Active' },
    { code: 'ITEM-000007', name: 'Paracetamol 500mg Tablet', nameAmharic: 'ፓራሴታሞል', category: 'Analgesic', unit: 'box', itemType: 'medical', division: 'MEDICAL', batchTracked: true, expiryTracked: true, manufacturer: 'National Pharma Import', genericName: 'Paracetamol', strength: '500mg', dosageForm: 'Tablet', status: 'Active' },
    { code: 'ITEM-000008', name: 'Metformin 500mg Tablet', nameAmharic: 'ሜትፎርሚን', category: 'Antidiabetic', unit: 'box', itemType: 'medical', division: 'MEDICAL', batchTracked: true, expiryTracked: true, manufacturer: 'Addis Medical Supply', genericName: 'Metformin', strength: '500mg', dosageForm: 'Tablet', status: 'Active' },
    { code: 'ITEM-000009', name: 'Ibuprofen 400mg Tablet', nameAmharic: 'አይቡፕሮፌን', category: 'NSAID', unit: 'box', itemType: 'medical', division: 'MEDICAL', batchTracked: true, expiryTracked: true, manufacturer: 'National Pharma Import', genericName: 'Ibuprofen', strength: '400mg', dosageForm: 'Tablet', status: 'Active' },
    { code: 'ITEM-000010', name: 'Lisinopril 10mg Tablet', nameAmharic: 'ሊሲኖፕሪል', category: 'Antihypertensive', unit: 'box', itemType: 'medical', division: 'MEDICAL', batchTracked: true, expiryTracked: true, manufacturer: 'Addis Medical Supply', genericName: 'Lisinopril', strength: '10mg', dosageForm: 'Tablet', status: 'Active' },
    { code: 'ITEM-000011', name: 'Vitamin C 500mg Tablet', nameAmharic: 'ቪታሚን ሲ', category: 'Vitamin', unit: 'box', itemType: 'medical', division: 'MEDICAL', batchTracked: true, expiryTracked: true, manufacturer: 'National Pharma Import', genericName: 'Ascorbic Acid', strength: '500mg', dosageForm: 'Tablet', status: 'Active' },

    // General Supplies
    { code: 'ITEM-000012', name: 'Safety Gloves (Latex) - Box 100', nameAmharic: 'ጋንት ደም - 100', category: 'PPE', unit: 'box', itemType: 'internal', division: 'CONSTRUCTION', batchTracked: false, expiryTracked: false, manufacturer: 'Local Supplier', status: 'Active' },
  ];

  const itemIds = [];
  for (const item of sampleItems) {
    const existing = await prisma.item.findFirst({ where: { code: item.code } });
    if (!existing) {
      const created = await prisma.item.create({ data: item });
      itemIds.push(created.id);
      console.log(`  Item: ${item.code} - ${item.name}`);
    } else {
      itemIds.push(existing.id);
    }
  }
  return itemIds;
}

async function seedEmployees() {
  console.log('\n=== Adding Employees ===\n');

  const existingEmployees = await prisma.employee.count();
  if (existingEmployees > 0) {
    console.log('  Employees already exist, skipping...');
    return [];
  }

  const sampleEmployees = [
    { employeeNo: 'EMP-00001', firstName: 'Tadesse', middleName: 'Bekele', lastName: 'Mengesha', firstNameAm: 'ታደሰ', lastNameAm: 'መንግሻ', gender: 'Male', dateOfBirth: new Date('1985-05-15'), phone: '+251911223344', email: 'tadesse.mengesha@samaria.et', address: 'Addis Ababa', department: 'Sales', position: 'Sales Manager', hireDate: new Date('2020-01-15'), employmentType: 'Permanent', baseSalary: 45000, bankAccount: '1000234567890', bankName: 'Commercial Bank of Ethiopia', tin: '0012345678', status: 'Active' },
    { employeeNo: 'EMP-00002', firstName: 'Meron', middleName: 'Alemu', lastName: 'Worku', firstNameAm: 'መሮን', lastNameAm: 'ወርቁ', gender: 'Female', dateOfBirth: new Date('1990-08-22'), phone: '+251922334455', email: 'meron.worku@samaria.et', address: 'Addis Ababa', department: 'Medical', position: 'Pharmacist', hireDate: new Date('2021-03-10'), employmentType: 'Permanent', baseSalary: 50000, bankAccount: '2000345678901', bankName: 'Awash Bank', tin: '0023456789', status: 'Active' },
    { employeeNo: 'EMP-00003', firstName: 'Kebede', middleName: 'Abera', lastName: 'Hailu', firstNameAm: 'ከበደ', lastNameAm: 'ሃይሉ', gender: 'Male', dateOfBirth: new Date('1988-03-10'), phone: '+251933445566', email: 'kebede.hailu@samaria.et', address: 'Hawassa', department: 'Warehouse', position: 'Warehouse Manager', hireDate: new Date('2019-06-01'), employmentType: 'Permanent', baseSalary: 42000, bankAccount: '3000456789012', bankName: 'Bank of Abyssinia', tin: '0034567890', status: 'Active' },
    { employeeNo: 'EMP-00004', firstName: 'Alemayehu', middleName: 'Desta', lastName: 'Tesfaye', firstNameAm: 'አለማየው', lastNameAm: 'ተስፋዬ', gender: 'Male', dateOfBirth: new Date('1992-11-25'), phone: '+251944556677', email: 'alemayehu.tesfaye@samaria.et', address: 'Addis Ababa', department: 'Finance', position: 'Accounting Officer', hireDate: new Date('2021-09-01'), employmentType: 'Permanent', baseSalary: 40000, bankAccount: '4000567890123', bankName: 'Dashen Bank', tin: '0045678901', status: 'Active' },
    { employeeNo: 'EMP-00005', firstName: 'Selamawit', middleName: 'Mulugeta', lastName: 'Abebe', firstNameAm: 'ሰላማዊት', lastNameAm: 'አበበ', gender: 'Female', dateOfBirth: new Date('1987-07-18'), phone: '+251955667788', email: 'selamawit.abebe@samaria.et', address: 'Adama', department: 'Procurement', position: 'Procurement Officer', hireDate: new Date('2020-02-15'), employmentType: 'Permanent', baseSalary: 38000, bankAccount: '5000678901234', bankName: 'Oromia International Bank', tin: '0056789012', status: 'Active' },
    { employeeNo: 'EMP-00006', firstName: 'Girma', middleName: 'Worku', lastName: 'Legesse', firstNameAm: 'ግርማ', lastNameAm: 'ሌገሰ', gender: 'Male', dateOfBirth: new Date('1986-02-08'), phone: '+251966778899', email: 'girma.legesse@samaria.et', address: 'Derba', department: 'Operations', position: 'Operations Supervisor', hireDate: new Date('2019-04-01'), employmentType: 'Permanent', baseSalary: 35000, bankAccount: '6000789012345', bankName: 'Commercial Bank of Ethiopia', tin: '0067890123', status: 'Active' },
    { employeeNo: 'EMP-00007', firstName: 'Meskerem', middleName: 'Hailu', lastName: 'Getnet', firstNameAm: 'መስከረም', lastNameAm: 'ገትነት', gender: 'Female', dateOfBirth: new Date('1991-09-14'), phone: '+251977889900', email: 'meskerem.getnet@samaria.et', address: 'Addis Ababa', department: 'Medical', position: 'Druggist', hireDate: new Date('2022-01-10'), employmentType: 'Permanent', baseSalary: 38000, bankAccount: '7000890123456', bankName: 'Awash Bank', tin: '0078901234', status: 'Active' },
    { employeeNo: 'EMP-00008', firstName: 'Frehiwot', middleName: 'Arega', lastName: 'Tewodros', firstNameAm: 'ፍሬህይወት', lastNameAm: 'ቴዎድሮስ', gender: 'Female', dateOfBirth: new Date('1989-12-30'), phone: '+251988990011', email: 'frehiwot.tewodros@samaria.et', address: 'Addis Ababa', department: 'HR', position: 'HR Officer', hireDate: new Date('2021-05-01'), employmentType: 'Permanent', baseSalary: 36000, bankAccount: '8000901234567', bankName: 'Bank of Abyssinia', tin: '0089012345', status: 'Active' },
    { employeeNo: 'EMP-00009', firstName: 'Worku', middleName: 'Legesse', lastName: 'Teshome', firstNameAm: 'ወርቁ', lastNameAm: 'ተሾመ', gender: 'Male', dateOfBirth: new Date('1984-06-20'), phone: '+251999001122', email: 'worku.teshome@samaria.et', address: 'Sululta', department: 'Operations', position: 'Field Supervisor', hireDate: new Date('2018-10-01'), employmentType: 'Permanent', baseSalary: 34000, bankAccount: '9001012345678', bankName: 'Oromia International Bank', tin: '0090123456', status: 'Active' },
    { employeeNo: 'EMP-00010', firstName: 'Assefa', middleName: 'Biru', lastName: 'Mengesha', firstNameAm: 'አሰፋ', lastNameAm: 'መንግሻ', gender: 'Male', dateOfBirth: new Date('1993-01-05'), phone: '+251911334455', email: 'assefa.mengesha@samaria.et', address: 'Addis Ababa', department: 'Logistics', position: 'Logistics Coordinator', hireDate: new Date('2022-03-15'), employmentType: 'Permanent', baseSalary: 32000, bankAccount: '1001123456789', bankName: 'Commercial Bank of Ethiopia', tin: '0001234567', status: 'Active' },
  ];

  const employeeIds = [];
  for (const emp of sampleEmployees) {
    const existing = await prisma.employee.findFirst({ where: { employeeNo: emp.employeeNo } });
    if (!existing) {
      const created = await prisma.employee.create({ data: emp });
      employeeIds.push(created.id);
      console.log(`  Employee: ${emp.employeeNo} - ${emp.firstName} ${emp.lastName}`);
    } else {
      employeeIds.push(existing.id);
    }
  }
  return employeeIds;
}

async function seedMedicalBatches(itemIds) {
  console.log('\n=== Adding Medical Batches ===\n');

  const existingBatches = await prisma.medicalBatch.count();
  if (existingBatches > 0) {
    console.log('  Medical batches already exist, skipping...');
    return;
  }

  if (!itemIds || itemIds.length < 6) {
    console.log('  Not enough medical items, skipping...');
    return;
  }

  // Batches for medical items (indices 5-10 are medical items)
  const sampleBatches = [
    { itemId: itemIds[5], batchNo: 'BATCH-AMX-001', expiryDate: new Date('2027-03-15'), quantity: 500, costPrice: 85, warehouse: 'medical_store', status: 'Available' },
    { itemId: itemIds[5], batchNo: 'BATCH-AMX-002', expiryDate: new Date('2026-12-20'), quantity: 300, costPrice: 85, warehouse: 'medical_store', status: 'Available' },
    { itemId: itemIds[6], batchNo: 'BATCH-PCM-001', expiryDate: new Date('2027-05-10'), quantity: 1000, costPrice: 35, warehouse: 'medical_store', status: 'Available' },
    { itemId: itemIds[6], batchNo: 'BATCH-PCM-002', expiryDate: new Date('2026-11-15'), quantity: 750, costPrice: 35, warehouse: 'medical_store', status: 'Available' },
    { itemId: itemIds[7], batchNo: 'BATCH-MET-001', expiryDate: new Date('2027-02-28'), quantity: 400, costPrice: 120, warehouse: 'medical_store', status: 'Available' },
    { itemId: itemIds[8], batchNo: 'BATCH-IBU-001', expiryDate: new Date('2027-07-30'), quantity: 600, costPrice: 55, warehouse: 'medical_store', status: 'Available' },
    { itemId: itemIds[9], batchNo: 'BATCH-LIS-001', expiryDate: new Date('2027-01-15'), quantity: 350, costPrice: 150, warehouse: 'medical_store', status: 'Available' },
    { itemId: itemIds[10], batchNo: 'BATCH-VIT-001', expiryDate: new Date('2027-04-20'), quantity: 800, costPrice: 40, warehouse: 'medical_store', status: 'Available' },
  ];

  let createdCount = 0;
  for (const batch of sampleBatches) {
    const existing = await prisma.medicalBatch.findFirst({
      where: { itemId: batch.itemId, batchNo: batch.batchNo, warehouse: batch.warehouse },
    });
    if (!existing) {
      await prisma.medicalBatch.create({ data: batch });
      createdCount++;
    }
  }
  console.log(`  Created ${createdCount} medical batches`);
}

async function seedMedicalPricing(itemIds) {
  console.log('\n=== Adding Medical Pricing ===\n');

  const existingPricing = await prisma.medicalPricing.count();
  if (existingPricing > 0) {
    console.log('  Medical pricing already exists, skipping...');
    return;
  }

  if (!itemIds || itemIds.length < 6) {
    console.log('  Not enough medical items, skipping...');
    return;
  }

  const samplePricings = [
    { itemId: itemIds[5], manufacturerPrice: 75, freight: 8, insurance: 2, customs: 0, inlandTransport: 5, bankCost: 2, warehouseCost: 1, handlingCost: 1, wastageAllowance: 1, otherCosts: 0, totalCost: 95, marginPercent: 15, recommendedPrice: 109.25, approvedPrice: 110 },
    { itemId: itemIds[6], manufacturerPrice: 28, freight: 3, insurance: 0.5, customs: 0, inlandTransport: 2, bankCost: 0.5, warehouseCost: 0.5, handlingCost: 0.5, wastageAllowance: 0.5, otherCosts: 0, totalCost: 35.5, marginPercent: 20, recommendedPrice: 42.6, approvedPrice: 43 },
    { itemId: itemIds[7], manufacturerPrice: 100, freight: 10, insurance: 3, customs: 0, inlandTransport: 6, bankCost: 2, warehouseCost: 1, handlingCost: 1, wastageAllowance: 1, otherCosts: 0, totalCost: 124, marginPercent: 18, recommendedPrice: 146.32, approvedPrice: 150 },
    { itemId: itemIds[8], manufacturerPrice: 45, freight: 5, insurance: 1, customs: 0, inlandTransport: 3, bankCost: 1, warehouseCost: 1, handlingCost: 0.5, wastageAllowance: 0.5, otherCosts: 0, totalCost: 57, marginPercent: 22, recommendedPrice: 69.54, approvedPrice: 70 },
    { itemId: itemIds[9], manufacturerPrice: 130, freight: 12, insurance: 4, customs: 0, inlandTransport: 7, bankCost: 2, warehouseCost: 1, handlingCost: 1, wastageAllowance: 1, otherCosts: 0, totalCost: 158, marginPercent: 20, recommendedPrice: 189.6, approvedPrice: 195 },
    { itemId: itemIds[10], manufacturerPrice: 30, freight: 3, insurance: 1, customs: 0, inlandTransport: 2, bankCost: 0.5, warehouseCost: 0.5, handlingCost: 0.5, wastageAllowance: 0.5, otherCosts: 0, totalCost: 38, marginPercent: 25, recommendedPrice: 47.5, approvedPrice: 48 },
  ];

  let createdCount = 0;
  for (const pricing of samplePricings) {
    const existing = await prisma.medicalPricing.findFirst({ where: { itemId: pricing.itemId } });
    if (!existing) {
      await prisma.medicalPricing.create({ data: pricing });
      createdCount++;
    }
  }
  console.log(`  Created ${createdCount} medical pricing records`);
}

async function seedMedicalRequests(itemIds) {
  console.log('\n=== Adding Medical Requests ===\n');

  const existingRequests = await prisma.medicalRequest.count();
  if (existingRequests > 0) {
    console.log('  Medical requests already exist, skipping...');
    return;
  }

  // Get a medical customer
  const medicalCustomer = await prisma.customer.findFirst({
    where: { division: 'MEDICAL' },
  });

  if (!medicalCustomer) {
    console.log('  No medical customer found, skipping...');
    return;
  }

  if (!itemIds || itemIds.length < 6) {
    console.log('  Not enough medical items, skipping...');
    return;
  }

  const medicalItemIds = itemIds.slice(5); // Get medical items only

  const sampleRequests = [
    {
      requestNo: 'MR-000001',
      customerId: medicalCustomer.id,
      items: JSON.stringify([
        { itemId: medicalItemIds[0], qty: 50, batchPref: 'Latest', notes: 'Urgent' },
        { itemId: medicalItemIds[1], qty: 100, batchPref: 'Any', notes: '' },
      ]),
      priority: 'High',
      status: 'Submitted',
      notes: 'Regular monthly supply request',
    },
    {
      requestNo: 'MR-000002',
      customerId: medicalCustomer.id,
      items: JSON.stringify([
        { itemId: medicalItemIds[2], qty: 75, batchPref: 'Latest', notes: '' },
      ]),
      priority: 'Normal',
      status: 'Submitted',
      notes: 'Antibiotic stock replenishment',
    },
    {
      requestNo: 'MR-000003',
      customerId: medicalCustomer.id,
      items: JSON.stringify([
        { itemId: medicalItemIds[1], qty: 200, batchPref: 'Any', notes: '' },
        { itemId: medicalItemIds[3], qty: 150, batchPref: 'Latest', notes: 'Pain management supplies' },
      ]),
      priority: 'Normal',
      status: 'Submitted',
      notes: 'General supplies request',
    },
    {
      requestNo: 'MR-000004',
      customerId: medicalCustomer.id,
      items: JSON.stringify([
        { itemId: medicalItemIds[4], qty: 80, batchPref: 'Latest', notes: 'Chronic disease management' },
        { itemId: medicalItemIds[5], qty: 120, batchPref: 'Any', notes: '' },
      ]),
      priority: 'Normal',
      status: 'Submitted',
      notes: 'Diabetes and hypertension supplies',
    },
    {
      requestNo: 'MR-000005',
      customerId: medicalCustomer.id,
      items: JSON.stringify([
        { itemId: medicalItemIds[0], qty: 30, batchPref: 'Latest', notes: 'Emergency stock' },
      ]),
      priority: 'High',
      status: 'Submitted',
      notes: 'Emergency replenishment - low stock alert',
    },
  ];

  let createdCount = 0;
  for (const req of sampleRequests) {
    const existing = await prisma.medicalRequest.findFirst({
      where: { requestNo: req.requestNo },
    });
    if (!existing) {
      await prisma.medicalRequest.create({
        data: {
          requestNo: req.requestNo,
          customerId: req.customerId,
          items: req.items,
          priority: req.priority,
          status: req.status,
          notes: req.notes,
        },
      });
      createdCount++;
    }
  }
  console.log(`  Created ${createdCount} medical requests`);
}

async function seedSalesAgreements(itemIds) {
  console.log('\n=== Adding Sales Agreements ===\n');

  const existingAgreements = await prisma.salesAgreement.count();
  if (existingAgreements > 0) {
    console.log('  Sales agreements already exist, skipping...');
    return;
  }

  if (!itemIds || itemIds.length < 5) {
    console.log('  Not enough items, skipping...');
    return;
  }

  // Get construction and medical customers
  const constructionCustomer = await prisma.customer.findFirst({
    where: { division: { in: ['CONSTRUCTION', 'BOTH'] } },
  });
  const medicalCustomer = await prisma.customer.findFirst({
    where: { division: { in: ['MEDICAL', 'BOTH'] } },
  });

  if (!constructionCustomer && !medicalCustomer) {
    console.log('  No suitable customers found, skipping...');
    return;
  }

  const sampleAgreements = [];

  if (constructionCustomer) {
    sampleAgreements.push({
      agreementNo: 'SA-000001',
      customerId: constructionCustomer.id,
      division: 'CONSTRUCTION',
      items: JSON.stringify([
        { itemId: itemIds[0], qty: 500, unit: 'm3', unitPrice: 2500 },
        { itemId: itemIds[3], qty: 1000, unit: 'ton', unitPrice: 3500 },
      ]),
      totalAmount: 4000000,
      validFrom: new Date('2025-01-01'),
      validTo: new Date('2025-12-31'),
      terms: 'Net 30 days. Delivery monthly. 2% discount on volume >1000 tons.',
      status: 'Draft',
    });
  }

  if (medicalCustomer) {
    sampleAgreements.push({
      agreementNo: 'SA-000002',
      customerId: medicalCustomer.id,
      division: 'MEDICAL',
      items: JSON.stringify([
        { itemId: itemIds[5], qty: 1000, unit: 'box', unitPrice: 110 },
        { itemId: itemIds[6], qty: 2000, unit: 'box', unitPrice: 43 },
      ]),
      totalAmount: 196000,
      validFrom: new Date('2025-02-01'),
      validTo: new Date('2025-12-31'),
      terms: 'Net 15 days. Batch tracking mandatory. Monthly delivery schedule.',
      status: 'Draft',
    });
  }

  let createdCount = 0;
  for (const agr of sampleAgreements) {
    const existing = await prisma.salesAgreement.findFirst({
      where: { agreementNo: agr.agreementNo },
    });
    if (!existing) {
      await prisma.salesAgreement.create({ data: agr });
      createdCount++;
    }
  }
  console.log(`  Created ${createdCount} sales agreements`);
}

async function seedBankAccounts() {
  console.log('\n=== Adding Bank Accounts ===\n');

  const existingBankAccounts = await prisma.bankAccount.count();
  if (existingBankAccounts > 0) {
    console.log('  Bank accounts already exist, skipping...');
    return;
  }

  const sampleBankAccounts = [
    { bankName: 'Commercial Bank of Ethiopia', accountNo: '1001500000123', accountName: 'Samaria Trading PLC - Main', branch: 'Addis Ababa Main', currency: 'ETB', balance: 2500000, status: 'Active' },
    { bankName: 'Awash Bank', accountNo: '2001600000456', accountName: 'Samaria Trading PLC - Operations', branch: 'Addis Ababa', currency: 'ETB', balance: 1200000, status: 'Active' },
    { bankName: 'Bank of Abyssinia', accountNo: '3001700000789', accountName: 'Samaria Trading PLC - Medical Division', branch: 'Addis Ababa', currency: 'ETB', balance: 800000, status: 'Active' },
    { bankName: 'Dashen Bank', accountNo: '4001800000012', accountName: 'Samaria Trading PLC - Payroll', branch: 'Addis Ababa', currency: 'ETB', balance: 500000, status: 'Active' },
  ];

  let createdCount = 0;
  for (const bankAccount of sampleBankAccounts) {
    const existing = await prisma.bankAccount.findFirst({
      where: { accountNo: bankAccount.accountNo },
    });
    if (!existing) {
      await prisma.bankAccount.create({ data: bankAccount });
      createdCount++;
    }
  }
  console.log(`  Created ${createdCount} bank accounts`);
}

async function main() {
  console.log('========================================');
  console.log('  SAMARIA ERP - Fix Codes & Seed Data');
  console.log('========================================');

  await fixExistingCodes();
  await seedSampleData();

  const itemIds = await seedItems();
  await seedEmployees();
  await seedMedicalBatches(itemIds);
  await seedMedicalPricing(itemIds);
  await seedMedicalRequests(itemIds);
  await seedSalesAgreements(itemIds);
  await seedBankAccounts();

  console.log('========================================');
  console.log('  ALL DONE!');
  console.log('========================================');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
