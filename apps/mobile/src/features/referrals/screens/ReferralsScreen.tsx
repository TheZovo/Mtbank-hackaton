import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Share, StyleSheet, Text, View } from "react-native";
import { createReferral, getReferrals } from "../../../shared/api/client";
import { colors } from "../../../shared/theme/colors";
import { LoadingView } from "../../../shared/ui/LoadingView";
import { PrimaryButton } from "../../../shared/ui/PrimaryButton";
import { Screen } from "../../../shared/ui/Screen";
import { SectionCard } from "../../../shared/ui/SectionCard";
import { SecondaryButton } from "../../../shared/ui/SecondaryButton";
import { TextField } from "../../../shared/ui/TextField";

export function ReferralsScreen() {
  const queryClient = useQueryClient();
  const [inviteePhone, setInviteePhone] = useState("+375");
  const [feedback, setFeedback] = useState<string | null>(null);
  const referralsQuery = useQuery({
    queryKey: ["referrals"],
    queryFn: getReferrals,
  });
  const createMutation = useMutation({
    mutationFn: () => createReferral({ phone: inviteePhone.trim() }),
    onSuccess: () => {
      setFeedback("Приглашение отправлено.");
      setInviteePhone("+375");
      void queryClient.invalidateQueries({ queryKey: ["referrals"] });
    },
    onError: (mutationError) => {
      setFeedback(mutationError instanceof Error ? mutationError.message : "Не удалось создать приглашение.");
    },
  });

  const inviteLink = useMemo(() => {
    if (!referralsQuery.data?.invite_code) {
      return "";
    }
    return `app://invite?code=${referralsQuery.data.invite_code}`;
  }, [referralsQuery.data?.invite_code]);

  async function handleShare() {
    if (!inviteLink) {
      return;
    }
    await Share.share({
      message: inviteLink,
      url: inviteLink,
    });
  }

  if (referralsQuery.isLoading || !referralsQuery.data) {
    return <LoadingView label="Загружаем реферальную программу..." />;
  }

  return (
    <Screen
      title="Рефералы"
      subtitle="FE1 показывает персональный invite code, генерирует ссылку для шаринга и позволяет отправлять новые приглашения прямо из приложения."
    >
      <SectionCard title="Ваш код приглашения" description="Поделитесь ссылкой, чтобы пользователь перешёл в приложение уже с привязанным invite code.">
        <View style={styles.codeCard}>
          <Text style={styles.codeValue}>{referralsQuery.data.invite_code}</Text>
          <Text style={styles.codeLink}>{inviteLink}</Text>
        </View>
        <SecondaryButton onPress={() => void handleShare()}>Поделиться</SecondaryButton>
      </SectionCard>

      <SectionCard title="Пригласить друга">
        <TextField
          autoCapitalize="none"
          keyboardType="phone-pad"
          label="Телефон друга"
          onChangeText={setInviteePhone}
          placeholder="+375 29 000 00 00"
          value={inviteePhone}
        />
        <PrimaryButton disabled={!inviteePhone.trim() || createMutation.isPending} onPress={() => createMutation.mutate()}>
          {createMutation.isPending ? "Отправляем..." : "Пригласить"}
        </PrimaryButton>
        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
      </SectionCard>

      <SectionCard title="Приглашённые друзья">
        {referralsQuery.data.referrals.length ? (
          referralsQuery.data.referrals.map((referral) => (
            <View key={`${referral.phone}-${referral.status}`} style={styles.referralCard}>
              <Text style={styles.referralPhone}>{referral.phone}</Text>
              <Text style={styles.referralMeta}>
                Статус: {referral.status} • Малых звёзд: +{referral.stars_earned}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Пока приглашённых друзей нет. Первый приглашённый появится здесь сразу после отправки.</Text>
        )}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  codeCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 20,
    gap: 6,
    padding: 14,
  },
  codeValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 1,
  },
  codeLink: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  feedback: {
    color: colors.primary,
    fontSize: 13,
    lineHeight: 19,
  },
  referralCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 18,
    gap: 4,
    padding: 14,
  },
  referralPhone: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  referralMeta: {
    color: colors.textMuted,
    fontSize: 13,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});
