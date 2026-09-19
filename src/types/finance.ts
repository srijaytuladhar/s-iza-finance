export type AccountType = 'Bank' | 'Wallet' | 'Cash';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  initialBalance: number;
  color: string; // hex
  isDefault?: boolean;
}

export type TransactionType = 'Expense' | 'Income' | 'Transfer';

export interface Split {
  contactId: string;
  amount: number;
  isSettled?: boolean;
}

export interface Transaction {
  id: string;
  accountId: string;
  toAccountId?: string; // only for Transfer
  type: TransactionType;
  amount: number;
  description?: string;
  category: string; // category name
  date: string; // ISO 8601
  isReceivable?: boolean; // true if this expense/income involves a contact owing/being owed
  contactId?: string;
  splits?: Split[]; // for bill-splitting among multiple contacts
  isSettled?: boolean; // true if single receivable or transaction is fully settled
}

export type CategoryType = 'Expense' | 'Income';

export interface Category {
  id: string;
  name: string;
  icon: string; // fa-* or pi-* icon name
  color: string; // hex
  type: CategoryType;
}

export interface Contact {
  id: string;
  name: string;
}

export interface FinanceData {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  contacts: Contact[];
}
