import React, { useState } from 'react';
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as MediaLibraryLegacy from 'expo-media-library/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { api } from '../services/api';
import { CalendarModal, formatFriendlyDate, toYMD } from '../components/CalendarModal';

type Props = NativeStackScreenProps<RootStackParamList, 'AddLoan'>;

export default function AddLoanScreen({ navigation }: Props) {
  const [friendName, setFriendName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(toYMD(new Date()));
  const [showCalendar, setShowCalendar] = useState(false);
  const [direction, setDirection] = useState<'lent' | 'borrowed'>('lent');
  const [receipt, setReceipt] = useState<{ uri: string; assetId: string; galleryUri: string; name: string; type: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    Keyboard.dismiss();
    const numericAmount = Number(amount);
    if (!friendName.trim()) {
      return Alert.alert('Add a name', 'Enter your friend’s name.');
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return Alert.alert('Check amount', 'Enter an amount greater than zero.');
    }
    const parsedDate = new Date(`${dueDate}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) ||
      Number.isNaN(parsedDate.valueOf()) ||
      parsedDate.toISOString().slice(0, 10) !== dueDate
    ) {
      return Alert.alert('Check due date', 'Please select a valid due date from the calendar.');
    }

    setBusy(true);
    try {
      await api.addLoan({
        friendName: friendName.trim(),
        amount: numericAmount,
        dueDate,
        direction,
        receipt: receipt || undefined
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Could not save loan', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const chooseReceipt = async (source: 'camera' | 'gallery') => {
    try {
      const permission = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return Alert.alert('Permission needed', `Allow ${source === 'camera' ? 'camera' : 'photo library'} access to attach a receipt.`);
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      if (asset.mimeType && !['image/jpeg', 'image/png', 'image/webp'].includes(asset.mimeType)) {
        return Alert.alert('Unsupported image', 'Choose a JPEG, PNG, or WebP photo.');
      }
      const compressed = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1280 } }],
        { compress: 0.65, format: ImageManipulator.SaveFormat.JPEG }
      );
      if (compressed.uri.length === 0) return Alert.alert('Could not prepare photo', 'Please choose another image.');
      // Expo Go only supports write-only media-library access on current Android versions.
      const galleryPermission = await MediaLibrary.requestPermissionsAsync(true);
      if (!galleryPermission.granted) return Alert.alert('Permission needed', 'Allow photo library access so MiniLedger can save the receipt to your gallery.');
      const savedAsset = await MediaLibraryLegacy.createAssetAsync(compressed.uri);
      setReceipt({ uri: compressed.uri, assetId: savedAsset.id, galleryUri: savedAsset.uri, name: 'receipt.jpg', type: 'image/jpeg' });
    } catch (error) {
      Alert.alert('Could not attach receipt', (error as Error).message || 'Check camera and photo permissions, then try again.');
    }
  };

  const openCalendar = () => {
    Keyboard.dismiss();
    setShowCalendar(true);
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Text style={styles.kicker}>NEW ENTRY</Text>
          <Text style={styles.heading}>Add a loan</Text>
          <Text style={styles.copy}>
            Keep the details handy so everyone stays on the same page.
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>LOAN DIRECTION</Text>
            <View style={styles.directionRow}>
              <Pressable style={[styles.directionButton, direction === 'lent' && styles.directionButtonActive]} onPress={() => setDirection('lent')}>
                <Text style={[styles.directionText, direction === 'lent' && styles.directionTextActive]}>I lent money</Text>
              </Pressable>
              <Pressable style={[styles.directionButton, direction === 'borrowed' && styles.directionButtonActive]} onPress={() => setDirection('borrowed')}>
                <Text style={[styles.directionText, direction === 'borrowed' && styles.directionTextActive]}>I borrowed</Text>
              </Pressable>
            </View>
            {/* Friend Name */}
            <Text style={styles.label}>FRIEND’S NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Asha"
              placeholderTextColor="#9ba59e"
              value={friendName}
              onChangeText={setFriendName}
              maxLength={100}
              returnKeyType="next"
            />

            {/* Amount */}
            <Text style={styles.label}>AMOUNT (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#9ba59e"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              returnKeyType="done"
            />

            {/* Due Date with Calendar Trigger */}
            <Text style={styles.label}>DUE DATE</Text>
            <Pressable
              style={styles.datePickerTrigger}
              onPress={openCalendar}
            >
              <View style={styles.dateLeft}>
                <View style={styles.calIconWrap}>
                  <Text style={styles.calIcon}>📅</Text>
                </View>
                <View>
                  <Text style={styles.dateText}>{dueDate || 'Select date'}</Text>
                  {dueDate ? (
                    <Text style={styles.dateFriendly}>
                      {formatFriendlyDate(dueDate)}
                    </Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.pickBadge}>
                <Text style={styles.pickBadgeText}>Open Calendar</Text>
              </View>
            </Pressable>

            <Text style={[styles.label, styles.receiptLabel]}>RECEIPT PHOTO (OPTIONAL)</Text>
            <View style={styles.receiptButtons}>
              <Pressable style={styles.receiptButton} onPress={() => chooseReceipt('camera')}><Text style={styles.receiptButtonText}>Take photo</Text></Pressable>
              <Pressable style={styles.receiptButton} onPress={() => chooseReceipt('gallery')}><Text style={styles.receiptButtonText}>Choose photo</Text></Pressable>
            </View>
            {receipt && <View style={styles.receiptPreview}><Image source={{ uri: receipt.uri }} style={styles.receiptImage} /><View style={styles.receiptInfo}><Text style={styles.receiptTitle}>Saved to your gallery</Text><Text style={styles.receiptSub}>Compressed JPEG · up to 3 MB</Text></View><Pressable onPress={() => setReceipt(null)}><Text style={styles.removeReceipt}>Remove</Text></Pressable></View>}

            {/* Save Button */}
            <Pressable
              style={[styles.button, busy && { opacity: 0.6 }]}
              onPress={save}
              disabled={busy}
            >
              <Text style={styles.buttonText}>
                {busy ? 'Saving…' : 'Save loan'}
              </Text>
            </Pressable>
          </View>

          <Pressable
            style={styles.cancel}
            onPress={() => {
              Keyboard.dismiss();
              navigation.goBack();
            }}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>

          {/* Additional bottom padding so keyboard never hides content */}
          <View style={{ height: 60 }} />
        </ScrollView>
      </TouchableWithoutFeedback>

      {/* Calendar Modal */}
      <CalendarModal
        visible={showCalendar}
        selectedDate={dueDate}
        onSelect={(newDate) => setDueDate(newDate)}
        onClose={() => setShowCalendar(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f6f7f4'
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    padding: 24,
    paddingTop: 16,
    paddingBottom: 40
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: '#176b45'
  },
  heading: {
    fontSize: 28,
    color: '#17211b',
    fontWeight: '800',
    marginTop: 8
  },
  copy: {
    color: '#738078',
    lineHeight: 21,
    marginTop: 7,
    marginBottom: 24
  },
  form: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e9ede9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2
  },
  label: {
    color: '#59645d',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: '#dfe5df',
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 14,
    fontSize: 16,
    marginBottom: 18,
    color: '#17211b',
    backgroundColor: '#fcfdfc'
  },
  datePickerTrigger: {
    borderWidth: 1,
    borderColor: '#dfe5df',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
    backgroundColor: '#fcfdfc',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  dateLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  calIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#eaf4ee',
    justifyContent: 'center',
    alignItems: 'center'
  },
  calIcon: {
    fontSize: 18
  },
  dateText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#17211b'
  },
  dateFriendly: {
    fontSize: 12,
    color: '#176b45',
    fontWeight: '600',
    marginTop: 2
  },
  pickBadge: {
    backgroundColor: '#eaf4ee',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8
  },
  pickBadgeText: {
    color: '#176b45',
    fontSize: 12,
    fontWeight: '700'
  },
  button: {
    height: 52,
    backgroundColor: '#176b45',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15
  },
  directionRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  directionButton: { flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: '#dfe5df', borderRadius: 11, alignItems: 'center', backgroundColor: '#fcfdfc' },
  directionButtonActive: { borderColor: '#176b45', backgroundColor: '#eaf4ee' },
  directionText: { color: '#59645d', fontWeight: '600', fontSize: 13 },
  directionTextActive: { color: '#176b45', fontWeight: '700' },
  receiptLabel: { marginTop: 20 },
  receiptButtons: { flexDirection: 'row', gap: 10 },
  receiptButton: { flex: 1, borderWidth: 1, borderColor: '#b9d6c4', backgroundColor: '#f4faf6', paddingVertical: 12, borderRadius: 11, alignItems: 'center' },
  receiptButtonText: { color: '#176b45', fontWeight: '700', fontSize: 13 },
  receiptPreview: { flexDirection: 'row', alignItems: 'center', marginTop: 12, padding: 10, borderRadius: 12, backgroundColor: '#f6f8f6', gap: 10 },
  receiptImage: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#e6ebe7' },
  receiptInfo: { flex: 1 },
  receiptTitle: { color: '#2c4435', fontWeight: '700', fontSize: 12 },
  receiptSub: { color: '#7b877f', fontSize: 10, marginTop: 3 },
  removeReceipt: { color: '#b84032', fontWeight: '600', fontSize: 12 },
  cancel: {
    alignItems: 'center',
    padding: 18
  },
  cancelText: {
    color: '#65716a',
    fontWeight: '600'
  }
});
