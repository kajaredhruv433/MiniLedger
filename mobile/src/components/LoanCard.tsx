import React, { useEffect, useState } from 'react';
import { AppState, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { File } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as MediaLibraryLegacy from 'expo-media-library/legacy';
import { Loan, receiptUrl } from '../services/api';

const money = (value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const today = (() => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; })();

export function LoanCard({ loan, onRepaid, onDelete }: { loan: Loan; onRepaid: () => void; onDelete: () => void }) {
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const screenFocused = useIsFocused();
  const overdue = !loan.repaidAt && loan.dueDate < today;
  useEffect(() => {
    let active = true;
    const checkReceipt = () => {
      setReceiptUri(null);
      if (!loan.receiptPath) return;
      const showUploadedCopy = () => { if (active) setReceiptUri(receiptUrl(loan.receiptPath!)); };
      if (!loan.receiptGalleryUri) {
        showUploadedCopy();
        return;
      }
      try {
        const galleryPhoto = new File(loan.receiptGalleryUri);
        if (galleryPhoto.exists && active) setReceiptUri(loan.receiptGalleryUri);
        else if (loan.receiptAssetId) {
          MediaLibrary.getPermissionsAsync(false, ['photo'])
            .then((permission) => {
              if (!active) return;
              // Expo Go denies broad reads: show the uploaded copy instead of blocking thumbnails.
              if (!permission.granted) return showUploadedCopy();
              MediaLibraryLegacy.getAssetInfoAsync(loan.receiptAssetId!)
                .then((asset) => { if (active && asset) setReceiptUri(asset.localUri || asset.uri); })
                .catch(() => { if (active) setReceiptUri(null); });
            })
            .catch(showUploadedCopy);
        } else showUploadedCopy();
      } catch {
        showUploadedCopy();
      }
    };
    checkReceipt();
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') checkReceipt(); });
    return () => { active = false; subscription.remove(); };
  }, [loan.receiptGalleryUri, loan.receiptPath, screenFocused]);
  return (
    <View style={[styles.card, overdue && styles.overdueCard]}>
      <View style={styles.topRow}>
        <View style={styles.nameWrap}>
          <Text style={styles.name}>{loan.friendName}</Text>
          <Text style={styles.direction}>{loan.direction === 'borrowed' ? 'You borrowed' : 'You lent'}</Text>
          <Text style={[styles.due, overdue && styles.overdueText]}>{overdue ? 'Overdue' : `Due ${loan.dueDate}`}</Text>
        </View>
        <Text style={styles.amount}>{money(loan.amount)}</Text>
      </View>
      {receiptUri ? <Image source={{ uri: receiptUri }} style={styles.receipt} resizeMode="cover" onError={() => setReceiptUri(null)} /> : null}
      <View style={styles.bottomRow}>
        <Text style={[styles.status, loan.repaidAt ? styles.paid : styles.outstanding]}>{loan.repaidAt ? `✓ ${loan.direction === 'borrowed' ? 'Paid back' : 'Collected'}` : loan.direction === 'borrowed' ? 'To repay' : 'To collect'}</Text>
        <View style={styles.actions}>
          {!loan.repaidAt && <Pressable onPress={onRepaid} hitSlop={8}><Text style={styles.action}>{loan.direction === 'borrowed' ? 'Mark paid' : 'Mark collected'}</Text></Pressable>}
          <Pressable onPress={onDelete} hitSlop={8}><Text style={styles.deleteAction}>Delete</Text></Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#eaedf0' },
  overdueCard: { borderColor: '#f0b4ab', backgroundColor: '#fffafa' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  nameWrap: { gap: 4 }, name: { fontSize: 16, fontWeight: '700', color: '#17211b' },
  direction: { color: '#176b45', fontSize: 12, fontWeight: '600' },
  due: { color: '#758078', fontSize: 12 }, overdueText: { color: '#c24636', fontWeight: '700' },
  amount: { fontSize: 17, fontWeight: '700', color: '#17211b' },
  receipt: { height: 150, width: '100%', borderRadius: 12, marginTop: 14, backgroundColor: '#f0f2f0' },
  bottomRow: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#edf0ed', flexDirection: 'row', justifyContent: 'space-between' },
  actions: { flexDirection: 'row', gap: 16 },
  status: { fontSize: 12, color: '#66716a' }, paid: { color: '#17834a', fontWeight: '600' },
  outstanding: { color: '#59645d', fontWeight: '700' },
  action: { color: '#157347', fontWeight: '700', fontSize: 12 },
  deleteAction: { color: '#b84032', fontWeight: '600', fontSize: 12 }
});
