
export type PaymentModality = 'MENSUAL' | 'QUINCENAL' | 'SEMANAL' | 'DIARIO';
export type PaymentMethod = 'EFECTIVO' | 'TRANSFERENCIA';

export type EmployeeRole = 'EMPRESA' | 'GERENTE' | 'COORDINADOR' | 'JEFE_COCINA' | 'ADMINISTRATIVO' | 'MOSTRADOR' | 'COCINA' | 'REPARTIDOR' | 'DELIVERY' | string;

export interface Employee {
  id: string;
  name: string;
  position: string; // Keeps the string representation
  role?: EmployeeRole; // Strictly typed role for gamification
  monthlySalary: number; // Salary in ARS
  scheduleStart: string; // Format "HH:mm" e.g., "17:00"
  scheduleEnd: string;   // Format "HH:mm" e.g., "01:00"
  photoUrl?: string;     // Base64 string or URL
  active: boolean;
  password?: string;     // Member access password

  // Personal Data
  dni?: string;
  cuil?: string;
  address?: string;
  phone?: string;
  birthDate?: string;

  // Contract Data
  startDate?: string;
  interviewer?: string;
  paymentModality?: PaymentModality;

  // Payment Scheduling (New)
  nextPaymentDate?: string; // ISO Date
  nextPaymentMethod?: PaymentMethod;
  lastPaymentDate?: string; // ISO Date of last salary payment

  // Banking Data
  cbu?: string;
  alias?: string;
  bankName?: string;
  bankAccountHolder?: string;
  bankAccountNumber?: string;
  bankAccountType?: 'CAJA_AHORRO' | 'CUENTA_CORRIENTE';

  // Schedule Data
  assignedDays?: string[]; // Array of days e.g. ["Lun", "Mié", "Vie"]
  firstLogin?: boolean;
  lastActive?: string; // ISO Date for presence
  status?: 'active' | 'break'; // New Presence Status
  balance?: number; // Current account balance

  // Advanced Payroll
  payrollStartDate?: string; // Date to start calculating payroll from (Reset feature)
  officialHours?: number; // Official daily hours (e.g. 8)
}

export interface Task {
  id: string;
  employeeId: string;
  description: string;
  details?: string; // Detailed description
  status: 'PENDING' | 'COMPLETED' | 'SKIPPED'; // Updated status
  completedAt?: string; // Time string "HH:mm"
  completedBy?: string; // Name of person who did it
  assignedBy: string; // Admin username
  date: string; // ISO Date for daily tracking
}

export interface ChecklistSnapshot {
  id: string;
  date: string; // ISO Date
  finalizedAt: string; // HH:mm
  finalizedBy: string; // Name
  employeeId: string;
  tasks: Task[];
}

export interface AdminTask {
  id: string;
  title: string;
  description: string;
  assignedTo: string; // Admin User ID
  createdBy: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  estimatedTime: string; // e.g., "2 horas"
  dueDate?: string;

  // Verification System
  completedBy?: string; // User ID who marked as done
  verifiedBy?: string;  // User ID who verified
  verifiedAt?: string;

  // Collaboration
  comments?: {
    id: string;
    userId: string;
    text: string;
    date: string;
  }[];
  tags?: string[];
}

export interface ForumPost {
  id: string;
  author: string;
  authorRole: string;
  date: string; // ISO String
  content: string;
  imageUrl?: string;
  likes: string[]; // Array of User IDs or Employee IDs who liked it
}

export interface OvertimeRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string; // Actual arrival "HH:mm"
  checkOut: string; // Actual departure "HH:mm"
  overtimeHours: number; // Calculated hours
  overtimeAmount: number; // Calculated money in ARS
  reason: string;
  paid: boolean; // New field
  isHoliday?: boolean; // If paid double
  createdBy?: string;
  status?: 'CONFIRMED' | 'SCHEDULED'; // New field for future attendance
  manuallyModifiedBy?: string; // Audit for manual amount changes
  originalAmount?: number; // Audit for original calculated amount
}

export interface AbsenceRecord {
  id: string;
  employeeId: string;
  date: string;
  reason: string;
  justified?: boolean; // Added for 'Franco' logic and others
  type?: AbsenceType; // Added to categorize absence
  createdBy?: string;
}

