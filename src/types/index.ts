// PrismaUser type inferred from schema
type PrismaUser = {
  id: string;
  username: string;
  email: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  phone: string | null;
  role: string;
  department: string | null;
  branch: string | null;
  status: string;
};

export type UserRole =
  | "ADMIN"
  | "MANAGER"
  | "PROCUREMENT"
  | "SALES"
  | "FINANCE"
  | "HR"
  | "MEDICAL_PHARMACIST"
  | "MEDICAL_DRUGGIST"
  | "WAREHOUSE"
  | "AUDITOR"
  | "USER"
  | "PORTAL_CUSTOMER";

export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: UserRole;
  department?: string | null;
  image?: string | null;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  statusCode: number;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface TableColumnDef<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string | number;
  render?: (value: any, row: T) => React.ReactNode;
  align?: "left" | "center" | "right";
}

export interface FormFieldDef {
  name: string;
  label: string;
  type:
    | "text"
    | "email"
    | "password"
    | "number"
    | "date"
    | "datetime"
    | "select"
    | "multiselect"
    | "checkbox"
    | "radio"
    | "textarea"
    | "file"
    | "currency"
    | "phone"
    | "time";
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: any) => string | null;
  };
  options?: Array<{
    label: string;
    value: string | number;
  }>;
  defaultValue?: any;
  helperText?: string;
  className?: string;
}

export interface FormData {
  [key: string]: any;
}

export interface FilterDef {
  field: string;
  operator: "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "in" | "contains" | "startsWith" | "endsWith";
  value: any;
}

export type CustomerType = "COMPANY" | "INDIVIDUAL";

export type Division = "CONSTRUCTION" | "MEDICAL" | "BOTH";

