import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TextInput, TouchableOpacity, Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useBudget } from '../context/BudgetContext';
import ConfirmDialog from '../components/ConfirmDialog';

const fmt = (n) => '₨' + Number(n).toLocaleString('en-PK');

export default function Settings() {
  const {
    plan, updatePlan, clearMonthExpenses,
    deletedExpenses, restoreExpense, permanentlyDelete, emptyRecycleBin,
  } = useBudget();
  const [salary,    setSalary]    = useState('');
  const [committee, setCommittee] = useState('');
  const [loan,      setLoan]      = useState('');

  // Recycle bin dialog state
  const [restoreTarget,  setRestoreTarget]  = useState(null); // expense to restore
  const [permDelTarget,  setPermDelTarget]  = useState(null); // expense to perm-delete
  const [showEmptyBin,   setShowEmptyBin]   = useState(false);

  useEffect(() => {
    if (plan) {
      setSalary(String(plan.salary    || ''));
      setCommittee(String(plan.committee || ''));
      setLoan(String(plan.loan       || ''));
    }
  }, [plan]);

  if (!plan) {
    return <View style={styles.container}><Text style={styles.text}>Loading...</Text></View>;
  }

  const sal   = Number(salary)    || 0;
  const com   = Number(committee) || 0;
  const ln    = Number(loan)      || 0;
  const flex  = sal - com - ln;

  const handleSave = async () => {
    if (flex < 0) {
      Alert.alert('Invalid', 'Committee + Loan cannot exceed Salary.');
      return;
    }
    const updatedPlan = { ...plan, salary: sal, committee: com, loan: ln };
    await updatePlan(updatedPlan);
    Alert.alert('Saved ✅', 'Settings updated.');
  };

  const handleClearExpenses = () => {
    Alert.alert(
      'Reset month?',
      'This will delete all expenses logged this month. Use this at the start of a new month.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: clearMonthExpenses },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* ── Income ── */}
        <Text style={styles.sectionTitle}>Income & Deductions</Text>
        <View style={styles.card}>
          <Field label="Total Salary" value={salary} onChange={setSalary} hint="e.g. 60000" />
          <Field label="Kameti (Committee)" value={committee} onChange={setCommittee} hint="e.g. 20000" />
          <Field label="Loan Repayment"    value={loan}      onChange={setLoan}      hint="e.g. 10000" />

          {/* Live preview */}
          <View style={styles.previewBox}>
            <PreviewRow label="Flexible budget" value={fmt(flex)} highlight={flex > 0} />
            <PreviewRow label="Planned expenses (fixed)"  value={fmt(28939)} />
            <PreviewRow label="Buffer / cushion"          value={fmt(Math.max(0, flex - 28939))} highlight />
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Save Settings</Text>
        </TouchableOpacity>

        {/* ── Month reset ── */}
        <Text style={styles.sectionTitle}>Month Management</Text>
        <View style={styles.card}>
          <Text style={styles.hint}>
            At the start of each new month, reset your expense log to start fresh.
            Your settings (salary, committee, loan) are not affected.
          </Text>
          <TouchableOpacity style={styles.dangerBtn} onPress={handleClearExpenses}>
            <Text style={styles.dangerBtnText}>🗑️  Reset Month Expenses</Text>
          </TouchableOpacity>
        </View>

        {/* ── Recycle Bin ── */}
        <Text style={styles.sectionTitle}>🗑️ Recycle Bin</Text>
        <View style={styles.card}>
          {deletedExpenses.length === 0 ? (
            <Text style={styles.hint}>No deleted expenses. Long-press any expense on the Home screen to delete it.</Text>
          ) : (
            <>
              {deletedExpenses.map(exp => {
                const cat = plan.categories.find(c => c.id === exp.categoryId);
                return (
                  <View key={exp.id} style={styles.binItem}>
                    <View style={[styles.binDot, { backgroundColor: cat?.color || '#888' }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.binName}>{cat?.name || 'Other'}</Text>
                      {exp.note ? <Text style={styles.binNote}>{exp.note}</Text> : null}
                      <Text style={styles.binMeta}>
                        {fmt(exp.amount)} · deleted {exp.deletedAt?.slice(0, 10)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.restoreBtn}
                      onPress={() => {
                        const cat = plan.categories.find(c => c.id === exp.categoryId);
                        setRestoreTarget({ ...exp, categoryName: cat?.name || 'Expense' });
                      }}
                    >
                      <MaterialCommunityIcons name="restore" size={18} color="#24D28D" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.permDeleteBtn}
                      onPress={() => {
                        const cat = plan.categories.find(c => c.id === exp.categoryId);
                        setPermDelTarget({ ...exp, categoryName: cat?.name || 'Expense' });
                      }}
                    >
                      <MaterialCommunityIcons name="delete-forever" size={18} color="#FF6B6B" />
                    </TouchableOpacity>
                  </View>
                );
              })}

              <TouchableOpacity
                style={[styles.dangerBtn, { marginTop: 16 }]}
                onPress={() => setShowEmptyBin(true)}
              >
                <Text style={styles.dangerBtnText}>🗑️  Empty Recycle Bin ({deletedExpenses.length})</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ── About ── */}
        <Text style={styles.sectionTitle}>About Your Budget</Text>
        <View style={styles.card}>
          <BulletPoint text="Kameti pays out in April — your main wedding fund." />
          <BulletPoint text="Bonus (₨0–20k) is irregular — save it, never count on it." />
          <BulletPoint text="Food is your largest variable cost at ₨13,500/month." />
          <BulletPoint text="Your buffer of ₨1,061/month should not be spent — let it accumulate." />
        </View>

      </ScrollView>

      {/* ── Restore dialog ── */}
      <ConfirmDialog
        visible={!!restoreTarget}
        icon="restore"
        iconColor="#24D28D"
        iconBg="#0F2A1E"
        iconBorder="#24D28D33"
        title="Restore expense?"
        expense={restoreTarget}
        hint="This will put it back in your active expenses list."
        cancelText="Keep in bin"
        confirmText="Restore"
        confirmColor="#24D28D"
        confirmIcon="restore"
        onConfirm={() => { restoreExpense(restoreTarget.id); setRestoreTarget(null); }}
        onCancel={() => setRestoreTarget(null)}
      />

      {/* ── Permanent delete dialog ── */}
      <ConfirmDialog
        visible={!!permDelTarget}
        icon="delete-forever"
        iconColor="#FF6B6B"
        iconBg="#2A1B1B"
        iconBorder="#FF6B6B33"
        title="Delete forever?"
        expense={permDelTarget}
        hint="This cannot be undone. The expense will be gone permanently."
        cancelText="Keep in bin"
        confirmText="Delete forever"
        confirmColor="#FF6B6B"
        confirmIcon="delete-forever"
        onConfirm={() => { permanentlyDelete(permDelTarget.id); setPermDelTarget(null); }}
        onCancel={() => setPermDelTarget(null)}
      />

      {/* ── Empty bin dialog ── */}
      <ConfirmDialog
        visible={showEmptyBin}
        icon="delete-sweep"
        iconColor="#FF6B6B"
        iconBg="#2A1B1B"
        iconBorder="#FF6B6B33"
        title="Empty Recycle Bin?"
        hint={`All ${deletedExpenses.length} deleted expenses will be permanently lost. This cannot be undone.`}
        cancelText="Cancel"
        confirmText="Empty Bin"
        confirmColor="#FF6B6B"
        confirmIcon="delete-sweep"
        onConfirm={() => { emptyRecycleBin(); setShowEmptyBin(false); }}
        onCancel={() => setShowEmptyBin(false)}
      />
    </View>
  );
}

function Field({ label, value, onChange, hint }) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={value}
        onChangeText={onChange}
        placeholder={hint}
        placeholderTextColor="#8ea1a3"
      />
    </>
  );
}

