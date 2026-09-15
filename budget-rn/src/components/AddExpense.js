import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useBudget } from '../context/BudgetContext';

export default function AddExpense({ onClose }) {
  const { plan, addExpense } = useBudget();
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  
  useEffect(() => {
    if (plan && plan.categories.length > 0 && !categoryId) {
      setCategoryId(plan.categories[0].id);
    }
  }, [plan]);

  if (!plan) return null;

  const handleSave = async () => {
    const numAmount = Number(amount || 0);
    if (!numAmount || numAmount <= 0) {
      alert("Enter an amount greater than zero.");
      return;
    }

    const expense = {
      id: "exp-" + Date.now(),
      categoryId: categoryId || plan.categories[0].id,
      amount: numAmount,
      note: note.trim(),
      date: new Date().toISOString().slice(0, 10)
    };

    await addExpense(expense);
    onClose();
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Add expense</Text>
        
        {/* Simple category selector (just mapping to horizontal buttons for simplicity) */}
        <Text style={styles.label}>Category</Text>
        <View style={styles.categories}>
          {plan.categories.map(c => (
            <TouchableOpacity 
              key={c.id} 
              style={[styles.catBtn, categoryId === c.id && styles.catBtnActive]}
              onPress={() => setCategoryId(c.id)}
            >
              <Text style={[styles.catText, categoryId === c.id && styles.catTextActive]}>
                {c.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Amount (Rs)</Text>
        <TextInput 
          style={styles.input}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor="#8ea1a3"
          value={amount}
          onChangeText={setAmount}
        />

        <Text style={styles.label}>Note (optional)</Text>
        <TextInput 
          style={styles.input}
          placeholder="e.g. dinner with friends"
          placeholderTextColor="#8ea1a3"
          value={note}
          onChangeText={setNote}
        />

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Save expense</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0F2426',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#1B3735',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  label: {
    color: '#8ea1a3',
    marginBottom: 8,
    fontSize: 14,
  },
  input: {
    backgroundColor: '#162C2A',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 16,
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  catBtn: {
    backgroundColor: '#162C2A',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  catBtnActive: {
    backgroundColor: '#24D28D',
  },
  catText: {
    color: '#8ea1a3',
  },
  catTextActive: {
    color: '#0F2426',
    fontWeight: 'bold',
  },
  saveBtn: {
    backgroundColor: '#24D28D',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    color: '#0F2426',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelBtn: {
    padding: 16,
    alignItems: 'center',
    marginTop: 5,
  },
  cancelBtnText: {
    color: '#8ea1a3',
    fontSize: 16,
  },
});
