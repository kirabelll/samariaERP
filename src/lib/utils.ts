import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  return new Intl.NumberFormat("en-US").format(num);
}

export function formatNumberInput(value: string): string {
  // Remove existing commas, keep digits and decimal point
  const cleaned = value.replace(/,/g, "");
  if (!cleaned || cleaned === ".") return cleaned;
  const num = parseFloat(cleaned);
  if (isNaN(num)) return cleaned;
  // Format with commas but preserve the decimal input
  const parts = cleaned.split(".");
  const intPart = parseInt(parts[0] || "0");
  const formatted = new Intl.NumberFormat("en-US").format(intPart);
  if (parts.length > 1) {
    return `${formatted}.${parts[1]}`;
  }
  return formatted;
}

export function parseFormattedNumber(value: string): number {
  const cleaned = value.replace(/,/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function formatCurrency(amount: number, currencyCode: string = "ETB"): string {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(amount);
}

export function formatCurrencyETB(amount: number): string {
  return formatCurrency(amount, "ETB");
}

export function formatDate(date: Date | string, locale: string = "en-US"): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  const formatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(dateObj);
}

export function formatDateTime(date: Date | string, locale: string = "en-US"): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  const formatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return formatter.format(dateObj);
}

export function generateCode(prefix: string, sequence: number): string {
  const paddedSequence = String(sequence).padStart(6, "0");
  return `${prefix}-${paddedSequence}`;
}

export function generateCustomerCode(sequence: number): string {
  return generateCode("CUS", sequence);
}

export function generateSupplierCode(sequence: number): string {
  return generateCode("SUP", sequence);
}

export function generateInvoiceCode(sequence: number): string {
  return generateCode("INV", sequence);
}

export function generatePurchaseOrderCode(sequence: number): string {
  return generateCode("PO", sequence);
}

export interface EthiopianTaxBracket {
  minIncome: number;
  maxIncome: number | null;
  rate: number;
  deduction: number;
}

const ethiopianTaxBrackets: EthiopianTaxBracket[] = [
  { minIncome: 0, maxIncome: 600, rate: 0, deduction: 0 },
  { minIncome: 601, maxIncome: 1650, rate: 0.1, deduction: 60 },
  { minIncome: 1651, maxIncome: 3200, rate: 0.15, deduction: 142.5 },
  { minIncome: 3201, maxIncome: 5250, rate: 0.2, deduction: 302.5 },
  { minIncome: 5251, maxIncome: 7800, rate: 0.25, deduction: 565 },
  { minIncome: 7801, maxIncome: 10900, rate: 0.3, deduction: 955 },
  { minIncome: 10901, maxIncome: null, rate: 0.35, deduction: 1500 },
];

export function calculateEthiopianIncomeTax(monthlyIncome: number): number {
  const bracket = ethiopianTaxBrackets.find(
    (b) => monthlyIncome >= b.minIncome && (!b.maxIncome || monthlyIncome <= b.maxIncome)
  );

  if (!bracket) {
    return 0;
  }

  const tax = monthlyIncome * bracket.rate - bracket.deduction;
  return Math.max(0, tax);
}

export function calculateAnnualIncomeTax(annualIncome: number): number {
  const monthlyIncome = annualIncome / 12;
  return calculateEthiopianIncomeTax(monthlyIncome) * 12;
}

export function calculateEmployeePension(grossSalary: number): number {
  const pensionRate = 0.07;
  return grossSalary * pensionRate;
}

export function calculateEmployerPension(grossSalary: number): number {
  const pensionRate = 0.11;
  return grossSalary * pensionRate;
}

export function calculateTotalPension(grossSalary: number): number {
  return calculateEmployeePension(grossSalary) + calculateEmployerPension(grossSalary);
}

export function calculateNetSalary(
  grossSalary: number,
  deductions: number = 0
): number {
  const incomeTax = calculateEthiopianIncomeTax(grossSalary);
  const pensionEmployee = calculateEmployeePension(grossSalary);
  const totalDeductions = incomeTax + pensionEmployee + deductions;
  return grossSalary - totalDeductions;
}

export function calculatePayrollTotals(
  grossSalary: number,
  additionalDeductions: number = 0
) {
  const incomeTax = calculateEthiopianIncomeTax(grossSalary);
  const pensionEmployee = calculateEmployeePension(grossSalary);
  const pensionEmployer = calculateEmployerPension(grossSalary);
  const otherDeductions = additionalDeductions;
  const totalDeductions = incomeTax + pensionEmployee + otherDeductions;
  const netSalary = grossSalary - totalDeductions;
  const totalEmployeeCost = grossSalary + pensionEmployer;

  return {
    grossSalary,
    incomeTax,
    pensionEmployee,
    pensionEmployer,
    otherDeductions,
    totalDeductions,
    netSalary,
    totalEmployeeCost,
  };
}

export function isDateInPast(date: Date | string): boolean {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj < new Date();
}

export function isDateInFuture(date: Date | string): boolean {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj > new Date();
}

export function getDaysDifference(startDate: Date | string, endDate: Date | string): number {
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;

  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

export function getMonthsDifference(startDate: Date | string, endDate: Date | string): number {
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;

  const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());

  return monthsDiff;
}

export function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100;
}

export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validatePhone(phone: string): boolean {
  const re = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
  return re.test(phone.replace(/\s/g, ""));
}

export function validateTIN(tin: string): boolean {
  return tin.length >= 10 && /^[0-9]+$/.test(tin);
}

export function maskPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length < 10) return phone;

  const last4 = cleaned.slice(-4);
  const first = cleaned.slice(0, -4);
  return `${first.replace(/./g, "*")}${last4}`;
}

export function truncateText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parseJSONSafe(jsonString: string, fallback: any = null): any {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    return fallback;
  }
}

export function stringifyJSON(obj: any, pretty: boolean = false): string {
  return JSON.stringify(obj, null, pretty ? 2 : 0);
}
