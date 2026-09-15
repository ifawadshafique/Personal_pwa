import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal,
  TouchableOpacity, Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const fmt = (n) => '₨' + Number(n).toLocaleString('en-PK');

/**
 * Generic animated confirm dialog — same look as DeleteDialog.
 *
 * Props:
 *  visible      – boolean
 *  icon         – MaterialCommunityIcons name (default: 'alert-circle-outline')
 *  iconColor    – color of the icon  (default: '#FFD93D')
 *  iconBg       – background behind icon  (default: '#2A2200')
 *  iconBorder   – border color of icon circle (default: '#FFD93D33')
 *  title        – dialog heading string
 *  expense      – optional { amount, note, categoryName } → shows preview card
 *  hint         – small grey text below the preview
 *  cancelText   – left button label (default: 'Cancel')
 *  confirmText  – right button label (default: 'Confirm')
 *  confirmColor – right button background (default: '#24D28D')
 *  confirmIcon  – icon for right button (default: 'check')
 *  onConfirm
 *  onCancel
 */
export default function ConfirmDialog({
  visible,
  icon        = 'alert-circle-outline',
  iconColor   = '#FFD93D',
  iconBg      = '#2A2200',
  iconBorder  = '#FFD93D33',
  title       = 'Are you sure?',
  expense     = null,
  hint        = '',
  cancelText  = 'Cancel',
  confirmText = 'Confirm',
  confirmColor = '#24D28D',
  confirmIcon  = 'check',
  onConfirm,
  onCancel,
}) {
  const scaleAnim   = useRef(new Animated.Value(0.85)).current;
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

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onCancel}
    >
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onCancel}>
        <TouchableOpacity activeOpacity={1}>
          <Animated.View style={[
            styles.card,
            { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
          ]}>

            {/* Icon circle */}
            <View style={[
              styles.iconWrap,
              { backgroundColor: iconBg, borderColor: iconBorder },
            ]}>
              <MaterialCommunityIcons name={icon} size={36} color={iconColor} />
            </View>

            <Text style={styles.title}>{title}</Text>

            {/* Optional expense preview card */}
            {expense && (
              <View style={styles.expenseBox}>
                <Text style={styles.expCategory}>{expense.categoryName || 'Expense'}</Text>
                {expense.note ? <Text style={styles.expNote}>{expense.note}</Text> : null}
                <Text style={[styles.expAmount, { color: iconColor }]}>
                  {fmt(expense.amount)}
                </Text>
              </View>
            )}

            {/* Hint text */}
            {!!hint && <Text style={styles.hint}>{hint}</Text>}

            {/* Buttons */}
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                <MaterialCommunityIcons name="close" size={18} color="#8ea1a3" />
                <Text style={styles.cancelBtnText}>{cancelText}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: confirmColor }]}
                onPress={onConfirm}
              >
                <MaterialCommunityIcons name={confirmIcon} size={18} color="#fff" />
                <Text style={styles.confirmBtnText}>{confirmText}</Text>
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

  iconWrap: {
    width: 72, height: 72, borderRadius: 36,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },

  title: {
    color: '#fff', fontSize: 20, fontWeight: 'bold',
    marginBottom: 16, textAlign: 'center',
  },

  expenseBox: {
    backgroundColor: '#162C2A',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 14,
  },
  expCategory: { color: '#8ea1a3', fontSize: 13, marginBottom: 4 },
  expNote:     { color: '#fff',    fontSize: 15, marginBottom: 6  },
  expAmount:   { fontSize: 22, fontWeight: 'bold' },

  hint: {
    color: '#8ea1a3', fontSize: 12,
    textAlign: 'center', marginBottom: 24, lineHeight: 18,
  },

  btnRow:     { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn:  {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#162C2A', paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: '#8ea1a333',
  },
  cancelBtnText:  { color: '#8ea1a3', fontWeight: '600', fontSize: 15 },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: 12,
  },
  confirmBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
