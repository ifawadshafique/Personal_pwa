import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { useBudget } from '../context/BudgetContext';

const screenWidth = Dimensions.get('window').width;
const fmt = (n) => '₨' + Number(n).toLocaleString('en-PK');

export default function Analytics() {
  const { plan, monthExpenses, flexibleBudget } = useBudget();

  // Spending by category (actual vs budget)
  const categoryBreakdown = useMemo(() => {
    if (!plan) return [];
    return plan.categories.map(cat => {
      const spent = monthExpenses
        .filter(e => e.categoryId === cat.id)
        .reduce((s, e) => s + e.amount, 0);
      return { ...cat, spent };
    });
  }, [plan, monthExpenses]);

  // Pie chart data — show spent amounts (or budget if nothing spent yet)
  const pieData = useMemo(() => {
    if (!plan) return [];
    const withSpend = categoryBreakdown.filter(c => c.spent > 0);
    if (withSpend.length === 0) {
      // Show budget plan instead
      return plan.categories.map(c => ({
        name:            c.name,
        amount:          c.budget,
        color:           c.color,
        legendFontColor: '#fff',
        legendFontSize:  12,
      }));
    }
    return withSpend.map(c => ({
      name:            c.name,
      amount:          c.spent,
      color:           c.color,
      legendFontColor: '#fff',
      legendFontSize:  12,
    }));
  }, [categoryBreakdown, plan]);

  const totalSpent    = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const totalBudgeted = plan ? plan.categories.reduce((s, c) => s + c.budget, 0) : 0;
  const buffer        = flexibleBudget - totalBudgeted; // 2,490

  if (!plan) {
    return <View style={styles.container}><Text style={styles.text}>Loading...</Text></View>;
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* ── Salary overview ── */}
        <Text style={styles.sectionTitle}>Salary Overview</Text>
        <View style={styles.card}>
          <OverviewRow label="Total Salary"   value={fmt(plan.salary)}    />
          <OverviewRow label="Kameti (wedding fund)" value={fmt(plan.committee)} color="#4D96FF" />
          <OverviewRow label="Loan installment"      value={fmt(plan.loan)}      color="#FF6B6B" />
          <View style={styles.divider} />
          <OverviewRow label="Flexible Budget" value={fmt(flexibleBudget)} color="#24D28D" bold />
          <OverviewRow label="Planned expenses" value={fmt(totalBudgeted)} />
          <OverviewRow label="Buffer / cushion" value={fmt(buffer)} color="#24D28D" />
        </View>

        {/* ── Spending vs Budget table ── */}
        <Text style={styles.sectionTitle}>Budget vs Actual</Text>
        <View style={styles.card}>
          {categoryBreakdown.map(cat => {
            const over = cat.spent > cat.budget;
            const pct  = cat.budget > 0 ? Math.round((cat.spent / cat.budget) * 100) : 0;
            return (
              <View key={cat.id} style={styles.tableRow}>
                <View style={[styles.colorStrip, { backgroundColor: cat.color }]} />
                <View style={{ flex: 1 }}>
                  <View style={styles.tableHeader}>
                    <Text style={styles.tableLabel}>{cat.name}</Text>
                    <Text style={[styles.tableValue, over && { color: '#FF6B6B' }]}>
                      {fmt(cat.spent)} / {fmt(cat.budget)}
                    </Text>
                  </View>
                  <View style={styles.miniProgressBg}>
                    <View style={[styles.miniProgressFill, {
                      width: `${Math.min(100, pct)}%`,
                      backgroundColor: over ? '#FF6B6B' : cat.color,
                    }]} />
                  </View>
                  <Text style={[styles.pctText, over && { color: '#FF6B6B' }]}>
                    {pct}% used{over ? ' — OVER BUDGET' : ''}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* ── Pie chart ── */}
        <Text style={styles.sectionTitle}>
          {monthExpenses.length > 0 ? 'Spending Breakdown' : 'Planned Budget Split'}
        </Text>
        <View style={styles.pieCard}>
          <PieChart
            data={pieData}
            width={screenWidth - 80}
            height={220}
            chartConfig={{ color: (opacity = 1) => `rgba(255,255,255,${opacity})` }}
            accessor="amount"
            backgroundColor="transparent"
            paddingLeft="15"
            center={[10, 0]}
            absolute
          />
          {monthExpenses.length === 0 && (
            <Text style={styles.pieHint}>Showing planned budget — add expenses to see actual spending</Text>
          )}
        </View>

        {/* ── Key reminders ── */}
        <Text style={styles.sectionTitle}>💡 Key Reminders</Text>
        <View style={styles.card}>
          <Reminder
            text="Your ₨20,000/month kameti pays out in April — don't touch it early."
            icon="🏦"
          />
          <Reminder
            text="Bonuses (₨0–20k) are unpredictable — save them, never plan around them."
            icon="🎁"
          />
          <Reminder
            text="Food is 45% of your flexible budget — first place to cut if you need breathing room."
            icon="🍽️"
          />
          <Reminder
            text={`Your ₨${buffer.toLocaleString()} buffer is thin — protect it for emergencies.`}
            icon="🛡️"
          />
        </View>

        {/* ── Month summary ── */}
        <View style={[styles.card, { marginBottom: 30 }]}>
          <Text style={styles.summaryTitle}>This Month</Text>
          <Text style={styles.summaryLine}>Total Spent: <Text style={{ color: '#FF6B6B', fontWeight: 'bold' }}>{fmt(totalSpent)}</Text></Text>
          <Text style={styles.summaryLine}>Remaining:   <Text style={{ color: '#24D28D', fontWeight: 'bold' }}>{fmt(Math.max(0, flexibleBudget - totalSpent))}</Text></Text>
          {totalSpent > totalBudgeted && (
            <Text style={styles.overBudgetWarn}>
              ⚠️ You've spent {fmt(totalSpent - totalBudgeted)} into your buffer!
            </Text>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

function OverviewRow({ label, value, color, bold }) {
  return (
    <View style={styles.overviewRow}>
      <Text style={styles.overviewLabel}>{label}</Text>
      <Text style={[styles.overviewValue, color && { color }, bold && { fontWeight: 'bold', fontSize: 16 }]}>
        {value}
      </Text>
    </View>
  );
}

function Reminder({ text, icon }) {
  return (
    <View style={styles.reminder}>
      <Text style={styles.reminderIcon}>{icon}</Text>
      <Text style={styles.reminderText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#0F2426' },
  scrollContent:    { padding: 20 },
  text:             { color: '#fff' },
  sectionTitle:     { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 14, marginTop: 8 },

  card:             { backgroundColor: '#1B3735', borderRadius: 16, padding: 20, marginBottom: 20 },
  pieCard:          { backgroundColor: '#1B3735', borderRadius: 16, padding: 20, marginBottom: 20, alignItems: 'center' },
  pieHint:          { color: '#8ea1a3', fontSize: 12, textAlign: 'center', marginTop: 10 },

  // Overview
  overviewRow:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  overviewLabel:    { color: '#8ea1a3', fontSize: 14 },
  overviewValue:    { color: '#fff', fontSize: 14 },
  divider:          { height: 1, backgroundColor: '#162C2A', marginVertical: 10 },

  // Table
  tableRow:         { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  colorStrip:       { width: 4, borderRadius: 2, marginRight: 12, marginTop: 2, alignSelf: 'stretch' },
  tableHeader:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  tableLabel:       { color: '#fff', fontSize: 14 },
  tableValue:       { color: '#8ea1a3', fontSize: 13 },
  miniProgressBg:   { backgroundColor: '#162C2A', borderRadius: 3, height: 5, overflow: 'hidden' },
  miniProgressFill: { height: 5, borderRadius: 3 },
  pctText:          { color: '#8ea1a3', fontSize: 11, marginTop: 4 },

  // Reminders
  reminder:         { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  reminderIcon:     { fontSize: 18, marginRight: 12, marginTop: 1 },
  reminderText:     { color: '#8ea1a3', fontSize: 13, flex: 1, lineHeight: 19 },

  // Summary
  summaryTitle:     { color: '#8ea1a3', fontSize: 13, marginBottom: 10 },
  summaryLine:      { color: '#fff', fontSize: 15, marginBottom: 6 },
  overBudgetWarn:   { color: '#FF6B6B', fontSize: 13, marginTop: 6 },
});