export type SanctionType = 'APERCIBIMIENTO' | 'SUSPENSION' | 'DESCUENTO' | 'STRIKE' | 'LLEGADA_TARDE' | 'FALTA_INJUSTIFICADA' | 'CONDUCTA' | 'OTRO';

export interface SanctionRecord {
  id: string;
  employeeId: string;
  date: string;
  type: SanctionType;
  description: string;
  amount?: number; // If it involves a fine/discount
  createdBy?: string; // Name of admin who applied it

  // Soft Delete Fields
  deletedAt?: string; // ISO Date
  deletedBy?: string; // Name of user who deleted it

  // New fields for Coordinator/Response
  status?: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  requestedBy?: string; // Coordinator ID
  approvals?: string[]; // Array of Admin IDs who approved
  employeeResponse?: string; // Descargo
  responseDate?: string;
}

export interface InternalMessage {
  id: string;
  senderId: string;
  recipientIds: string[];
  subject: string;
  content: string;
  date: string;
  readBy: string[]; // Array of user IDs
  priority?: 'NORMAL' | 'HIGH';
  type?: 'TEXT' | 'QUICK_REPLY';
  reactions?: { userId: string; emoji: string }[]; // New field for reactions
  attachments?: string[]; // Array of Base64 strings
}

export interface SystemNotification {
  id: string;
  userId: string;
  type: 'CHECKLIST' | 'PAYMENT' | 'MESSAGE' | 'SANCTION' | 'INFO';
  title: string;
  message: string;
  date: string;
  read: boolean;
  link?: string;
}

export interface EmployeeNotice {
  id: string;
  employeeId: string;
  type: 'LATE' | 'ABSENCE' | 'OTHER';
  content: string;
  date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  readBy: string[]; // Array of Admin IDs
  adminResponse?: string;
}

export interface CoordinatorNote {
  id: string;
  employeeId: string; // The employee this note is about
  authorId: string; // User/Employee ID of the coordinator
  content: string;
  date: string;
  archived?: boolean;
  deletedAt?: string;
}

export interface CalendarEvent {
  id: string;
  userId?: string; // Owner of personal event
  title: string;
  date: string;
  description?: string;
  createdBy: string;
  visibility: 'ADMIN' | 'ALL' | 'PRIVATE'; // Added PRIVATE
  type?: 'EVENT' | 'HOLIDAY' | 'CLOSED' | 'DESCANSO';
}

export type AbsenceType = 'SICK' | 'UNJUSTIFIED' | 'LATE' | 'FRANCO';

export interface DeliverySchedule {
  id: string;
  employeeId: string;
  dates: string[]; // ISO Dates
}

export type UserRole = 'ADMIN' | 'MANAGER' | 'COORDINADOR' | 'ENCARGADO' | 'CAJERO';

// Granular Permissions System
export interface UserPermissions {
  // HR Module
  viewHr: boolean; // See list, files
  manageHr: boolean; // Legacy: Full Control
  createHr?: boolean;
  editHr?: boolean;
  deleteHr?: boolean;

  // Operations Module
  viewOps: boolean; // See overtime, sanctions
  manageOps: boolean; // Legacy: Full Control
  createOps?: boolean;
  editOps?: boolean;
  deleteOps?: boolean;
  approveOps?: boolean; // Sanctions approval

  // Finance Module
  viewFinance: boolean; // See Dashboard costs, Wallet balance
  manageFinance: boolean; // Legacy: Full Control
  createFinance?: boolean;
  editFinance?: boolean;
  deleteFinance?: boolean;
  approveFinance?: boolean; // Budget Requests

  // Inventory & Stock
  viewInventory: boolean;
  manageInventory: boolean; // Legacy: Full Control
  createInventory?: boolean;
  editInventory?: boolean;
  deleteInventory?: boolean;

  // System
  superAdmin: boolean; // Manage Users, Global Settings
}

