import React from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

import { colors, radius, spacing } from '../theme';

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

interface NumberFieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  unit?: string;
}

export function NumberField({ label, value, onChangeText, placeholder, unit }: NumberFieldProps) {
  return (
    <View style={styles.fieldRow}>
      <FieldLabel>{label}</FieldLabel>
      <View style={styles.inputWrap}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ?? '—'}
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
        />
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}

export function TextField({ label, value, onChangeText, placeholder, multiline }: TextFieldProps) {
  return (
    <View style={styles.fieldRow}>
      <FieldLabel>{label}</FieldLabel>
      <TextInput
        style={[styles.input, styles.inputFull, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
      />
    </View>
  );
}

interface ChipRowProps<T extends string> {
  options: readonly T[];
  labels?: Partial<Record<T, string>>;
  selected: T | null;
  onSelect: (v: T) => void;
}

export function ChipRow<T extends string>({ options, labels, selected, onSelect }: ChipRowProps<T>) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => {
        const active = selected === opt;
        return (
          <TouchableOpacity
            key={opt}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onSelect(opt)}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {labels?.[opt] ?? opt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

export function Button({ title, onPress, loading, disabled, variant = 'primary' }: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      style={[
        styles.button,
        variant === 'secondary' && styles.buttonSecondary,
        isDisabled && styles.buttonDisabled,
      ]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : colors.primaryDark} />
      ) : (
        <Text
          style={[styles.buttonText, variant === 'secondary' && styles.buttonTextSecondary]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

/** Branded header showing both project logos. */
export function BrandHeader({ subtitle }: { subtitle?: string }) {
  return (
    <View style={styles.brandHeader}>
      <Image
        source={require('../../assets/hai-logo.png')}
        style={styles.brandLogo}
        resizeMode="contain"
      />
      <View style={styles.brandTextWrap}>
        <Text style={styles.brandTitle}>HMon</Text>
        <Text style={styles.brandSubtitle}>
          {subtitle ?? 'Hydroponics, AI and IoT for Sustainable Education'}
        </Text>
      </View>
      <Image
        source={require('../../assets/bau-logo.png')}
        style={styles.brandLogoWide}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  fieldRow: {
    marginBottom: spacing.md,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
    backgroundColor: '#fff',
    minWidth: 120,
  },
  inputFull: {
    alignSelf: 'stretch',
  },
  inputMultiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  unit: {
    marginLeft: spacing.sm,
    color: colors.textMuted,
    fontSize: 14,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.text,
    fontSize: 14,
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonSecondary: {
    backgroundColor: colors.primaryLight,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonTextSecondary: {
    color: colors.primaryDark,
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  brandLogo: {
    width: 44,
    height: 44,
  },
  brandLogoWide: {
    width: 84,
    height: 40,
  },
  brandTextWrap: {
    flex: 1,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy,
  },
  brandSubtitle: {
    fontSize: 10,
    color: colors.textMuted,
  },
});
