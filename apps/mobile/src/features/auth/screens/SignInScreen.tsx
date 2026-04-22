import { useState } from "react";
import { Text, View } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { requestOtp, verifyOtp } from "../../../shared/api/client";
import { Screen } from "../../../shared/ui/Screen";
import { SectionCard } from "../../../shared/ui/SectionCard";
import { TextField } from "../../../shared/ui/TextField";
import { PrimaryButton } from "../../../shared/ui/PrimaryButton";
import { useSessionStore } from "../../../shared/state/session-store";

export function SignInScreen() {
  const setSession = useSessionStore((state) => state.setSession);
  const [phone, setPhone] = useState("+1");
  const [displayName, setDisplayName] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestOtpMutation = useMutation({
    mutationFn: () => requestOtp({ phone }),
    onSuccess: (payload) => {
      setChallengeId(payload.challenge_id);
      setDevCode(payload.dev_code ?? null);
      setError(null);
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "Не удалось запросить OTP");
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: () =>
      verifyOtp({
        challenge_id: challengeId ?? "",
        phone,
        otp_code: otpCode,
        display_name: displayName || undefined,
      }),
    onSuccess: async (payload) => {
      await setSession({
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token,
        me: payload.me,
      });
      setError(null);
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "Не удалось подтвердить OTP");
    },
  });

  return (
    <Screen
      title="MTB Galaxy"
      subtitle="Мобильный вход через телефон и OTP. После авторизации весь прогресс и награды живут на сервере."
      footer={
        challengeId ? (
          <PrimaryButton
            disabled={!otpCode || verifyOtpMutation.isPending}
            onPress={() => verifyOtpMutation.mutate()}
          >
            {verifyOtpMutation.isPending ? "Проверяем..." : "Войти в приложение"}
          </PrimaryButton>
        ) : (
          <PrimaryButton
            disabled={!phone || requestOtpMutation.isPending}
            onPress={() => requestOtpMutation.mutate()}
          >
            {requestOtpMutation.isPending ? "Запрашиваем..." : "Получить OTP"}
          </PrimaryButton>
        )
      }
    >
      <SectionCard title="Телефон" description="Используйте мобильный номер для входа и создания нового профиля.">
        <TextField
          keyboardType="phone-pad"
          label="Номер телефона"
          onChangeText={setPhone}
          placeholder="+1 999 123 45 67"
          value={phone}
        />
        <TextField
          label="Имя игрока"
          onChangeText={setDisplayName}
          placeholder="Например, Pilot Roman"
          value={displayName}
        />
      </SectionCard>

      {challengeId ? (
        <SectionCard
          title="Подтверждение"
          description="Введите код из SMS. В development-режиме сервер вернёт тестовый OTP прямо в ответе."
        >
          <TextField
            keyboardType="number-pad"
            label="OTP код"
            onChangeText={setOtpCode}
            placeholder="000000"
            value={otpCode}
          />
          {devCode ? <Text style={{ color: "#9DB6C9" }}>Dev OTP: {devCode}</Text> : null}
        </SectionCard>
      ) : null}

      {error ? <Text style={{ color: "#FCA5A5" }}>{error}</Text> : null}
    </Screen>
  );
}
