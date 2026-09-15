import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Modal
} from 'react-native';
import { useBudget } from '../context/BudgetContext';
import AddExpense from '../components/AddExpense';
import DeleteDialog from '../components/DeleteDialog';

const fmt = (n) => '₨' + Number(n).toLocaleString('en-PK');

// Kameti started September 2026, 12 months, ₨20,000/month
const KAMETI_START   = new Date(2026, 8, 1);  // Sep 2026 (month index 8)
const KAMETI_MONTHS  = 12;
const KAMETI_AMOUNT  = 20000;

function KametiTracker() {
  const today      = new Date();
  const endDate    = new Date(KAMETI_START.getFullYear(), KAMETI_START.getMonth() + KAMETI_MONTHS, 1);

  // Months completed (full months since start, including current)
  const monthsDone = Math.min(
    KAMETI_MONTHS,
    Math.max(
      0,
      (today.getFullYear() - KAMETI_START.getFullYear()) * 12 +
      (today.getMonth()   - KAMETI_START.getMonth()) + 1
    )
  );
  const collected  = monthsDone * KAMETI_AMOUNT;
  const remaining  = KAMETI_MONTHS - monthsDone;
  const progress   = Math.min(1, monthsDone / KAMETI_MONTHS);

  const monthName = (d) =>
    d.toLocaleString('en-PK', { month: 'long', year: 'numeric' });

  const todayStr = today.toLocaleDateString('en-PK', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  return (
    <View style={styles.kametiCard}>
      {/* Header row */}
      <View style={styles.kametiHeader}>
        <Text style={styles.kametiTitle}>🏦 Kameti Tracker</Text>
        <Text style={styles.kametiDate}>{todayStr}</Text>
      </View>

      {/* Start → End */}
      <View style={styles.kametiDateRow}>
        <View style={styles.kametiDateBox}>
          <Text style={styles.kametiDateLabel}>Started</Text>
          <Text style={styles.kametiDateVal}>{monthName(KAMETI_START)}</Text>
        </View>
        <View style={styles.kametiArrow}>
          <Text style={styles.kametiArrowText}>→</Text>
          <Text style={styles.kametiArrowSub}>{KAMETI_MONTHS} months</Text>
        </View>
        <View style={[styles.kametiDateBox, { alignItems: 'flex-end' }]}>
          <Text style={styles.kametiDateLabel}>Ends</Text>
          <Text style={styles.kametiDateVal}>{monthName(endDate)}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.kametiProgressBg}>
        <View style={[styles.kametiProgressFill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
      <Text style={styles.kametiProgressLabel}>
        {monthsDone} of {KAMETI_MONTHS} months done
      </Text>

      {/* Stats */}
      <View style={styles.kametiStats}>
        <KametiStat label="Monthly" value={fmt(KAMETI_AMOUNT)} />
        <KametiStat label="Collected" value={fmt(collected)} highlight />
        <KametiStat label="Remaining" value={`${remaining} months`} />
      </View>
    </View>
  );
}

function KametiStat({ label, value, highlight }) {
  return (
    <View style={styles.kametiStatBox}>
      <Text style={[styles.kametiStatVal, highlight && { color: '#24D28D' }]}>{value}</Text>
      <Text style={styles.kametiStatLabel}>{label}</Text>
    </View>
  );
}

export default function Home() {
  const { plan, monthExpenses, flexibleBudget, deleteExpense } = useBudget();
  const [modalVisible,  setModalVisible]  = useState(false);
  const [deleteTarget,  setDeleteTarget]  = useState(null);  // expense to delete

  if (!plan) {
    return <View style={styles.container}><Text style={styles.text}>Loading...</Text></View>;
  }

  const totalSpent    = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const totalBudgeted = plan.categories.reduce((s, c) => s + c.budget, 0); // 27,510
  const buffer        = flexibleBudget - totalBudgeted;                      // 2,490
  const remaining     = flexibleBudget - totalSpent;
  const bufferUsed    = Math.max(0, totalSpent - totalBudgeted);

  const handleDelete = (exp) => {
    const cat = plan.categories.find(c => c.id === exp.categoryId);
    setDeleteTarget({ ...exp, categoryName: cat?.name || 'Expense' });
  };

  const confirmDelete = async () => {
    if (deleteTarget) {
      await deleteExpense(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* ── Header ── */}
        <View style={styles.headerBlock}>
          <Text style={styles.greeting}>Aaj ka hisaab 💰</Text>
          <Text style={styles.title}>Meri Budget</Text>
        </View>

        {/* ── Kameti Tracker ── */}
        <KametiTracker />

        {/* ── Salary Split Card ── */}
        <View style={styles.splitCard}>
          <Text style={styles.splitTitle}>Monthly Salary Split</Text>
          <View style={styles.splitRow}>
            <SplitPill label="Kameti" amount={plan.committee} color="#4D96FF" note="Wedding fund" />
            <SplitPill label="Loan"   amount={plan.loan}      color="#FF6B6B" note="Installment" />
            <SplitPill label="Living" amount={flexibleBudget} color="#24D28D" note="Day-to-day" />
          </View>
        </View>

        {/* ── Main Balance Card ── */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Remaining to spend</Text>
          <Text style={[styles.cardAmount, remaining < 0 && { color: '#FF6B6B' }]}>
            {fmt(remaining)}
          </Text>
          <View style={styles.progressBg}>
            <View style={[
              styles.progressFill,
              {
                width: `${Math.min(100, (totalSpent / flexibleBudget) * 100)}%`,
                backgroundColor: totalSpent > flexibleBudget ? '#FF6B6B' : '#24D28D',
              }
            ]} />
          </View>
          <Text style={styles.cardSub}>
            Spent {fmt(totalSpent)} of {fmt(flexibleBudget)} flexible budget
          </Text>
          {bufferUsed > 0 && (
            <Text style={styles.bufferWarn}>
              ⚠️ Buffer eroded by {fmt(bufferUsed)}
            </Text>
          )}
        </View>

        {/* ── Category Budget Bars ── */}
        <Text style={styles.sectionTitle}>Category Budgets</Text>
        {plan.categories.map(cat => {
          const spent = monthExpenses
            .filter(e => e.categoryId === cat.id)
            .reduce((s, e) => s + e.amount, 0);
          const pct = Math.min(100, (spent / cat.budget) * 100);
          const over = spent > cat.budget;
          return (
            <View key={cat.id} style={styles.catBar}>
              <View style={styles.catBarHeader}>
                <View style={styles.catDot}>
                  <View style={[styles.dot, { backgroundColor: cat.color }]} />
                  <Text style={styles.catName}>{cat.name}</Text>
                </View>
                <Text style={[styles.catAmount, over && { color: '#FF6B6B' }]}>
                  {fmt(spent)} / {fmt(cat.budget)}
                </Text>
              </View>
              <View style={styles.catProgressBg}>
                <View style={[styles.catProgressFill, {
                  width: `${pct}%`,
                  backgroundColor: over ? '#FF6B6B' : cat.color,
                }]} />
              </View>
            </View>
          );
        })}

        {/* Buffer info */}
        <View style={styles.bufferCard}>
          <Text style={styles.bufferLabel}>Monthly Buffer (savings cushion)</Text>
          <Text style={[styles.bufferAmt, bufferUsed > 0 && { color: '#FF6B6B' }]}>
            {fmt(Math.max(0, buffer - bufferUsed))} left
          </Text>
          <Text style={styles.bufferHint}>
            Keep this intact — it's your wedding safety net!
          </Text>
        </View>

        {/* ── Recent Expenses ── */}
        <Text style={styles.sectionTitle}>Recent Expenses</Text>
        {monthExpenses.length === 0 ? (
          <Text style={styles.emptyText}>No expenses logged yet. Tap + to add one.</Text>
        ) : (
          monthExpenses.slice().reverse().map(exp => {
            const cat = plan.categories.find(c => c.id === exp.categoryId);
            return (
              <TouchableOpacity
                key={exp.id}
                style={styles.expenseItem}
                onLongPress={() => handleDelete(exp)}
              >
                <View style={[styles.expDot, { backgroundColor: cat?.color || '#888' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.expName}>{cat?.name || 'Other'}</Text>
                  {exp.note ? <Text style={styles.expNote}>{exp.note}</Text> : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.expAmount}>-{fmt(exp.amount)}</Text>
                  <Text style={styles.expDate}>{exp.date}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
        <Text style={styles.deleteHint}>Long-press an expense to delete it</Text>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <AddExpense onClose={() => setModalVisible(false)} />
      </Modal>

      <DeleteDialog
        visible={!!deleteTarget}
        expense={deleteTarget}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </View>
  );
}

function SplitPill({ label, amount, color, note }) {
  return (
    <View style={styles.pill}>
      <Text style={[styles.pillAmount, { color }]}>{fmt(amount)}</Text>
      <Text style={styles.pillLabel}>{label}</Text>
      <Text style={styles.pillNote}>{note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0F2426' },
  scrollContent:   { padding: 20, paddingBottom: 100 },
  text:            { color: '#fff' },

  headerBlock:     { marginBottom: 20 },
  greeting:        { color: '#8ea1a3', fontSize: 16 },
  title:           { color: '#fff', fontSize: 28, fontWeight: 'bold' },

  // Kameti Tracker card
  kametiCard:         { backgroundColor: '#0D2E4E', borderRadius: 18, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#1A4A72' },
  kametiHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  kametiTitle:        { color: '#4D96FF', fontSize: 16, fontWeight: 'bold' },
  kametiDate:         { color: '#8ea1a3', fontSize: 12 },
  kametiDateRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  kametiDateBox:      { flex: 1 },
  kametiDateLabel:    { color: '#8ea1a3', fontSize: 11, marginBottom: 3 },
  kametiDateVal:      { color: '#fff', fontSize: 13, fontWeight: '600' },
  kametiArrow:        { alignItems: 'center', paddingHorizontal: 8 },
  kametiArrowText:    { color: '#4D96FF', fontSize: 18 },
  kametiArrowSub:     { color: '#8ea1a3', fontSize: 10, marginTop: 2 },
  kametiProgressBg:   { backgroundColor: '#162C2A', borderRadius: 6, height: 8, overflow: 'hidden', marginBottom: 6 },
  kametiProgressFill: { height: 8, borderRadius: 6, backgroundColor: '#4D96FF' },
  kametiProgressLabel:{ color: '#8ea1a3', fontSize: 12, marginBottom: 16 },
  kametiStats:        { flexDirection: 'row', justifyContent: 'space-between' },
  kametiStatBox:      { alignItems: 'center', flex: 1 },
  kametiStatVal:      { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  kametiStatLabel:    { color: '#8ea1a3', fontSize: 11, marginTop: 3 },

  // Salary split
  splitCard:       { backgroundColor: '#1B3735', borderRadius: 16, padding: 20, marginBottom: 20 },
  splitTitle:      { color: '#8ea1a3', fontSize: 13, marginBottom: 14, letterSpacing: 0.5 },
  splitRow:        { flexDirection: 'row', justifyContent: 'space-between' },
  pill:            { alignItems: 'center', flex: 1 },
  pillAmount:      { fontSize: 16, fontWeight: 'bold' },
  pillLabel:       { color: '#fff', fontSize: 13, marginTop: 4 },
  pillNote:        { color: '#8ea1a3', fontSize: 11, marginTop: 2 },

  // Main card
  card:            { backgroundColor: '#1B3735', borderRadius: 16, padding: 24, marginBottom: 24 },
  cardLabel:       { color: '#8ea1a3', fontSize: 14, marginBottom: 8 },
  cardAmount:      { color: '#24D28D', fontSize: 36, fontWeight: 'bold', marginBottom: 14 },
  cardSub:         { color: '#8ea1a3', fontSize: 13, marginTop: 10 },
  progressBg:      { backgroundColor: '#162C2A', borderRadius: 6, height: 8, overflow: 'hidden' },
  progressFill:    { height: 8, borderRadius: 6 },
  bufferWarn:      { color: '#FF6B6B', fontSize: 13, marginTop: 8 },

  // Section title
  sectionTitle:    { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 14, marginTop: 4 },

  // Category bars
  catBar:          { backgroundColor: '#1B3735', borderRadius: 12, padding: 14, marginBottom: 10 },
  catBarHeader:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  catDot:          { flexDirection: 'row', alignItems: 'center' },
  dot:             { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  catName:         { color: '#fff', fontSize: 15 },
  catAmount:       { color: '#8ea1a3', fontSize: 13 },
  catProgressBg:   { backgroundColor: '#162C2A', borderRadius: 4, height: 6, overflow: 'hidden' },
  catProgressFill: { height: 6, borderRadius: 4 },

  // Buffer card
  bufferCard:      { backgroundColor: '#1B3735', borderRadius: 12, padding: 16, marginBottom: 24, marginTop: 10 },
  bufferLabel:     { color: '#8ea1a3', fontSize: 13, marginBottom: 4 },
  bufferAmt:       { color: '#24D28D', fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  bufferHint:      { color: '#8ea1a3', fontSize: 12 },

  // Expenses
  emptyText:       { color: '#8ea1a3', fontStyle: 'italic', marginBottom: 20 },
  expenseItem:     {
    backgroundColor: '#162C2A', borderRadius: 12, padding: 16,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center',
  },
  expDot:          { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  expName:         { color: '#fff', fontSize: 16, fontWeight: '500' },
  expNote:         { color: '#8ea1a3', fontSize: 13, marginTop: 4 },
  expAmount:       { color: '#FF6B6B', fontSize: 16, fontWeight: 'bold' },
  expDate:         { color: '#8ea1a3', fontSize: 12, marginTop: 4 },
  deleteHint:      { color: '#8ea1a3', fontSize: 12, textAlign: 'center', marginTop: 4, marginBottom: 10 },

  // FAB
  fab: {
    position: 'absolute', bottom: 20, right: 20,
    backgroundColor: '#24D28D', width: 60, height: 60, borderRadius: 30,
    justifyContent: 'center', alignItems: 'center',
    elevation: 5, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  fabText: { color: '#0F2426', fontSize: 32, fontWeight: 'bold' },
});