export interface User {
  id: string;
  username: string;
  email: string; // New field
  password: string; // In a real app, this should be hashed
  role: UserRole; // Kept for legacy/label purposes
  permissions: UserPermissions; // Granular control
  name: string;
  lastLogin?: string; // New field ISO Date
  photoUrl?: string;
  lastActive?: string; // ISO Date for presence
  status?: 'active' | 'break'; // New Presence Status
  tags?: AdminTag[]; // Admin specific tags for Budget/HR flow
}

// INVENTORY TYPES
export interface InventoryItem {
  id: string;
  name: string;
  unit: string; // kg, un, paq
}

export interface InventorySession {
  id: string;
  date: string; // ISO Date
  status: 'OPEN' | 'CLOSED' | 'VOID';
  openedBy: string; // Name
  startTime?: string; // HH:mm
  closedBy?: string; // Name
  endTime?: string; // HH:mm
  data: {
    itemId: string;
    initial: number;
    final?: number;
    consumption?: number;
  }[];
  voidedBy?: string; // Audit
  voidedAt?: string; // Audit
}

// CASH REGISTER TYPES
export type CashCategory = 'VENTA' | 'INSUMOS' | 'PERSONAL' | 'GASTOS_VARIOS' | 'RETIRO' | 'OTROS';

export interface CashShift {
  id: string;
  date: string; // ISO Date
  status: 'OPEN' | 'CLOSED' | 'ANULADO'; // Added ANULADO

  // Opening
  openedBy: string;
  openTime: string;
  initialAmount: number;

  // Closing
  closedBy?: string;
  closeTime?: string;
  finalCash?: number; // Physical cash count
  finalTransfer?: number; // Total transfer income declared

  // New Order Stats
  ordersFudo?: number;
  ordersPedidosYa?: number;

  transactions: CashTransaction[];
  salesDataSnapshot?: any[]; // Snapshot of imported XLS
}

export interface CashTransaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  method: 'CASH' | 'TRANSFER';
  category: CashCategory;
  amount: number;
  description: string;
  time: string; // HH:mm
  createdBy: string;
  status?: 'ACTIVE' | 'ANULADO'; // New field for soft delete
}

// PRODUCT & FINANCE TYPES
export interface Product {
  id: string;
  name: string;
  laborCost: number; // Mano de obra
  materialCost: number; // Materia prima
  royalties: number; // Regalías
  profit: number; // Ganancia
  ingredients?: Record<string, number>; // Map of IngredientName -> Quantity
}

export interface CalculatorProjection {
  id: string;
  date: string;
  totalSales: number; // Theoretical
  realSales?: number; // Actual input
  netProfit: number;
  royalties: number;
  itemsSnapshot: { name: string; qty: number }[];
  createdBy: string;
}

export type FixedExpenseCategory = 'INFRAESTRUCTURA' | 'MATERIA_PRIMA' | 'SUELDOS' | 'OTROS';

export interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  paidAmount: number; // Track partial payments
  dueDate: string; // ISO Date String (YYYY-MM-DD)
  isPaid: boolean;
  lastPaidDate?: string;
  category?: FixedExpenseCategory; // New categorization

  // Payment Details
  paymentMethod?: PaymentMethod;
  cbu?: string;
  alias?: string;
  bank?: string;
}

// WALLET & ROYALTIES
export interface WalletTransaction {
  id: string;
  date: string; // ISO Date
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'ADJUSTMENT' | 'TRANSFER';
  category: string;
  description: string;
  createdBy: string;
  time: string; // HH:mm
  method?: PaymentMethod; // Added method for tracking
  imageUrl?: string; // New field for receipt image

  // Soft Delete
  deletedAt?: string;
  deletedBy?: string;

  // Scheduling
  status?: 'COMPLETED' | 'SCHEDULED' | 'CANCELLED';
  scheduledDate?: string; // ISO Date for execution

  // Relations
  relatedUserId?: string; // Employee ID or Partner ID
  relatedUser?: string; // Name snapshot
}

export interface Partner {
  id: string;
  name: string;
  sharePercentage: number; // e.g. 25 for 25%
  balance?: number; // Individual accumulated balance
  cbu?: string;
  alias?: string;
  bank?: string;
}

export interface RoyaltyPayment {
  id: string;
  date: string;
  partnerId: string;
  amount: number;
  status: 'PAID' | 'PENDING';
}

