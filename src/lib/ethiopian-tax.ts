/**
 * Ethiopian Employment Income Tax & Pension Calculation Utilities
 * 
 * Updated Ethiopian Income Tax Brackets:
 * - 0 - 2,000 ETB: 0% (Deduction: 0)
 * - 2,001 - 4,000 ETB: 15% (Deduction: 300 ETB)
 * - 4,001 - 7,000 ETB: 20% (Deduction: 500 ETB)
 * - 7,001 - 10,000 ETB: 25% (Deduction: 850 ETB)
 * - 10,001 - 14,000 ETB: 30% (Deduction: 1,350 ETB)
 * - Over 14,000 ETB: 35% (Deduction: 2,050 ETB)
 * 
 * Pension Rates:
 * - Employee Pension: 7% of Base Salary
 * - Employer Pension: 11% of Base Salary
 */

export interface EthiopianTaxBracket {
  min: number;
  max: number;
  rate: number; // e.g. 0.15 for 15%
  deduction: number;
  label: string;
}

export const ETHIOPIAN_TAX_BRACKETS: EthiopianTaxBracket[] = [
  { min: 0, max: 2000, rate: 0.0, deduction: 0, label: '0%' },
  { min: 2001, max: 4000, rate: 0.15, deduction: 300, label: '15%' },
  { min: 4001, max: 7000, rate: 0.20, deduction: 500, label: '20%' },
  { min: 7001, max: 10000, rate: 0.25, deduction: 850, label: '25%' },
  { min: 10001, max: 14000, rate: 0.30, deduction: 1350, label: '30%' },
  { min: 14001, max: Infinity, rate: 0.35, deduction: 2050, label: '35%' },
];

export const EMPLOYEE_PENSION_RATE = 0.07; // 7%
export const EMPLOYER_PENSION_RATE = 0.11; // 11%

/**
 * Calculates Ethiopian Employment Income Tax based on taxable gross salary
 */
export function calculateEthiopianIncomeTax(taxableIncome: number): number {
  if (taxableIncome <= 2000) {
    return 0;
  }

  for (const bracket of ETHIOPIAN_TAX_BRACKETS) {
    if (taxableIncome <= bracket.max) {
      const tax = taxableIncome * bracket.rate - bracket.deduction;
      return Math.max(0, Math.round(tax * 100) / 100);
    }
  }

  // Fallback for over 14000
  const tax = taxableIncome * 0.35 - 2050;
  return Math.max(0, Math.round(tax * 100) / 100);
}

/**
 * Returns the matching tax bracket rate percentage string (e.g. "20%")
 */
export function getTaxBracketRate(taxableIncome: number): string {
  for (const bracket of ETHIOPIAN_TAX_BRACKETS) {
    if (taxableIncome <= bracket.max) {
      return bracket.label;
    }
  }
  return '35%';
}

/**
 * Calculates Employee Pension (7% of base salary)
 */
export function calculateEmployeePension(baseSalary: number): number {
  return Math.round(baseSalary * EMPLOYEE_PENSION_RATE * 100) / 100;
}

/**
 * Calculates Employer Pension (11% of base salary)
 */
export function calculateEmployerPension(baseSalary: number): number {
  return Math.round(baseSalary * EMPLOYER_PENSION_RATE * 100) / 100;
}

export interface PayrollCalculationInput {
  employeeId: string;
  employeeNo?: string;
  employeeName: string;
  department?: string;
  position?: string;
  baseSalary: number;
  allowances?: number;
  fieldAllowance?: number;
  isFieldAllowanceTaxable?: boolean;
  taxableAllowance?: number;
  nonTaxableAllowance?: number;
  otherDeductions?: number;
  advanceDeduction?: number;
}

export interface PayrollCalculationResult {
  employeeId: string;
  employeeNo: string;
  employeeName: string;
  department: string;
  position: string;
  baseSalary: number;
  fieldAllowance: number;
  taxableAllowance: number;
  nonTaxableAllowance: number;
  allowances: number;
  taxableGross: number;
  grossSalary: number;
  taxRate: string;
  incomeTax: number;
  taxAllowance: number; // Income Tax as per Ethiopian Schedule
  pensionEmployee: number; // 7%
  pensionEmployer: number; // 11%
  totalPension: number; // 18%
  otherDeductions: number;
  advanceDeduction: number;
  totalDeductions: number; // Net deduction: Tax + 7% pension + others + advances
  netSalary: number; // Net pay: Gross - Total deductions
}

