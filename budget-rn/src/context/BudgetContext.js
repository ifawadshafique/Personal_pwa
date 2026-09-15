import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleDailyReminder, requestNotificationPermission } from '../utils/notifications';

const BudgetContext = createContext();

export function useBudget() {
  return useContext(BudgetContext);
}

// Your real monthly budget categories with exact allocations
const DEFAULT_CATEGORIES = [
  { id: 'cat-food',     name: 'Food',         color: '#FF6B6B', budget: 13950 },
  { id: 'cat-transport',name: 'Transport',    color: '#FFD93D', budget: 3560  },
  { id: 'cat-rent',     name: 'Rent',         color: '#6BCB77', budget: 3000  },
  { id: 'cat-books',    name: 'Books',        color: '#4D96FF', budget: 3000  },
  { id: 'cat-personal', name: 'Personal',     color: '#C77DFF', budget: 1750  },
  { id: 'cat-utilities',name: 'Utilities',    color: '#FFA500', budget: 1000  },
  { id: 'cat-mobile',   name: 'Mobile',       color: '#00C9A7', budget: 1000  },
  { id: 'cat-laundry',  name: 'Laundry',      color: '#8ea1a3', budget: 250   },
];

// Your real salary split
const DEFAULT_PLAN = {
  salary:    60000,
  committee: 20000,
  loan:      10000,
  categories: DEFAULT_CATEGORIES,
};

export function BudgetProvider({ children }) {
  const [plan,            setPlan]            = useState(null);
  const [monthExpenses,   setMonthExpenses]   = useState([]);
  const [deletedExpenses, setDeletedExpenses] = useState([]);  // ← recycle bin

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const planData = await AsyncStorage.getItem('@plan');
      if (planData) {
        const parsed = JSON.parse(planData);
        setPlan({ ...DEFAULT_PLAN, ...parsed, categories: DEFAULT_CATEGORIES });
      } else {
        await AsyncStorage.setItem('@plan', JSON.stringify(DEFAULT_PLAN));
        setPlan(DEFAULT_PLAN);
      }

      // Request notification permission once on first load
      requestNotificationPermission();

      const expensesData = await AsyncStorage.getItem('@expenses');
      if (expensesData) {
        setMonthExpenses(JSON.parse(expensesData));
      } else {
        await AsyncStorage.setItem('@expenses', JSON.stringify([]));
        setMonthExpenses([]);
      }

      // Load recycle bin
      const binData = await AsyncStorage.getItem('@deleted_expenses');
      if (binData) {
        setDeletedExpenses(JSON.parse(binData));
      } else {
        await AsyncStorage.setItem('@deleted_expenses', JSON.stringify([]));
        setDeletedExpenses([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Re-schedule 10 PM notification whenever expenses or plan changes
  useEffect(() => {
    if (!plan) return;
    const today = new Date().toISOString().slice(0, 10);
    const todayExpenses = monthExpenses.filter(e => e.date === today);
    scheduleDailyReminder(todayExpenses, plan.categories);
  }, [monthExpenses, plan]);

  const updatePlan = async (newPlan) => {
    try {
      await AsyncStorage.setItem('@plan', JSON.stringify(newPlan));
      setPlan(newPlan);
    } catch (e) {
      console.error(e);
    }
  };

  const addExpense = async (expense) => {
    try {
      const newExpenses = [...monthExpenses, expense];
      await AsyncStorage.setItem('@expenses', JSON.stringify(newExpenses));
      setMonthExpenses(newExpenses);
    } catch (e) {
      console.error(e);
    }
  };

  // Move expense to recycle bin (soft delete)
  const deleteExpense = async (expenseId) => {
    try {
      const target = monthExpenses.find(e => e.id === expenseId);
      if (!target) return;

      const newExpenses = monthExpenses.filter(e => e.id !== expenseId);
      const newBin      = [
        { ...target, deletedAt: new Date().toISOString() },
        ...deletedExpenses,
      ];

      await AsyncStorage.setItem('@expenses',         JSON.stringify(newExpenses));
      await AsyncStorage.setItem('@deleted_expenses', JSON.stringify(newBin));
      setMonthExpenses(newExpenses);
      setDeletedExpenses(newBin);
    } catch (e) {
      console.error(e);
    }
  };

  // Restore an expense from the recycle bin
  const restoreExpense = async (expenseId) => {
    try {
      const target = deletedExpenses.find(e => e.id === expenseId);
      if (!target) return;

      const { deletedAt, ...restoredExp } = target;  // strip deletedAt
      const newExpenses = [...monthExpenses, restoredExp];
      const newBin      = deletedExpenses.filter(e => e.id !== expenseId);

      await AsyncStorage.setItem('@expenses',         JSON.stringify(newExpenses));
      await AsyncStorage.setItem('@deleted_expenses', JSON.stringify(newBin));
      setMonthExpenses(newExpenses);
      setDeletedExpenses(newBin);
    } catch (e) {
      console.error(e);
    }
  };

  // Permanently remove one item from recycle bin
  const permanentlyDelete = async (expenseId) => {
    try {
      const newBin = deletedExpenses.filter(e => e.id !== expenseId);
      await AsyncStorage.setItem('@deleted_expenses', JSON.stringify(newBin));
      setDeletedExpenses(newBin);
    } catch (e) {
      console.error(e);
    }
  };

  // Empty the entire recycle bin
  const emptyRecycleBin = async () => {
    try {
      await AsyncStorage.setItem('@deleted_expenses', JSON.stringify([]));
      setDeletedExpenses([]);
    } catch (e) {
      console.error(e);
    }
  };

  const clearMonthExpenses = async () => {
    try {
      await AsyncStorage.setItem('@expenses', JSON.stringify([]));
      setMonthExpenses([]);
    } catch (e) {
      console.error(e);
    }
  };

  // Derived: flexible budget
  const flexibleBudget = plan
    ? plan.salary - plan.committee - plan.loan
    : 0;

  return (
    <BudgetContext.Provider
      value={{
        plan,
        updatePlan,
        monthExpenses,
        addExpense,
        deleteExpense,
        clearMonthExpenses,
        flexibleBudget,
        // Recycle bin
        deletedExpenses,
        restoreExpense,
        permanentlyDelete,
        emptyRecycleBin,
      }}
    >
      {children}
    </BudgetContext.Provider>
  );
}