function PreviewRow({ label, value, highlight }) {
  return (
    <View style={styles.previewRow}>
      <Text style={styles.previewLabel}>{label}</Text>
      <Text style={[styles.previewValue, highlight && { color: '#24D28D' }]}>{value}</Text>
    </View>
  );
}

function BulletPoint({ text }) {
  return (
    <View style={styles.bullet}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#0F2426' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  text:          { color: '#fff' },
  sectionTitle:  { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 14, marginTop: 8 },

  card:   { backgroundColor: '#1B3735', borderRadius: 16, padding: 20, marginBottom: 20 },
  label:  { color: '#8ea1a3', fontSize: 14, marginBottom: 8 },
  hint:   { color: '#8ea1a3', fontSize: 13, lineHeight: 20, marginBottom: 16 },

  input: {
    backgroundColor: '#162C2A', color: '#fff',
    padding: 15, borderRadius: 8, marginBottom: 20, fontSize: 16,
  },

  // Live preview
  previewBox:    { backgroundColor: '#162C2A', borderRadius: 10, padding: 14, marginTop: 4 },
  previewRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  previewLabel:  { color: '#8ea1a3', fontSize: 13 },
  previewValue:  { color: '#fff', fontSize: 13, fontWeight: '500' },

  // Buttons
  saveBtn:       { backgroundColor: '#24D28D', padding: 16, borderRadius: 10, alignItems: 'center', marginBottom: 24 },
  saveBtnText:   { color: '#0F2426', fontWeight: 'bold', fontSize: 16 },
  dangerBtn:     { backgroundColor: '#2A1B1B', borderWidth: 1, borderColor: '#FF6B6B', padding: 14, borderRadius: 10, alignItems: 'center' },
  dangerBtnText: { color: '#FF6B6B', fontWeight: 'bold', fontSize: 15 },

  // Bullets
  bullet:        { flexDirection: 'row', marginBottom: 10 },
  bulletDot:     { color: '#24D28D', fontSize: 16, marginRight: 10, marginTop: 1 },
  bulletText:    { color: '#8ea1a3', fontSize: 13, flex: 1, lineHeight: 19 },

  // Recycle bin
  binItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#162C2A',
  },
  binDot:        { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  binName:       { color: '#fff', fontSize: 14, fontWeight: '500' },
  binNote:       { color: '#8ea1a3', fontSize: 12, marginTop: 2 },
  binMeta:       { color: '#8ea1a3', fontSize: 11, marginTop: 3 },
  restoreBtn:    { padding: 8, backgroundColor: '#162C2A', borderRadius: 8, marginLeft: 8 },
  permDeleteBtn: { padding: 8, backgroundColor: '#2A1B1B', borderRadius: 8, marginLeft: 6 },
});
