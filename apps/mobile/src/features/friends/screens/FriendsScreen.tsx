import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Modal, Share, StyleSheet, Text, View } from "react-native";
import { addFriend, findUserByNickname, getFriends, getReferrals, playTogether } from "../../../shared/api/client";
import { useSessionStore } from "../../../shared/state/session-store";
import { colors } from "../../../shared/theme/colors";
import { LoadingView } from "../../../shared/ui/LoadingView";
import { PrimaryButton } from "../../../shared/ui/PrimaryButton";
import { Screen } from "../../../shared/ui/Screen";
import { SectionCard } from "../../../shared/ui/SectionCard";
import { SecondaryButton } from "../../../shared/ui/SecondaryButton";
import { TextField } from "../../../shared/ui/TextField";

export function FriendsScreen() {
  const queryClient = useQueryClient();
  const me = useSessionStore((state) => state.me);
  const [searchValue, setSearchValue] = useState("");
  const [searchResult, setSearchResult] = useState<{ id: string; nickname: string } | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [giftCode, setGiftCode] = useState<string | null>(null);
  const referralsQuery = useQuery({
    queryKey: ["referrals"],
    queryFn: getReferrals,
  });
  const friendsQuery = useQuery({
    enabled: Boolean(me?.id),
    queryKey: ["friends", me?.id],
    queryFn: () => getFriends(me?.id ?? ""),
  });

  const findMutation = useMutation({
    mutationFn: () => findUserByNickname(searchValue.trim()),
    onSuccess: (user) => {
      setSearchResult(user);
      setFeedback(null);
    },
    onError: (error) => {
      setSearchResult(null);
      setFeedback(error instanceof Error ? error.message : "Пользователь не найден.");
    },
  });
  const addFriendMutation = useMutation({
    mutationFn: () => addFriend(me?.id ?? "", searchResult?.id ?? ""),
    onSuccess: async () => {
      setFeedback("Друг добавлен.");
      await queryClient.invalidateQueries({ queryKey: ["friends", me?.id] });
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : "Не удалось добавить друга.");
    },
  });
  const playMutation = useMutation({
    mutationFn: (friendId: string) => playTogether(me?.id ?? "", friendId),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["friends", me?.id] });
      if (result.gift && result.promocode) {
        setGiftCode(result.promocode);
        return;
      }
      setFeedback("Совместная игра засчитана.");
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : "Не удалось сохранить совместную игру.");
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
    await Share.share({ message: inviteLink, url: inviteLink });
  }

  if (!me?.id) {
    return (
      <Screen title="Друзья" subtitle="Сначала авторизуйтесь и сохраните nickname.">
        <SectionCard title="Нет сессии">
          <Text style={styles.metaText}>Для поиска друзей нужен активный пользовательский профиль.</Text>
        </SectionCard>
      </Screen>
    );
  }

  if (referralsQuery.isLoading || friendsQuery.isLoading) {
    return <LoadingView label="Собираем социальную орбиту..." />;
  }

  if (referralsQuery.isError || friendsQuery.isError || !referralsQuery.data || !friendsQuery.data) {
    return (
      <Screen title="Друзья" subtitle="Не удалось загрузить социальные данные.">
        <SectionCard title="Ошибка">
          <Text style={styles.metaText}>
            {referralsQuery.error instanceof Error
              ? referralsQuery.error.message
              : friendsQuery.error instanceof Error
                ? friendsQuery.error.message
                : "Повторите попытку позже."}
          </Text>
        </SectionCard>
      </Screen>
    );
  }

  return (
    <Screen title="Друзья" subtitle="Экран объединяет invite-code, поиск по nickname, дружбу и подарок за совместные игровые сессии.">
      <SectionCard title="Ваш код приглашения" description="Шеринг сохранён из существующего referral-flow, чтобы не терять текущий функционал.">
        <View style={styles.inviteCard}>
          <Text style={styles.inviteCode}>{referralsQuery.data.invite_code}</Text>
          <Text style={styles.inviteLink}>{inviteLink}</Text>
        </View>
        <SecondaryButton onPress={() => void handleShare()}>Поделиться кодом</SecondaryButton>
      </SectionCard>

      <SectionCard title="Найти по nickname">
        <TextField
          autoCapitalize="none"
          label="Nickname друга"
          onChangeText={setSearchValue}
          placeholder="Например, alice"
          value={searchValue}
        />
        <PrimaryButton disabled={!searchValue.trim() || findMutation.isPending} onPress={() => findMutation.mutate()}>
          {findMutation.isPending ? "Ищем..." : "Найти"}
        </PrimaryButton>
        {searchResult ? (
          <View style={styles.searchCard}>
            <Text style={styles.friendName}>{searchResult.nickname}</Text>
            <SecondaryButton disabled={addFriendMutation.isPending} onPress={() => addFriendMutation.mutate()}>
              {addFriendMutation.isPending ? "Добавляем..." : "Добавить в друзья"}
            </SecondaryButton>
          </View>
        ) : null}
        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
      </SectionCard>

      <SectionCard title="Список друзей">
        {friendsQuery.data.length ? (
          friendsQuery.data.map((friend) => (
            <View key={friend.id} style={styles.friendCard}>
              <View style={styles.friendCopy}>
                <Text style={styles.friendName}>{friend.nickname}</Text>
                <Text style={styles.metaText}>Совместных игр: {friend.games_played}</Text>
              </View>
              <View style={styles.friendActions}>
                <SecondaryButton disabled={playMutation.isPending} onPress={() => playMutation.mutate(friend.id)}>
                  Играть вместе
                </SecondaryButton>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.metaText}>Пока друзей нет. Найдите пользователя по nickname и добавьте его в список.</Text>
        )}
      </SectionCard>

      <Modal animationType="fade" onRequestClose={() => setGiftCode(null)} transparent visible={Boolean(giftCode)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Подарок вселенной</Text>
            <Text style={styles.modalCode}>{giftCode}</Text>
            <Text style={styles.metaText}>Промокод выдан за третью совместную игру.</Text>
            <PrimaryButton onPress={() => setGiftCode(null)}>Закрыть</PrimaryButton>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  inviteCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 20,
    gap: 6,
    padding: 14,
  },
  inviteCode: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 1,
  },
  inviteLink: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  searchCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 20,
    gap: 12,
    padding: 14,
  },
  friendCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 20,
    gap: 12,
    padding: 14,
  },
  friendCopy: {
    gap: 4,
  },
  friendName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  friendActions: {
    width: 180,
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  feedback: {
    color: colors.primary,
    fontSize: 13,
    lineHeight: 19,
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(5, 8, 18, 0.78)",
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    padding: 20,
    width: "100%",
  },
  modalTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  modalCode: {
    color: colors.warning,
    fontSize: 18,
    fontWeight: "800",
  },
});
