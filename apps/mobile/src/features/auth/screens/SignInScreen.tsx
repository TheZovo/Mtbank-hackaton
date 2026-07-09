import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { StyleSheet, Text, View } from "react-native";
import { requestOtp, verifyOtp } from "../../../shared/api/client";
import { useSessionStore } from "../../../shared/state/session-store";
import { colors } from "../../../shared/theme/colors";
import { PrimaryButton } from "../../../shared/ui/PrimaryButton";
import { Screen } from "../../../shared/ui/Screen";
import { SectionCard } from "../../../shared/ui/SectionCard";
import { SecondaryButton } from "../../../shared/ui/SecondaryButton";
import { TextField } from "../../../shared/ui/TextField";

type SignInStep = "phone" | "otp";

export function SignInScreen() {
  const setSession = useSessionStore((state) => state.setSession);
  const [step, setStep] = useState<SignInStep>("phone");
  const [phone, setPhone] = useState("+375");
  const [displayName, setDisplayName] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestOtpMutation = useMutation({
    mutationFn: () => requestOtp({ phone: phone.trim() }),
    onSuccess: (payload) => {
      setDevOtp(payload.dev_otp);
      setError(null);
      setStep("otp");
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "Не удалось отправить код.");
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: () =>
      verifyOtp({
        code: otpCode.trim(),
        name: displayName.trim() || undefined,
        phone: phone.trim(),
      }),
    onSuccess: async (payload) => {
      await setSession({
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token,
        me: {
          id: payload.user.id,
          phone: payload.user.phone,
          name: payload.user.name,
          daily_game_attempts_used: 0,
          daily_game_attempts_limit: 5,
          total_constellations_sum: 0,
          average_cashback: 0,
        },
      });
      setError(null);
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "Не удалось подтвердить OTP.");
    },
  });

  return (
    <Screen
      title="MTB Galaxy"
      subtitle="Двухшаговый вход по номеру телефона и OTP. После авторизации сессия сохраняется локально и восстанавливается при следующем запуске."
      footer={
        step === "phone" ? (
          <PrimaryButton disabled={!phone.trim() || requestOtpMutation.isPending} onPress={() => requestOtpMutation.mutate()}>
            {requestOtpMutation.isPending ? "Отправляем код..." : "Получить OTP"}
          </PrimaryButton>
        ) : (
          <View style={styles.footerActions}>
            <SecondaryButton onPress={() => setStep("phone")}>Изменить номер</SecondaryButton>
            <PrimaryButton disabled={!otpCode.trim() || verifyOtpMutation.isPending} onPress={() => verifyOtpMutation.mutate()}>
              {verifyOtpMutation.isPending ? "Проверяем..." : "Войти в приложение"}
            </PrimaryButton>
          </View>
        )
      }
    >
      <SectionCard
        description="Сначала пользователь вводит номер телефона, затем подтверждает вход кодом из SMS. Имя можно указать сразу, чтобы создать профиль без лишнего шага."
        title={step === "phone" ? "Шаг 1. Телефон" : "Шаг 2. Подтверждение"}
      >
        {step === "phone" ? (
          <>
            <TextField
              autoCapitalize="none"
              keyboardType="phone-pad"
              label="Номер телефона"
              onChangeText={setPhone}
              placeholder="+375 29 000 00 00"
              value={phone}
            />
            <TextField
              label="Имя (необязательно)"
              onChangeText={setDisplayName}
              placeholder="Например, Алина"
              value={displayName}
            />
          </>
        ) : (
          <>
            <View style={styles.phonePreview}>
              <Text style={styles.previewLabel}>Код отправлен на номер</Text>
              <Text style={styles.previewValue}>{phone}</Text>
            </View>
            <TextField
              autoCapitalize="none"
              keyboardType="number-pad"
              label="OTP-код"
              onChangeText={setOtpCode}
              placeholder="123456"
              value={otpCode}
            />
            {devOtp ? (
              <View style={styles.devCard}>
                <Text style={styles.devLabel}>Код для development-режима</Text>
                <Text style={styles.devValue}>Dev OTP: {devOtp}</Text>
              </View>
            ) : null}
          </>
        )}
      </SectionCard>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  footerActions: {
    gap: 12,
  },
  phonePreview: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 20,
    gap: 4,
    padding: 14,
  },
  previewLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },
  previewValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  devCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    gap: 4,
    padding: 14,
  },
  devLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  devValue: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "800",
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
});