/**
 * Calculates full payroll item breakdown for an employee based on Ethiopian Tax Schedule 'A'
 */
export function calculatePayrollRow(input: PayrollCalculationInput): PayrollCalculationResult {
  const baseSalary = Number(input.baseSalary || 0);
  const fieldAllowance = Number(input.fieldAllowance || 0);
  const isFieldTaxable = input.isFieldAllowanceTaxable ?? false;
  const taxableField = isFieldTaxable ? fieldAllowance : 0;
  const nonTaxableField = isFieldTaxable ? 0 : fieldAllowance;

  const taxableAllowance = Number(input.taxableAllowance || 0);
  const nonTaxableAllowance = Number(input.nonTaxableAllowance || 0);

  // If explicit allowances passed but breakdown isn't given
  const explicitAllowances = input.allowances !== undefined && input.allowances !== null ? Number(input.allowances) : undefined;
  const totalTaxableAllowances = taxableAllowance + taxableField;
  const totalNonTaxableAllowances = nonTaxableAllowance + nonTaxableField;
  const computedAllowances = totalTaxableAllowances + totalNonTaxableAllowances;

  const allowances = explicitAllowances !== undefined && explicitAllowances > 0 && computedAllowances === 0
    ? explicitAllowances
    : computedAllowances;

  // Taxable Gross = Base Salary + Taxable Allowances
  const taxableGross = Math.round((baseSalary + (explicitAllowances !== undefined && computedAllowances === 0 ? explicitAllowances : totalTaxableAllowances)) * 100) / 100;
  const grossSalary = Math.round((baseSalary + allowances) * 100) / 100;

  // Ethiopian Employment Income Tax
  const incomeTax = calculateEthiopianIncomeTax(taxableGross);
  const taxRate = getTaxBracketRate(taxableGross);

  // Pensions (7% employee & 11% employer on base salary)
  const pensionEmployee = calculateEmployeePension(baseSalary);
  const pensionEmployer = calculateEmployerPension(baseSalary);
  const totalPension = Math.round((pensionEmployee + pensionEmployer) * 100) / 100;

  const otherDeductions = Number(input.otherDeductions || 0);
  const advanceDeduction = Number(input.advanceDeduction || 0);

  // Total deductions = Income Tax + 7% Employee Pension + other & advances
  const totalDeductions = Math.round((incomeTax + pensionEmployee + otherDeductions + advanceDeduction) * 100) / 100;
  const netSalary = Math.max(0, Math.round((grossSalary - totalDeductions) * 100) / 100);

  return {
    employeeId: input.employeeId,
    employeeNo: input.employeeNo || '',
    employeeName: input.employeeName,
    department: input.department || 'General',
    position: input.position || 'Staff',
    baseSalary,
    fieldAllowance,
    taxableAllowance,
    nonTaxableAllowance,
    allowances,
    taxableGross,
    grossSalary,
    taxRate,
    incomeTax,
    taxAllowance: incomeTax,
    pensionEmployee,
    pensionEmployer,
    totalPension,
    otherDeductions,
    advanceDeduction,
    totalDeductions,
    netSalary,
  };
}

/**
 * Returns date range (from date, to date, pay date, formatted label) for a given month and year
 */
export function getPayrollPeriodDates(year: number, month: number) {
  // month is 1-12
  const fromDate = new Date(year, month - 1, 1);
  const toDate = new Date(year, month, 0); // Last day of month
  const payDate = new Date(year, month, 5); // Default pay date: 5th of next month

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const monthName = monthNames[month - 1] || '';
  const periodName = `${year}-${String(month).padStart(2, '0')}`;

  const formatDate = (d: Date) => {
    return d.toISOString().split('T')[0];
  };

  const formatDisplayDate = (d: Date) => {
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return {
    periodName,
    monthName,
    fromDate: formatDate(fromDate),
    toDate: formatDate(toDate),
    payDate: formatDate(payDate),
    fromDisplay: formatDisplayDate(fromDate),
    toDisplay: formatDisplayDate(toDate),
    payDisplay: formatDisplayDate(payDate),
    totalDays: toDate.getDate(),
  };
}