export interface RoyaltyHistoryItem {
  id: string;
  date: string;
  type: 'INCOME' | 'EXPENSE' | 'PAYMENT';
  amount: number;
  description: string;
  user: string;
  data?: any;
}


// AI BUDGET TYPES
export interface BudgetCategory {
  name: string;
  percentage: number;
  amount: number;
  color: string; // Hex code
  description: string;
  [key: string]: any;
}

export interface BudgetAnalysis {
  healthScore: number; // 0-100
  healthStatus: 'CRITICAL' | 'WARNING' | 'HEALTHY';
  realAvailableMoney: number; // Balance - Obligations
  obligations: number;
  allocations: BudgetCategory[];
  actionableTips: string[];
}

// CONFIGURATION TYPES
export enum View {
  DASHBOARD = 'DASHBOARD',

  // Operations Group
  EMPLOYEES = 'EMPLOYEES',
  OVERTIME = 'OVERTIME',
  SANCTIONS = 'SANCTIONS',
  FILES = 'FILES',
  CASH_REGISTER = 'CASH_REGISTER',

  // Admin Group
  ADMIN_HUB = 'ADMIN_HUB',
  OFFICE = 'OFFICE',
  PAYROLL = 'PAYROLL',
  USERS = 'USERS',
  PRODUCTS = 'PRODUCTS',
  SETTINGS = 'SETTINGS',

  // Finance Group (New)
  FINANCE = 'FINANCE', // Calculator
  WALLET = 'WALLET', // New
  ROYALTIES = 'ROYALTIES', // New
  STATISTICS = 'STATISTICS', // New

  // Strategy Group
  AI_REPORT = 'AI_REPORT',
  FORUM = 'FORUM',

  // Under Construction Group
  INVENTORY = 'INVENTORY',
  AI_FOCUS = 'AI_FOCUS',

  // Member Specific Views
  MEMBER_HOME = 'MEMBER_HOME',
  MEMBER_CALENDAR = 'MEMBER_CALENDAR',
  MEMBER_TASKS = 'MEMBER_TASKS',
  MEMBER_FILE = 'MEMBER_FILE',
  MEMBER_FORUM = 'MEMBER_FORUM',

  // Communication
  INTERNAL_MAIL = 'INTERNAL_MAIL',
  NOTICES = 'NOTICES',
  SUPPLIERS = 'SUPPLIERS',
  BUDGET_REQUESTS = 'BUDGET_REQUESTS' // New view
}

export interface AIAnalysisState {
  loading: boolean;
  result: string | null;
  error: string | null;
}

// Duplicate removed

// Granular Permissions System
export type PermissionKey =
  | 'canViewInventory'
  | 'canViewCash'
  | 'canViewFinancials' // Salary, payments, debts
  | 'canViewChecklist'
  | 'canViewProfile' // Detailed profile, file
  | 'canViewCalendar'
  | 'canViewForum'
  | 'canViewCommunication' // Mail, Notices
  | 'canViewSuppliers'
  | 'canViewBudgetRequests'
  | 'canViewDashboard'
  | 'canViewHR'
  | 'canViewFiles'
  | 'canViewOvertime' // Control Hs
  | 'canViewPayroll' // Sueldos
  | 'canViewSanctions'
  | 'canViewUsers' // System Users (Admin/Manager)
  | 'canViewSettings'
  | 'canViewOffice' // oficina administrativa
  | 'canViewProducts' // Products management
  | 'canViewFinance' // Finance Dashboard (was generic)
  | 'canViewWallet' // Billetera
  | 'canViewRoyalties';

export interface RolePermissions {
  [role: string]: PermissionKey[];
}

export interface DashboardWidget {
  id: string;
  title: string;
  visible: boolean;
  order: number;
  component?: React.ReactNode; // For internal use
}

export interface WidgetConfig {
  userId: string;
  layout: DashboardWidget[];
}

export interface BaseEntity {
  id: string;
  updatedAt?: string;
}

export interface Supplier {
  id: string;
  name: string;
  category: string;
  contact?: string;
  phone?: string;
  email?: string;
  cbu?: string; // Bank Details
  alias?: string;
  bank?: string;
  notes?: string;
  updatedAt: string;
  createdBy?: string; // Audit
  updatedBy?: string; // Audit
}

