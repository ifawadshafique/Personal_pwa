import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal,
  TouchableOpacity, Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const fmt = (n) => '₨' + Number(n).toLocaleString('en-PK');

/**
 * Custom delete confirmation dialog.
 *
 * Props:
 *  visible   – boolean
 *  expense   – { amount, note, categoryName }
 *  onConfirm – called when user taps Delete
 *  onCancel  – called when user taps Keep / backdrop
 */
export default function DeleteDialog({ visible, expense, onConfirm, onCancel }) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1, useNativeDriver: true,
          tension: 180, friction: 12,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1, duration: 180, useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!expense) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onCancel}
    >
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onCancel}
      >
        {/* Dialog card — stop press propagation */}
        <TouchableOpacity activeOpacity={1}>
          <Animated.View style={[
            styles.card,
            { transform: [{ scale: scaleAnim }], opacity: opacityAnim }
          ]}>

            {/* Icon */}
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons name="trash-can-outline" size={36} color="#FF6B6B" />
            </View>

            <Text style={styles.title}>Move to Recycle Bin?</Text>

            {/* Expense summary */}
            <View style={styles.expenseBox}>
              <Text style={styles.expCategory}>{expense.categoryName || 'Expense'}</Text>
              {expense.note ? (
                <Text style={styles.expNote}>{expense.note}</Text>
              ) : null}
              <Text style={styles.expAmount}>{fmt(expense.amount)}</Text>
            </View>

            <Text style={styles.hint}>
              You can restore it from the Recycle Bin in Settings.
            </Text>

            {/* Buttons */}
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.keepBtn} onPress={onCancel}>
                <MaterialCommunityIcons name="close" size={18} color="#8ea1a3" />
                <Text style={styles.keepBtnText}>Keep it</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.deleteBtn} onPress={onConfirm}>
                <MaterialCommunityIcons name="trash-can" size={18} color="#fff" />
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>

          </Animated.View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  card: {
    backgroundColor: '#1B3735',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },

  // Icon
  iconWrap: {
    backgroundColor: '#2A1B1B',
    borderRadius: 50,
    width: 72,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FF6B6B33',
  },

  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },

  // Expense preview box
  expenseBox: {
    backgroundColor: '#162C2A',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 14,
  },
  expCategory: { color: '#8ea1a3', fontSize: 13, marginBottom: 4 },
  expNote:     { color: '#fff',     fontSize: 15, marginBottom: 6 },
  expAmount:   { color: '#FF6B6B', fontSize: 22, fontWeight: 'bold' },

  hint: {
    color: '#8ea1a3',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },

  // Buttons
  btnRow:   { flexDirection: 'row', gap: 12, width: '100%' },
  keepBtn:  {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#162C2A',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#8ea1a333',
  },
  keepBtnText:   { color: '#8ea1a3', fontWeight: '600', fontSize: 15 },

  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FF6B6B',
    paddingVertical: 14,
    borderRadius: 12,
  },
  deleteBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
