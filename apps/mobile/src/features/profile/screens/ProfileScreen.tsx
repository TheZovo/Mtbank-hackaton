import Clipboard from "@react-native-clipboard/clipboard";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { getMe, getPromocodes, logout, saveNickname } from "../../../shared/api/client";
import { useSessionStore } from "../../../shared/state/session-store";
import { colors } from "../../../shared/theme/colors";
import { LoadingView } from "../../../shared/ui/LoadingView";
import { PrimaryButton } from "../../../shared/ui/PrimaryButton";
import { Screen } from "../../../shared/ui/Screen";
import { SectionCard } from "../../../shared/ui/SectionCard";
import { SecondaryButton } from "../../../shared/ui/SecondaryButton";
import { StatCard } from "../../../shared/ui/StatCard";
import { TextField } from "../../../shared/ui/TextField";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ProfileScreen() {
  const queryClient = useQueryClient();
  const clearSession = useSessionStore((state) => state.clear);
  const updateMe = useSessionStore((state) => state.updateMe);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [nicknameFeedback, setNicknameFeedback] = useState<string | null>(null);
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
  });
  const promocodesQuery = useQuery({
    queryKey: ["promocodes"],
    queryFn: getPromocodes,
  });
  const saveNicknameMutation = useMutation({
    mutationFn: async () => saveNickname(nicknameDraft.trim(), meQuery.data?.id),
    onSuccess: () => {
      if (!meQuery.data) {
        return;
      }
      updateMe({
        ...meQuery.data,
        nickname: nicknameDraft.trim(),
      });
      setNicknameFeedback("Nickname сохранён.");
      void queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (error) => {
      setNicknameFeedback(error instanceof Error ? error.message : "Не удалось сохранить nickname.");
    },
  });

  useEffect(() => {
    if (meQuery.data?.nickname) {
      setNicknameDraft(meQuery.data.nickname);
      return;
    }
    if (meQuery.data && !nicknameDraft) {
      setNicknameDraft("");
    }
  }, [meQuery.data?.nickname]);

  if (meQuery.isLoading || promocodesQuery.isLoading) {
    return <LoadingView label="Собираем профиль..." />;
  }

  if (meQuery.isError || promocodesQuery.isError || !meQuery.data || !promocodesQuery.data) {
    return (
      <Screen title="Профиль" subtitle="Не удалось загрузить профиль.">
        <SectionCard title="Ошибка загрузки">
          <Text style={styles.emptyText}>
            {meQuery.error instanceof Error
              ? meQuery.error.message
              : promocodesQuery.error instanceof Error
                ? promocodesQuery.error.message
                : "Повторите попытку позже."}
          </Text>
        </SectionCard>
      </Screen>
    );
  }

  const me = meQuery.data;

  async function handleLogout() {
    await logout().catch(() => undefined);
    await clearSession();
    queryClient.clear();
  }

  function handleCopy(code: string) {
    Clipboard.setString(code);
    setCopiedCode(code);
  }

  return (
    <Screen
      title="Профиль"
      subtitle="Экран FE1 показывает основные данные пользователя, статистику по игровым попыткам и все персональные промокоды."
      footer={<PrimaryButton onPress={() => void handleLogout()}>Выйти</PrimaryButton>}
    >
      <SectionCard title="Личные данные">
        <View style={styles.identityCard}>
          <Text style={styles.identityName}>{me.name}</Text>
          <Text style={styles.identityPhone}>{me.phone}</Text>
          <Text style={styles.identityMeta}>Nickname: {me.nickname ?? "не задан"}</Text>
        </View>
      </SectionCard>

      <SectionCard title="Nickname" description="Документ требует отдельный nickname-flow для поиска друзей и игровых сценариев.">
        <TextField
          autoCapitalize="none"
          label="Ваш nickname"
          onChangeText={setNicknameDraft}
          placeholder="Ваш nickname"
          value={nicknameDraft}
        />
        <PrimaryButton disabled={!nicknameDraft.trim() || saveNicknameMutation.isPending} onPress={() => saveNicknameMutation.mutate()}>
          {saveNicknameMutation.isPending ? "Сохраняем..." : "Сохранить nickname"}
        </PrimaryButton>
        {nicknameFeedback ? <Text style={styles.feedback}>{nicknameFeedback}</Text> : null}
      </SectionCard>

      <SectionCard title="Статистика">
        <View style={styles.row}>
          <StatCard label="Созвездия" value={me.total_constellations_sum} />
          <StatCard label="Средний кешбэк" value={`${me.average_cashback.toFixed(1)}%`} />
        </View>
        <View style={styles.row}>
          <StatCard label="Попытки сегодня" value={me.daily_game_attempts_used} />
          <StatCard label="Лимит попыток" value={me.daily_game_attempts_limit} />
        </View>
      </SectionCard>

      <SectionCard title="Мои промокоды" description="Каждый промокод можно сразу скопировать и использовать в нужный момент.">
        {promocodesQuery.data.promocodes.length ? (
          promocodesQuery.data.promocodes.map((promo) => (
            <View key={promo.code} style={styles.promoCard}>
              <View style={styles.promoContent}>
                <Text style={styles.promoCode}>{promo.code}</Text>
                <Text style={styles.promoMeta}>
                  Планета: {promo.planet_id} • Выпущен: {formatDate(promo.issued_at)}
                </Text>
                <Text style={styles.promoStatus}>{promo.used_at ? "Использован" : "Активен"}</Text>
              </View>
              <View style={styles.promoAction}>
                <SecondaryButton onPress={() => handleCopy(promo.code)}>
                  {copiedCode === promo.code ? "Скопировано" : "Скопировать"}
                </SecondaryButton>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Пока промокодов нет. Они появятся после игровых достижений и периодических выдач.</Text>
        )}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
  },
  identityCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 22,
    gap: 6,
    padding: 16,
  },
  identityName: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  identityPhone: {
    color: colors.textMuted,
    fontSize: 15,
  },
  identityMeta: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  feedback: {
    color: colors.primary,
    fontSize: 13,
    lineHeight: 19,
  },
  promoCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 20,
    gap: 12,
    padding: 14,
  },
  promoContent: {
    gap: 4,
  },
  promoCode: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  promoMeta: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  promoStatus: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  promoAction: {
    width: 160,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
});