export interface SupplierProduct {
  id: string;
  supplierId: string;
  name: string;
  brand?: string;
  unit: string; // kg, lt, un, caja, paq
  price: number;
  photoUrl?: string; // Product Image
  previousPrice?: number; // New field for price comparison
  lastPriceUpdate: string;
  category?: string;
  minQuantity?: number; // for stock alerts (future)
  currentStock?: number; // Current persistent stock level
  updatedAt: string;
  createdBy?: string; // Audit
  updatedBy?: string; // Audit
}

export interface ShoppingListItem {
  productId: string;
  productName: string;
  quantity: number;
  checked: boolean;
  unit: string;
  supplierId?: string;
  supplierName?: string;
  estimatedCost?: number;
}

export interface ShoppingList extends BaseEntity {
  title: string;
  createdAt: string;
  status: 'DRAFT' | 'PENDING' | 'COMPLETED' | 'ARCHIVED';
  items: ShoppingListItem[];
  totalEstimated: number;
}

// ADMIN TAGS SYSTEM
export type AdminTag = 'CUENTA_ADMINISTRADORA' | 'FINANZAS' | 'INSUMOS' | 'RECURSOS_HUMANOS' | 'CEO' | string;

// BUDGET & CASH FLOW
export type BudgetRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

export interface BudgetRequest {
  id: string;
  amount: number;
  reason: string;
  supplierName?: string; // Optional context
  requestedBy: string; // User ID or Name
  requestedAt: string; // ISO Date
  status: BudgetRequestStatus;

  // Approval Flow
  reviewedBy?: string; // Finance User
  reviewedAt?: string;
  rejectionReason?: string;

  // Linked Transactions
  walletTransactionId?: string; // Expenses from Global Wallet
  cashRequestId?: string; // Link to the cash movement request
}

export interface CashMovementRequest {
  id: string;
  budgetRequestId: string;
  amount: number;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  approvedBy?: string; // Cashier/Manager
  approvedAt?: string;
}
export interface OfficeDocAttachment {
  id: string;
  module: 'INVENTORY' | 'CASH_SHIFT' | 'CALENDAR' | 'OVERTIME' | 'GENERIC';
  refId: string; // The ID of the original record
  label: string; // Display text (e.g. "Cierre Cajero 12/04")
  date: string;
  data?: any; // Snapshot of key data to render without fetching
}

export interface OfficeDocument {
  id: string;
  title: string;
  type: 'DOC' | 'SHEET';
  content: string;
  authors: string[];
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'TRASHED';
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  pinned?: boolean;
  sharedWith?: string[]; // Array of User IDs
  readBy?: string[]; // Array of User IDs who opened it
  attachments?: OfficeDocAttachment[];
  imageUrl?: string; // New field for header image
}


export interface UserActivityLog {
  id: string;
  userId: string;
  view: string;
  startTime: string; // ISO Date
  endTime?: string; // ISO Date
  durationSeconds?: number;
  date: string; // ISO Date YYYY-MM-DD
}

export interface OfficeStickyNote {
  id: string;
  authorId: string;
  title: string; // Short title
  content: string; // Body
  color: string; // e.g., 'yellow', 'blue', 'pink'
  date: string;
}

// PAYROLL & LEDGER SYSTEM
export type PayrollMovementType = 'ASISTENCIA' | 'PAGO' | 'DESCUENTO' | 'REINICIO' | 'AJUSTE' | 'FERIADO' | 'BONO';

export interface PayrollMovement {
  id: string;
  employee_id: string;
  attendance_id?: string; // Optional link to OvertimeRecord
  type: PayrollMovementType;
  amount: number;
  date: string; // ISO YYYY-MM-DD
  description: string;
  created_by?: string;
  created_at?: string;
  status?: 'ACTIVE' | 'ANULADO'; // Soft delete
  meta?: any; // Stores officialMinutes, workedMinutes, tax, holidays, etc.
}

// AI CONVERSATION
export interface WalletChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  date: string; // ISO String
  meta?: any; // Context used for that logical step
}