export type CouponStatus =
  | "COLLECTED"
  | "IN_CUSTODY"
  | "HANDED_OVER"
  | "USED"
  | "RETURNED"
  | "CANCELLED"
  | "EXPIRED"
  | "LOST";

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface Customer {
  id: string;
  code: string;
  customerType: CustomerType;
  companyName: string;
  firstName?: string;
  lastName?: string;
  tin?: string;
  phone: string;
  email?: string;
  contactPerson?: string;
  location?: string;
  withholding: boolean;
  withholdRate: number;
  creditLimit: number;
  creditTermDays: number;
  status: string;
  approvedBy?: string;
  registeredBy?: string;
  division: Division;
  licenseNo?: string;
  licenseExpiry?: Date;
  licenseType?: string;
  medicalApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Supplier {
  id: string;
  code: string;
  supplierType: string;
  companyName: string;
  firstName?: string;
  lastName?: string;
  tin?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  location?: string;
  withholding: boolean;
  withholdRate: number;
  status: string;
  registeredBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Factory {
  id: string;
  code: string;
  name: string;
  factoryType: string;
  suppliedMaterial?: string;
  location?: string;
  phone?: string;
  contactPerson?: string;
  useCoupons: boolean;
  weighbridgeReq: boolean;
  terms?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Item {
  id: string;
  code: string;
  name: string;
  nameAmharic?: string;
  category: string;
  unit: string;
  itemType: string;
  division: Division;
  batchTracked: boolean;
  expiryTracked: boolean;
  manufacturer?: string;
  genericName?: string;
  strength?: string;
  dosageForm?: string;
  status: string;
  registeredBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockBalance {
  id: string;
  itemId: string;
  warehouse: string;
  quantity: number;
  avgCost: number;
  lastUpdated: Date;
}

export interface SalesInvoice {
  id: string;
  invoiceNo: string;
  customerId: string;
  salesOrderId?: string;
  division: Division;
  items: string;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  withholding: number;
  totalAmount: number;
  status: string;
  invoiceDate: Date;
  dueDate?: Date;
  createdBy?: string;
}

export interface SalesOrder {
  id: string;
  orderNo: string;
  customerId: string;
  proformaId?: string;
  division: Division;
  items: string;
  totalAmount: number;
  status: string;
  orderDate: Date;
  createdBy?: string;
}

export interface Delivery {
  id: string;
  deliveryNo: string;
  customerId: string;
  salesOrderId?: string;
  division: Division;
  items: string;
  driverName?: string;
  truckPlateNo?: string;
  deliveredTo?: string;
  deliveryDate: Date;
  status: string;
  registeredBy?: string;
}

export interface PurchaseOrder {
  id: string;
  poNo: string;
  supplierId: string;
  items: string;
  totalAmount: number;
  status: string;
  approvedBy?: string;
  createdBy?: string;
  createdAt: Date;
}

export interface GoodsReceive {
  id: string;
  grvNo: string;
  supplierId: string;
  purchaseOrderId?: string;
  items: string;
  totalAmount: number;
  receivedBy?: string;
  receivedDate: Date;
  status: string;
}

export interface Employee {
  id: string;
  employeeNo: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  firstNameAm?: string;
  lastNameAm?: string;
  gender?: string;
  dateOfBirth?: Date;
  phone?: string;
  email?: string;
  address?: string;
  department?: string;
  position?: string;
  hireDate: Date;
  employmentType: string;
  baseSalary: number;
  bankAccount?: string;
  bankName?: string;
  tin?: string;
  pensionNo?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PayrollItem {
  id: string;
  payrollPeriodId: string;
  employeeId: string;
  baseSalary: number;
  workingDays: number;
  absentDays: number;
  overtimeHours: number;
  overtimePay: number;
  allowances: number;
  grossSalary: number;
  pensionEmployee: number;
  pensionEmployer: number;
  incomeTax: number;
  otherDeductions: number;
  advanceDeduction: number;
  totalDeductions: number;
  netSalary: number;
}

export interface CementPurchase {
  id: string;
  purchaseNo: string;
  factoryId: string;
  cementType: string;
  quantityTons: number;
  unitPrice: number;
  totalAmount: number;
  paymentRef?: string;
  paymentDate?: Date;
  balanceRemaining: number;
  status: string;
  createdBy?: string;
  createdAt: Date;
}

export interface CementLifting {
  id: string;
  liftingNo: string;
  purchaseId: string;
  factoryId: string;
  truckId: string;
  customerId: string;
  factoryWeighbridgeRef: string;
  factoryWeight: number;
  buyerWeighbridgeQty?: number;
  shortageQty?: number;
  shortagePenalty?: number;
  couponId?: string;
  deliveryNoteNo?: string;
  liftingDate: Date;
  status: string;
  registeredBy?: string;
  createdAt: Date;
}

export interface AggregateDelivery {
  id: string;
  dispatchNo: string;
  customerId: string;
  supplierId: string;
  transporterId: string;
  truckId: string;
  itemId: string;
  loadedVolume: number;
  deliveredVolume?: number;
  shortageVolume?: number;
  transportRate: number;
  aggregateValue: number;
  customerPrice?: number;
  supplierPrice?: number;
  customerReceivable?: number;
  supplierPayable?: number;
  netMaterialAmount?: number;
  grossTruckFee?: number;
  shortageDeduction?: number;
  netTruckPayment?: number;
  telegramProof?: string;
  signedInvoice?: string;
  dispatchDate: Date;
  deliveryDate?: Date;
  status: string;
  verifiedBy?: string;
  registeredBy?: string;
}

export interface MedicalRequest {
  id: string;
  requestNo: string;
  customerId: string;
  items: string;
  priority: string;
  status: string;
  requestDate: Date;
  notes?: string;
  createdBy?: string;
}

export interface MedicalBatch {
  id: string;
  itemId: string;
  batchNo: string;
  expiryDate: Date;
  quantity: number;
  costPrice: number;
  warehouse: string;
  status: string;
  receivedDate: Date;
  supplierId?: string;
}

export interface Transporter {
  id: string;
  code: string;
  transporterType: string;
  companyName: string;
  firstName?: string;
  lastName?: string;
  tin?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  location?: string;
  withholding: boolean;
  withholdRate: number;
  status: string;
  registeredBy?: string;
  createdAt: Date;
}

export interface Truck {
  id: string;
  plateNo: string;
  transporterId: string;
  ownerName?: string;
  ownerPhone?: string;
  ownerTin?: string;
  capacity?: number;
  status: string;
  createdAt: Date;
}

export interface ChartOfAccount {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  parentId?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface JournalEntry {
  id: string;
  voucherNo: string;
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
  refModule?: string;
  refId?: string;
  entryDate: Date;
  postedBy?: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNo: string;
  accountName: string;
  branch?: string;
  currency: string;
  balance: number;
  status: string;
  createdAt: Date;
}

export interface BankTransaction {
  id: string;
  bankAccountId: string;
  type: string;
  amount: number;
  refNo?: string;
  description?: string;
  transDate: Date;
  reconStatus: string;
  createdBy?: string;
}

export interface VatPeriod {
  id: string;
  periodName: string;
  startDate: Date;
  endDate: Date;
  outputVat: number;
  inputVat: number;
  netVat: number;
  status: string;
  filedBy?: string;
  filedDate?: Date;
  createdAt: Date;
}

export interface Approval {
  id: string;
  module: string;
  recordId: string;
  requesterId: string;
  approverId?: string;
  status: ApprovalStatus;
  notes?: string;
  requestedAt: Date;
  resolvedAt?: Date;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  module: string;
  recordId?: string;
  details?: string;
  ipAddress?: string;
  createdAt: Date;
}

export interface FilterOption {
  id: string;
  name: string;
  value: any;
  icon?: React.ReactNode;
}

export interface DashboardMetric {
  label: string;
  value: number | string;
  change?: number;
  changeType?: "increase" | "decrease" | "neutral";
  icon?: React.ReactNode;
}

export interface ReportFilter {
  dateFrom?: Date;
  dateTo?: Date;
  status?: string;
  division?: Division;
  customerId?: string;
  supplierId?: string;
  departmentId?: string;
  [key: string]: any;
}

export interface ExportOptions {
  format: "pdf" | "excel" | "csv";
  columns?: string[];
  filename?: string;
  includeHeaders?: boolean;
}

export interface SelectOption<T = string> {
  label: string;
  value: T;
  disabled?: boolean;
  icon?: React.ReactNode;
}
