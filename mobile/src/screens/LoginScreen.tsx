import React, { useRef, useState, useEffect } from 'react';
import {
  Alert,
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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../services/api';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    Keyboard.dismiss();
    if (!/^\d{10}$/.test(phone.trim())) {
      return Alert.alert(
        'Check phone number',
        'Enter exactly 10 digits, for example 9876543210.'
      );
    }
    setBusy(true);
    try {
      const result = await api.requestOtp(phone.trim());
      setSent(true);
      Alert.alert('OTP requested', result.message);
    } catch (e) {
      Alert.alert('Could not request OTP', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    Keyboard.dismiss();
    if (!/^\d{6}$/.test(otp.trim())) {
      return Alert.alert(
        'Check OTP',
        'Enter the 6-digit code shown in the backend server terminal.'
      );
    }
    setBusy(true);
    try {
      await api.verifyOtp(phone.trim(), otp.trim());
      navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
    } catch (e) {
      Alert.alert('Could not sign in', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const resetFlow = () => {
    Keyboard.dismiss();
    setSent(false);
    setOtp('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Brand header */}
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>₹</Text>
            </View>
            <Text style={styles.wordmark}>MiniLedger</Text>
            <Text style={styles.tagline}>
              Good friendships deserve clear accounts.
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.panel}>
            <Text style={styles.heading}>
              {sent ? 'Enter verification code' : 'Welcome back'}
            </Text>
            <Text style={styles.copy}>
              {sent
                ? 'Enter the 6-digit mock OTP from the backend server terminal.'
                : 'Sign in with your phone number to manage your lending.'}
            </Text>

            {/* Phone Input */}
            <View style={styles.labelRow}>
              <Text style={styles.label}>PHONE NUMBER</Text>
              {sent && (
                <Pressable onPress={resetFlow} hitSlop={8}>
                  <Text style={styles.changePhoneText}>Change</Text>
                </Pressable>
              )}
            </View>
            <TextInput
              style={[styles.input, sent && styles.inputReadonly]}
              placeholder="98765 43210"
              placeholderTextColor="#9ba59e"
              keyboardType="phone-pad"
              autoCapitalize="none"
              editable={!sent && !busy}
              value={phone}
              onChangeText={setPhone}
              returnKeyType={sent ? 'done' : 'send'}
              onSubmitEditing={sent ? undefined : send}
            />

            {/* OTP Section */}
            {sent && (
              <View style={styles.otpSection}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>6-DIGIT OTP</Text>
                  <Text style={styles.otpHint}>Terminal code</Text>
                </View>
                <TextInput
                  autoFocus
                  style={[styles.input, styles.otpInput]}
                  placeholder="• • • • • •"
                  placeholderTextColor="#b0bcb3"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={(val) => {
                    setOtp(val);
                    if (val.trim().length === 6) {
                      Keyboard.dismiss();
                    }
                  }}
                  returnKeyType="done"
                  onSubmitEditing={verify}
                />
              </View>
            )}

            {/* Submit Action */}
            <Pressable
              style={[styles.button, busy && styles.disabled]}
              disabled={busy}
              onPress={sent ? verify : send}
            >
              <Text style={styles.buttonText}>
                {busy
                  ? 'Please wait…'
                  : sent
                  ? 'Verify and continue'
                  : 'Send login code'}
              </Text>
            </Pressable>

            {/* Resend Link */}
            {sent && (
              <Pressable onPress={send} style={styles.resend} disabled={busy}>
                <Text style={styles.resendText}>Send a new code</Text>
              </Pressable>
            )}
          </View>

          <Text style={styles.footer}>
            Private, simple tracking for money you lend.
          </Text>

          {/* Extra bottom spacer to ensure clearance above keyboard */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </TouchableWithoutFeedback>
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
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingTop: 40,
    paddingBottom: 40
  },
  brand: {
    alignItems: 'center',
    marginBottom: 26
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#176b45',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#176b45',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4
  },
  logoText: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700'
  },
  wordmark: {
    fontSize: 24,
    fontWeight: '800',
    color: '#17211b'
  },
  tagline: {
    color: '#738078',
    marginTop: 6,
    fontSize: 14,
    textAlign: 'center'
  },
  panel: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 22,
    borderColor: '#e9ede9',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2
  },
  heading: {
    fontSize: 21,
    color: '#17211b',
    fontWeight: '700'
  },
  copy: {
    color: '#738078',
    lineHeight: 20,
    marginTop: 7,
    marginBottom: 20,
    fontSize: 14
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  label: {
    color: '#59645d',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1
  },
  changePhoneText: {
    color: '#176b45',
    fontSize: 12,
    fontWeight: '700'
  },
  input: {
    borderWidth: 1,
    borderColor: '#dfe5df',
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 14,
    fontSize: 16,
    marginBottom: 16,
    color: '#17211b',
    backgroundColor: '#fcfdfc'
  },
  inputReadonly: {
    backgroundColor: '#f4f6f4',
    color: '#6e7a72'
  },
  otpSection: {
    marginTop: 4
  },
  otpHint: {
    fontSize: 11,
    color: '#8e9a92',
    fontWeight: '500'
  },
  otpInput: {
    letterSpacing: 8,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    borderColor: '#176b45',
    backgroundColor: '#fbfdfb'
  },
  button: {
    height: 52,
    backgroundColor: '#176b45',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6
  },
  disabled: {
    opacity: 0.6
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15
  },
  resend: {
    alignItems: 'center',
    paddingTop: 16
  },
  resendText: {
    color: '#176b45',
    fontWeight: '600',
    fontSize: 14
  },
  footer: {
    marginTop: 24,
    textAlign: 'center',
    color: '#88918b',
    fontSize: 12
  }
});
