import React, { createContext, useReducer, useEffect, useContext } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import { 
  Account, 
  Transaction, 
  Category, 
  Contact, 
  FinanceData, 
  Split 
} from '../types/finance';

export interface Settings {
  currencySymbol: string;
  isDarkMode: boolean;
  monthlyBudget?: number;
}

export type DateFilterPreset = 'month' | '7days' | '30days' | 'year' | 'custom';

export interface DateFilterConfig {
  rangePreset: DateFilterPreset;
  currentMonthDate: string; // ISO string
  customStartDate: string; // "YYYY-MM-DD"
  customEndDate: string; // "YYYY-MM-DD"
}

export const getDefaultDateFilter = (): DateFilterConfig => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
  const startStr = `${y}-${m}-01`;
  const endStr = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;

  return {
    rangePreset: 'month',
    currentMonthDate: new Date(y, now.getMonth(), 1).toISOString(),
    customStartDate: startStr,
    customEndDate: endStr,
  };
};

interface FinanceState extends FinanceData {
  settings: Settings;
  dateFilter: DateFilterConfig;
  isLoading: boolean;
}

type FinanceAction =
  | { type: 'LOAD_DATA'; payload: { data: FinanceData; settings: Settings; dateFilter?: DateFilterConfig } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_DATA'; payload: FinanceData }
  | { type: 'UPDATE_SETTINGS'; payload: Settings }
  | { type: 'UPDATE_DATE_FILTER'; payload: DateFilterConfig };

const initialState: FinanceState = {
  accounts: [],
  transactions: [],
  categories: [],
  contacts: [],
  settings: {
    currencySymbol: '', // default is empty (no prefix, just formatted number)
    isDarkMode: false,
    monthlyBudget: 0,
  },
  dateFilter: getDefaultDateFilter(),
  isLoading: true,
};

const FinanceContext = createContext<{
  state: FinanceState;
  addAccount: (account: Omit<Account, 'id' | 'balance'>) => Promise<void>;
  editAccount: (account: Account) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  editTransaction: (transaction: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  editCategory: (category: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addContact: (name: string) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  settleContactBalance: (contactId: string, accountId: string) => Promise<void>;
  exportBackupData: () => Promise<void>;
  importBackupData: () => Promise<{ success: boolean; message: string; summary?: string; pendingData?: FinanceData } | undefined>;
  confirmImport: (data: FinanceData) => Promise<void>;
  updateSettings: (settings: Settings) => Promise<void>;
  updateDateFilter: (filter: DateFilterConfig) => Promise<void>;
} | undefined>(undefined);

// Helper function to recompute balances of all accounts dynamically
const recomputeAccountBalances = (accounts: Account[], transactions: Transaction[]): Account[] => {
  return accounts.map(account => {
    let balance = Number(account.initialBalance || 0);
    
    transactions.forEach(tx => {
      const amount = Number(tx.amount || 0);
      if (tx.type === 'Expense') {
        if (tx.accountId === account.id) {
          balance -= amount;
        }
      } else if (tx.type === 'Income') {
        if (tx.accountId === account.id) {
          balance += amount;
        }
      } else if (tx.type === 'Transfer') {
        if (tx.accountId === account.id) {
          balance -= amount;
        }
        if (tx.toAccountId === account.id) {
          balance += amount;
        }
      }
    });

    return {
      ...account,
      balance,
    };
  });
};

const validateFinanceData = (data: any): string | null => {
  if (!data || typeof data !== 'object') return 'Invalid data format. Expected an object.';
  
  if (!data.accounts) data.accounts = [];
  if (!data.transactions) data.transactions = [];
  if (!data.categories) data.categories = [];
  if (!data.contacts) data.contacts = [];

  const { accounts, transactions, categories, contacts } = data;
  if (!Array.isArray(accounts)) return 'Invalid accounts array.';
  if (!Array.isArray(transactions)) return 'Invalid transactions array.';
  if (!Array.isArray(categories)) return 'Invalid categories array.';
  if (!Array.isArray(contacts)) return 'Invalid contacts array.';

  // Validate accounts
  for (let i = 0; i < accounts.length; i++) {
    const acc = accounts[i];
    if (!acc.id || typeof acc.id !== 'string') return `Account at index ${i} has invalid id.`;
    if (!acc.name || typeof acc.name !== 'string') return `Account at index ${i} has invalid name.`;
    if (!['Bank', 'Wallet', 'Cash'].includes(acc.type)) return `Account at index ${i} has invalid type.`;
    if (typeof acc.initialBalance !== 'number') return `Account at index ${i} has invalid initialBalance.`;
    if (!acc.color || typeof acc.color !== 'string') return `Account at index ${i} has invalid color.`;
  }

  // Validate transactions
  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    if (!tx.id || typeof tx.id !== 'string') return `Transaction at index ${i} has invalid id.`;
    if (!tx.accountId || typeof tx.accountId !== 'string') return `Transaction at index ${i} has invalid accountId.`;
    if (!['Expense', 'Income', 'Transfer'].includes(tx.type)) return `Transaction at index ${i} has invalid type.`;
    if (typeof tx.amount !== 'number') return `Transaction at index ${i} has invalid amount.`;
    if (typeof tx.category !== 'string') return `Transaction at index ${i} has invalid category.`;
    if (!tx.date || typeof tx.date !== 'string') return `Transaction at index ${i} has invalid date.`;
    if (tx.type === 'Transfer' && (!tx.toAccountId || typeof tx.toAccountId !== 'string')) {
      return `Transaction at index ${i} is a Transfer but missing toAccountId.`;
    }
  }

  // Validate categories
  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    if (!cat.id || typeof cat.id !== 'string') return `Category at index ${i} has invalid id.`;
    if (!cat.name || typeof cat.name !== 'string') return `Category at index ${i} has invalid name.`;
    if (!cat.icon || typeof cat.icon !== 'string') return `Category at index ${i} has invalid icon.`;
    if (!cat.color || typeof cat.color !== 'string') return `Category at index ${i} has invalid color.`;
    if (!['Expense', 'Income'].includes(cat.type)) return `Category at index ${i} has invalid type.`;
  }

  // Validate contacts
  for (let i = 0; i < contacts.length; i++) {
    const con = contacts[i];
    if (!con.id || typeof con.id !== 'string') return `Contact at index ${i} has invalid id.`;
    if (!con.name || typeof con.name !== 'string') return `Contact at index ${i} has invalid name.`;
  }

  return null;
};

function financeReducer(state: FinanceState, action: FinanceAction): FinanceState {
  switch (action.type) {
    case 'LOAD_DATA':
      return {
        ...state,
        ...action.payload.data,
        settings: action.payload.settings,
        dateFilter: action.payload.dateFilter || state.dateFilter,
        isLoading: false,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'SET_DATA':
      return {
        ...state,
        ...action.payload,
      };
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: action.payload,
      };
    case 'UPDATE_DATE_FILTER':
      return {
        ...state,
        dateFilter: action.payload,
      };
    default:
      return state;
  }
}

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(financeReducer, initialState);

  // Load data from AsyncStorage on startup
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const accountsStr = await AsyncStorage.getItem('accounts');
        const transactionsStr = await AsyncStorage.getItem('transactions');
        const categoriesStr = await AsyncStorage.getItem('categories');
        const contactsStr = await AsyncStorage.getItem('contacts');
        const settingsStr = await AsyncStorage.getItem('settings');
        const dateFilterStr = await AsyncStorage.getItem('dashboard_date_filter');

        const loadedAccounts: Account[] = accountsStr ? JSON.parse(accountsStr) : [];
        const loadedTransactions: Transaction[] = transactionsStr ? JSON.parse(transactionsStr) : [];
        const loadedCategories: Category[] = categoriesStr ? JSON.parse(categoriesStr) : [];
        const loadedContacts: Contact[] = contactsStr ? JSON.parse(contactsStr) : [];
        
        const loadedSettings: Settings = settingsStr 
          ? JSON.parse(settingsStr) 
          : { currencySymbol: '', isDarkMode: false, monthlyBudget: 0 };
        
        // Ensure defaults if fields are missing in loaded settings
        if (loadedSettings.isDarkMode === undefined) {
          loadedSettings.isDarkMode = false;
        }
        if (loadedSettings.monthlyBudget === undefined) {
          loadedSettings.monthlyBudget = 0;
        }

        let loadedDateFilter = getDefaultDateFilter();
        if (dateFilterStr) {
          try {
            const parsed = JSON.parse(dateFilterStr);
            if (parsed && parsed.rangePreset) {
              loadedDateFilter = parsed;
            }
          } catch (e) {
            console.warn('Failed to parse cached date filter:', e);
          }
        }

        // Ensure accounts have correct recomputed balances
        const recomputedAccounts = recomputeAccountBalances(loadedAccounts, loadedTransactions);

        dispatch({
          type: 'LOAD_DATA',
          payload: {
            data: {
              accounts: recomputedAccounts,
              transactions: loadedTransactions,
              categories: loadedCategories,
              contacts: loadedContacts,
            },
            settings: loadedSettings,
            dateFilter: loadedDateFilter,
          },
        });
      } catch (error) {
        console.error('Failed to load data from storage:', error);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    loadSavedData();
  }, []);

  // Generic helper to save data both in State & AsyncStorage
  const saveStateAndStorage = async (newData: Partial<FinanceData>) => {
    try {
      const updatedAccounts = newData.accounts ?? state.accounts;
      const updatedTransactions = newData.transactions ?? state.transactions;
      const updatedCategories = newData.categories ?? state.categories;
      const updatedContacts = newData.contacts ?? state.contacts;

      // Recompute account balances automatically based on transactions
      const finalAccounts = recomputeAccountBalances(updatedAccounts, updatedTransactions);

      // Save to AsyncStorage
      await AsyncStorage.setItem('accounts', JSON.stringify(finalAccounts));
      await AsyncStorage.setItem('transactions', JSON.stringify(updatedTransactions));
      await AsyncStorage.setItem('categories', JSON.stringify(updatedCategories));
      await AsyncStorage.setItem('contacts', JSON.stringify(updatedContacts));

      // Update context state
      dispatch({
        type: 'SET_DATA',
        payload: {
          accounts: finalAccounts,
          transactions: updatedTransactions,
          categories: updatedCategories,
          contacts: updatedContacts,
        },
      });
    } catch (error) {
      console.error('Failed to save data:', error);
      throw error;
    }
  };

  // --- ACCOUNTS CRUD ---
  const addAccount = async (accountData: Omit<Account, 'id' | 'balance'>) => {
    const id = Date.now().toString();
    const newAccount: Account = {
      ...accountData,
      id,
      balance: accountData.initialBalance,
    };

    let updatedAccounts = [...state.accounts, newAccount];
    if (newAccount.isDefault) {
      // Toggle default for others
      updatedAccounts = updatedAccounts.map(acc => 
        acc.id === id ? acc : { ...acc, isDefault: false }
      );
    }
    await saveStateAndStorage({ accounts: updatedAccounts });
  };

  const editAccount = async (updatedAccount: Account) => {
    let updatedAccounts = state.accounts.map(acc => 
      acc.id === updatedAccount.id ? updatedAccount : acc
    );
    if (updatedAccount.isDefault) {
      updatedAccounts = updatedAccounts.map(acc => 
        acc.id === updatedAccount.id ? acc : { ...acc, isDefault: false }
      );
    }
    await saveStateAndStorage({ accounts: updatedAccounts });
  };

  const deleteAccount = async (id: string) => {
    const updatedAccounts = state.accounts.filter(acc => acc.id !== id);
    await saveStateAndStorage({ accounts: updatedAccounts });
  };

  // --- TRANSACTIONS CRUD ---
  const addTransaction = async (transactionData: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...transactionData,
      id: Date.now().toString(),
    };
    const updatedTransactions = [...state.transactions, newTransaction];
    await saveStateAndStorage({ transactions: updatedTransactions });
  };

  const editTransaction = async (updatedTransaction: Transaction) => {
    const updatedTransactions = state.transactions.map(tx => 
      tx.id === updatedTransaction.id ? updatedTransaction : tx
    );
    await saveStateAndStorage({ transactions: updatedTransactions });
  };

  const deleteTransaction = async (id: string) => {
    const updatedTransactions = state.transactions.filter(tx => tx.id !== id);
    await saveStateAndStorage({ transactions: updatedTransactions });
  };

  // --- CATEGORIES CRUD ---
  const addCategory = async (categoryData: Omit<Category, 'id'>) => {
    const newCategory: Category = {
      ...categoryData,
      id: Date.now().toString(),
    };
    const updatedCategories = [...state.categories, newCategory];
    await saveStateAndStorage({ categories: updatedCategories });
  };

  const editCategory = async (updatedCategory: Category) => {
    const updatedCategories = state.categories.map(cat => 
      cat.id === updatedCategory.id ? updatedCategory : cat
    );
    await saveStateAndStorage({ categories: updatedCategories });
  };

  const deleteCategory = async (id: string) => {
    const updatedCategories = state.categories.filter(cat => cat.id !== id);
    await saveStateAndStorage({ categories: updatedCategories });
  };

  // --- CONTACTS CRUD ---
  const addContact = async (name: string) => {
    const newContact: Contact = {
      id: Date.now().toString(),
      name,
    };
    const updatedContacts = [...state.contacts, newContact];
    await saveStateAndStorage({ contacts: updatedContacts });
  };

  const deleteContact = async (id: string) => {
    const updatedContacts = state.contacts.filter(c => c.id !== id);
    await saveStateAndStorage({ contacts: updatedContacts });
  };

  // --- SETTLE SPLITS / RECEIVABLES ---
  const settleContactBalance = async (contactId: string, accountId: string) => {
    const contact = state.contacts.find(c => c.id === contactId);
    if (!contact) return;

    let owedToUs = 0;
    let weOwe = 0;

    state.transactions.forEach(tx => {
      if (!tx.isReceivable) return;

      if (tx.splits && tx.splits.length > 0) {
        tx.splits.forEach(s => {
          if (s.contactId === contactId && !s.isSettled) {
            if (tx.type === 'Expense') {
              owedToUs += s.amount;
            } else if (tx.type === 'Income') {
              weOwe += s.amount;
            }
          }
        });
      } else if (tx.contactId === contactId) {
        if (tx.type === 'Expense') {
          owedToUs += tx.amount;
        } else if (tx.type === 'Income') {
          weOwe += tx.amount;
        }
      }
    });

    const netOwed = owedToUs - weOwe;
    if (netOwed === 0) return;

    // 1. Settle in existing transactions
    const updatedTransactions = state.transactions.map(tx => {
      if (!tx.isReceivable) return tx;

      if (tx.splits && tx.splits.length > 0) {
        const hasContactSplit = tx.splits.some(s => s.contactId === contactId);
        if (hasContactSplit) {
          const splits = tx.splits.map(s => 
            s.contactId === contactId ? { ...s, isSettled: true } : s
          );
          return {
            ...tx,
            splits,
          };
        }
      } else if (tx.contactId === contactId) {
        return {
          ...tx,
          splits: [{ contactId, amount: tx.amount, isSettled: true }],
        };
      }
      return tx;
    });

    // 2. Add Settlement Transaction
    const settlementTx: Transaction = {
      id: Date.now().toString(),
      accountId,
      type: netOwed > 0 ? 'Income' : 'Expense',
      amount: Math.abs(netOwed),
      description: `Settlement with ${contact.name}`,
      category: 'Settlement',
      date: new Date().toISOString(),
      isReceivable: false,
    };

    updatedTransactions.push(settlementTx);

    await saveStateAndStorage({ transactions: updatedTransactions });
  };

  // --- BACKUP & RESTORE ---
  const exportBackupData = async () => {
    try {
      const dataToExport: FinanceData = {
        accounts: state.accounts,
        transactions: state.transactions,
        categories: state.categories,
        contacts: state.contacts,
      };

      const jsonString = JSON.stringify(dataToExport, null, 2);

      if (Platform.OS === 'web') {
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'finance_backup.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }

      const file = new File(Paths.cache, 'finance_backup.json');
      if (file.exists) {
        file.delete();
      }
      file.create();
      file.write(jsonString);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Finance Data',
        });
      } else {
        alert('Sharing is not supported on this platform');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to export backup: ' + e);
    }
  };

  const importBackupData = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/json', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const fileUri = asset.uri;
      let fileContent = '';

      if (Platform.OS === 'web') {
        const fileObj = (asset as any).file;
        if (fileObj && typeof fileObj.text === 'function') {
          fileContent = await fileObj.text();
        } else {
          const response = await fetch(fileUri);
          fileContent = await response.text();
        }
      } else {
        let readSuccess = false;

        // Strategy 1: Modern Expo 57 File API
        try {
          const file = new File(fileUri);
          fileContent = await file.text();
          if (fileContent && fileContent.trim().length > 0) {
            readSuccess = true;
          }
        } catch (e1) {
          console.warn('File.text() failed, trying fetch fallback:', e1);
        }

        // Strategy 2: React Native native fetch() on local file/content URI
        if (!readSuccess) {
          try {
            const response = await fetch(fileUri);
            fileContent = await response.text();
            if (fileContent && fileContent.trim().length > 0) {
              readSuccess = true;
            }
          } catch (e2) {
            console.warn('fetch() fallback failed, trying legacy readAsStringAsync:', e2);
          }
        }

        // Strategy 3: Legacy FileSystem.readAsStringAsync fallback
        if (!readSuccess) {
          try {
            fileContent = await FileSystem.readAsStringAsync(fileUri, {
              encoding: FileSystem.EncodingType.UTF8,
            });
            if (fileContent && fileContent.trim().length > 0) {
              readSuccess = true;
            }
          } catch (e3) {
            console.warn('Legacy readAsStringAsync failed:', e3);
          }
        }

        if (!readSuccess || !fileContent.trim()) {
          return {
            success: false,
            message: 'Unable to read the selected file. Please ensure it is a valid JSON file and accessible on your device.',
          };
        }
      }

      let parsedData: any;
      try {
        parsedData = JSON.parse(fileContent);
      } catch (e) {
        return { success: false, message: 'Invalid JSON file structure.' };
      }

      const validationError = validateFinanceData(parsedData);
      if (validationError) {
        return { success: false, message: validationError };
      }

      const summary = `This will replace:\n- ${parsedData.accounts.length} accounts\n- ${parsedData.transactions.length} transactions\n- ${parsedData.categories.length} categories\n- ${parsedData.contacts.length} contacts\n\nDo you want to continue?`;

      return {
        success: true,
        message: 'File validated successfully.',
        summary,
        pendingData: parsedData as FinanceData,
      };
    } catch (e) {
      console.error(e);
      return { success: false, message: 'An error occurred while importing: ' + e };
    }
  };

  const confirmImport = async (data: FinanceData) => {
    await saveStateAndStorage(data);
  };

  const updateSettings = async (newSettings: Settings) => {
    await AsyncStorage.setItem('settings', JSON.stringify(newSettings));
    dispatch({ type: 'UPDATE_SETTINGS', payload: newSettings });
  };

  const updateDateFilter = async (filter: DateFilterConfig) => {
    dispatch({ type: 'UPDATE_DATE_FILTER', payload: filter });
    try {
      await AsyncStorage.setItem('dashboard_date_filter', JSON.stringify(filter));
    } catch (e) {
      console.error('Failed to save date filter to cache:', e);
    }
  };

  return (
    <FinanceContext.Provider
      value={{
        state,
        addAccount,
        editAccount,
        deleteAccount,
        addTransaction,
        editTransaction,
        deleteTransaction,
        addCategory,
        editCategory,
        deleteCategory,
        addContact,
        deleteContact,
        settleContactBalance,
        exportBackupData,
        importBackupData,
        confirmImport,
        updateSettings,
        updateDateFilter,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) throw new Error('useFinance must be used within FinanceProvider');
  return context;
};
