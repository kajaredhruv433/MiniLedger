import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { api, Loan, Summary } from '../services/api';
import { LoanCard } from '../components/LoanCard';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;
const emptySummary: Summary = { totalLent: 0, totalRepaid: 0, totalBorrowed: 0, totalPaid: 0, toCollect: 0, toRepay: 0, overdueAmount: 0, overdueToRepay: 0 };
const money = (value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function DashboardScreen({ navigation }: Props) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const [loanData, summaryData] = await Promise.all([api.getLoans(), api.getSummary()]);
      setLoans(loanData);
      setSummary(summaryData);
    } catch (error) { Alert.alert('Could not load ledger', (error as Error).message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const markRepaid = async (id: string) => {
    try { await api.markRepaid(id); await load(true); }
    catch (error) { Alert.alert('Could not update loan', (error as Error).message); }
  };
  const deleteLoan = (id: string, friendName: string) => Alert.alert('Delete entry', `Delete the entry for ${friendName}?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => {
      try { await api.deleteLoan(id); await load(true); }
      catch (error) { Alert.alert('Could not delete loan', (error as Error).message); }
    } }
  ]);
  const logout = async () => { await api.logout(); navigation.reset({ index: 0, routes: [{ name: 'Login' }] }); };
  return <View style={styles.screen}>
    <FlatList
      data={loans}
      keyExtractor={(item) => String(item.id)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#176b45" />}
      contentContainerStyle={styles.content}
      ListHeaderComponent={<>
        <View style={styles.header}><View><Text style={styles.kicker}>YOUR MONEY, CLEARLY</Text><Text style={styles.heading}>MiniLedger</Text></View><Pressable onPress={logout}><Text style={styles.logout}>Log out</Text></Pressable></View>
        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>YOU LENT</Text><Text style={styles.total}>{money(summary.totalLent)}</Text>
          <View style={styles.statsRow}><View style={styles.stat}><Text style={styles.miniLabel}>COLLECTED</Text><Text style={styles.miniValue}>{money(summary.totalRepaid)}</Text></View><View style={styles.stat}><Text style={styles.miniLabel}>TO COLLECT</Text><Text style={styles.miniValue}>{money(summary.toCollect)}</Text></View></View>
          <View style={styles.summaryDivider} />
          <Text style={styles.summaryLabel}>YOU BORROWED</Text><Text style={styles.totalSecondary}>{money(summary.totalBorrowed)}</Text>
          <View style={styles.statsRow}><View style={styles.stat}><Text style={styles.miniLabel}>PAID BACK</Text><Text style={styles.miniValue}>{money(summary.totalPaid)}</Text></View><View style={styles.stat}><Text style={styles.miniLabel}>TO REPAY</Text><Text style={styles.miniValue}>{money(summary.toRepay)}</Text></View></View>
          {(summary.overdueAmount > 0 || summary.overdueToRepay > 0) && <View style={styles.overdueRow}><Text style={styles.overdueSummary}>Overdue to collect {money(summary.overdueAmount)}</Text><Text style={styles.overdueSummary}>Overdue to repay {money(summary.overdueToRepay)}</Text></View>}
        </View>
        <View style={styles.listHeading}><Text style={styles.sectionTitle}>Your entries</Text><Text style={styles.count}>{loans.length} {loans.length === 1 ? 'loan' : 'loans'}</Text></View>
      </>}
      ListEmptyComponent={loading ? <ActivityIndicator color="#176b45" style={{ marginTop: 36 }} /> : <View style={styles.empty}><Text style={styles.emptyTitle}>A clean slate</Text><Text style={styles.emptyCopy}>Add a lent or borrowed amount to start tracking.</Text></View>}
      renderItem={({ item }) => <LoanCard loan={item} onRepaid={() => markRepaid(String(item.id))} onDelete={() => deleteLoan(String(item.id), item.friendName)} />}
    />
    <Pressable style={styles.fab} onPress={() => navigation.navigate('AddLoan')}><Text style={styles.plus}>＋</Text><Text style={styles.fabText}>Add loan</Text></Pressable>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f6f7f4' }, content: { padding: 20, paddingBottom: 100 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, marginTop: 6 },
  kicker: { fontSize: 10, color: '#176b45', fontWeight: '700', letterSpacing: 1.3 }, heading: { fontSize: 24, color: '#17211b', fontWeight: '800', marginTop: 3 }, logout: { color: '#68746c', fontWeight: '600' },
  summary: { backgroundColor: '#176b45', borderRadius: 20, padding: 20, marginBottom: 24 },
  summaryLabel: { color: '#c8e2d3', fontSize: 10, fontWeight: '700', letterSpacing: 1.3 },
  total: { color: '#fff', fontWeight: '800', fontSize: 30, marginTop: 5 }, totalSecondary: { color: '#fff', fontWeight: '800', fontSize: 24, marginTop: 5 },
  statsRow: { flexDirection: 'row', gap: 28, marginTop: 16 }, stat: { flex: 1 }, miniLabel: { color: '#c8e2d3', fontSize: 9, fontWeight: '700', letterSpacing: 1 }, miniValue: { color: '#fff', fontWeight: '700', fontSize: 15, marginTop: 4 },
  summaryDivider: { height: 1, backgroundColor: '#60977a', marginVertical: 18 },
  overdueRow: { borderTopWidth: 1, borderTopColor: '#60977a', marginTop: 16, paddingTop: 12, gap: 5 }, overdueSummary: { color: '#ffe0d9', fontSize: 11, fontWeight: '700' },
  listHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }, sectionTitle: { color: '#17211b', fontSize: 18, fontWeight: '700' }, count: { color: '#89938b', fontSize: 12 },
  empty: { alignItems: 'center', paddingTop: 36 }, emptyTitle: { color: '#435047', fontSize: 16, fontWeight: '700' }, emptyCopy: { color: '#89938b', marginTop: 6, fontSize: 13 },
  fab: { position: 'absolute', bottom: 20, alignSelf: 'center', backgroundColor: '#176b45', borderRadius: 30, height: 54, paddingHorizontal: 21, flexDirection: 'row', alignItems: 'center', gap: 8, elevation: 5, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8 },
  plus: { fontSize: 25, color: '#fff', marginTop: -2 }, fabText: { color: '#fff', fontWeight: '700', fontSize: 15 }
});
