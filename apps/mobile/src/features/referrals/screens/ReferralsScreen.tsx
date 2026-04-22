import { useState } from "react";
import { Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createReferral, getReferrals } from "../../../shared/api/client";
import { LoadingView } from "../../../shared/ui/LoadingView";
import { PrimaryButton } from "../../../shared/ui/PrimaryButton";
import { Screen } from "../../../shared/ui/Screen";
import { SectionCard } from "../../../shared/ui/SectionCard";
import { TextField } from "../../../shared/ui/TextField";

export function ReferralsScreen() {
  const queryClient = useQueryClient();
  const [inviteePhone, setInviteePhone] = useState("+1");
  const referralsQuery = useQuery({
    queryKey: ["referrals"],
    queryFn: getReferrals,
  });
  const createMutation = useMutation({
    mutationFn: () => createReferral({ invitee_phone: inviteePhone }),
    onSuccess: () => {
      setInviteePhone("+1");
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["referrals"] }),
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
        queryClient.invalidateQueries({ queryKey: ["rewards"] }),
        queryClient.invalidateQueries({ queryKey: ["quests"] }),
        queryClient.invalidateQueries({ queryKey: ["leaderboard"] }),
      ]);
    },
  });

  if (referralsQuery.isLoading || !referralsQuery.data) {
    return <LoadingView />;
  }

  return (
    <Screen
      title="Community Nova"
      subtitle="Referrals now directly feed cashback, loyalty points, social quests and the shared user rating."
    >
      <SectionCard
        title="Send invite"
        description="Every invite lands on the backend reward ledger immediately, so the social loop stays authoritative."
      >
        <TextField
          keyboardType="phone-pad"
          label="Friend phone"
          onChangeText={setInviteePhone}
          placeholder="+1 999 555 44 33"
          value={inviteePhone}
        />
        <PrimaryButton disabled={createMutation.isPending} onPress={() => createMutation.mutate()}>
          {createMutation.isPending ? "Sending..." : "Send invite"}
        </PrimaryButton>
        {createMutation.isError ? <Text style={{ color: "#FCA5A5" }}>Referral could not be created.</Text> : null}
      </SectionCard>

      <SectionCard title="Active invites">
        {referralsQuery.data.length ? (
          referralsQuery.data.map((referral) => (
            <View key={referral.referral_id} style={{ gap: 4 }}>
              <Text style={{ color: "#F3F7FB", fontWeight: "700" }}>{referral.invitee_phone}</Text>
              <Text style={{ color: "#9DB6C9" }}>
                Code {referral.invite_code} • {referral.state}
              </Text>
            </View>
          ))
        ) : (
          <Text style={{ color: "#9DB6C9" }}>No invites yet.</Text>
        )}
      </SectionCard>
    </Screen>
  );
}
