import React, { useState, useMemo } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';

interface CalendarModalProps {
  visible: boolean;
  selectedDate: string; // YYYY-MM-DD
  onSelect: (date: string) => void;
  onClose: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function toYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseYMD(ymd: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    return new Date();
  }
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatFriendlyDate(ymd: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return '';
  const date = parseYMD(ymd);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  let relative = '';
  if (diffDays === 0) relative = 'Today';
  else if (diffDays === 1) relative = 'Tomorrow';
  else if (diffDays === -1) relative = 'Yesterday';
  else if (diffDays > 1) relative = `in ${diffDays} days`;
  else relative = `${Math.abs(diffDays)} days ago`;

  const formatted = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return `${formatted} (${relative})`;
}

export function CalendarModal({
  visible,
  selectedDate,
  onSelect,
  onClose
}: CalendarModalProps) {
  const initialDate = useMemo(() => {
    return selectedDate ? parseYMD(selectedDate) : new Date();
  }, [selectedDate]);

  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [tempSelected, setTempSelected] = useState<string>(
    selectedDate || toYMD(new Date())
  );

  // Sync if selectedDate changes externally
  React.useEffect(() => {
    if (selectedDate) {
      setTempSelected(selectedDate);
      const parsed = parseYMD(selectedDate);
      setCurrentMonth(parsed.getMonth());
      setCurrentYear(parsed.getFullYear());
    } else {
      const now = new Date();
      setTempSelected(toYMD(now));
      setCurrentMonth(now.getMonth());
      setCurrentYear(now.getFullYear());
    }
  }, [visible, selectedDate]);

  const todayStr = useMemo(() => toYMD(new Date()), []);

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Generate days matrix
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  // Presets
  const presets = useMemo(() => {
    const today = new Date();
    const addDays = (d: number) => {
      const res = new Date(today);
      res.setDate(res.getDate() + d);
      return toYMD(res);
    };
    const endOfMonth = () => {
      const res = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return toYMD(res);
    };
    return [
      { label: 'Today', date: toYMD(today) },
      { label: '1 Week', date: addDays(7) },
      { label: '2 Weeks', date: addDays(14) },
      { label: '1 Month', date: addDays(30) },
      { label: 'End of Month', date: endOfMonth() }
    ];
  }, []);

  const handleSelectPreset = (dateStr: string) => {
    setTempSelected(dateStr);
    const parsed = parseYMD(dateStr);
    setCurrentMonth(parsed.getMonth());
    setCurrentYear(parsed.getFullYear());
  };

  const handleConfirm = () => {
    onSelect(tempSelected);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              {/* Header */}
              <View style={styles.topBar}>
                <View>
                  <Text style={styles.title}>Select Due Date</Text>
                  <Text style={styles.subtitle}>
                    {tempSelected ? formatFriendlyDate(tempSelected) : 'Pick a return date'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Quick Presets */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.presetsContainer}
              >
                {presets.map((p) => {
                  const isSelected = tempSelected === p.date;
                  return (
                    <TouchableOpacity
                      key={p.label}
                      style={[styles.presetChip, isSelected && styles.presetChipActive]}
                      onPress={() => handleSelectPreset(p.date)}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          isSelected && styles.presetChipTextActive
                        ]}
                      >
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Month Navigation */}
              <View style={styles.monthNav}>
                <TouchableOpacity
                  onPress={goToPrevMonth}
                  style={styles.navButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.navArrow}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.monthTitle}>
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </Text>
                <TouchableOpacity
                  onPress={goToNextMonth}
                  style={styles.navButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.navArrow}>›</Text>
                </TouchableOpacity>
              </View>

              {/* Weekday Row */}
              <View style={styles.weekRow}>
                {WEEKDAY_NAMES.map((w, index) => (
                  <View key={index} style={styles.weekCell}>
                    <Text style={styles.weekText}>{w}</Text>
                  </View>
                ))}
              </View>

              {/* Days Grid */}
              <View style={styles.grid}>
                {/* Empty slots before first day */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <View key={`empty-${i}`} style={styles.dayCell} />
                ))}

                {/* Day numbers */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const isSelected = tempSelected === dateStr;
                  const isToday = todayStr === dateStr;
                  const isPast = dateStr < todayStr;

                  return (
                    <TouchableOpacity
                      key={dayNum}
                      style={[
                        styles.dayCell,
                        isSelected && styles.selectedDayCell,
                        isToday && !isSelected && styles.todayCell
                      ]}
                      onPress={() => setTempSelected(dateStr)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          isSelected && styles.selectedDayText,
                          isToday && !isSelected && styles.todayDayText,
                          isPast && !isSelected && styles.pastDayText
                        ]}
                      >
                        {dayNum}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Actions Footer */}
              <View style={styles.footer}>
                <Pressable style={styles.cancelBtn} onPress={onClose}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.confirmBtn} onPress={handleConfirm}>
                  <Text style={styles.confirmBtnText}>Confirm Date</Text>
                </Pressable>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 20, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#17211b'
  },
  subtitle: {
    fontSize: 13,
    color: '#176b45',
    fontWeight: '600',
    marginTop: 3
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f2f4f2',
    justifyContent: 'center',
    alignItems: 'center'
  },
  closeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#59645d'
  },
  presetsContainer: {
    paddingVertical: 6,
    gap: 8,
    marginBottom: 14
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f2f5f3',
    borderWidth: 1,
    borderColor: '#e1e7e2'
  },
  presetChipActive: {
    backgroundColor: '#176b45',
    borderColor: '#176b45'
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#59645d'
  },
  presetChipTextActive: {
    color: '#ffffff'
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: '#f0f3f0'
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f7f5',
    justifyContent: 'center',
    alignItems: 'center'
  },
  navArrow: {
    fontSize: 22,
    color: '#17211b',
    fontWeight: '600',
    marginTop: -2
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#17211b'
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f4f2'
  },
  weekCell: {
    width: 40,
    alignItems: 'center'
  },
  weekText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8c9790'
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingVertical: 8
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2
  },
  todayCell: {
    borderWidth: 1.5,
    borderColor: '#176b45',
    borderRadius: 21
  },
  selectedDayCell: {
    backgroundColor: '#176b45',
    borderRadius: 21,
    shadowColor: '#176b45',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 3
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#17211b'
  },
  selectedDayText: {
    color: '#ffffff',
    fontWeight: '700'
  },
  todayDayText: {
    color: '#176b45',
    fontWeight: '700'
  },
  pastDayText: {
    color: '#b0b8b3'
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f0f3f0'
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#65716a'
  },
  confirmBtn: {
    backgroundColor: '#176b45',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700'
  }
});
