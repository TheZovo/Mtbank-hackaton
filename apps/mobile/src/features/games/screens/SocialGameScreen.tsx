import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SIGNAL_PADS, SOCIAL_ROUNDS, randomSignal } from "@mtb/game-core";
import type { SignalPadId } from "@mtb/game-core";
import { submitGameRun } from "../../../shared/api/client";
import { colors } from "../../../shared/theme/colors";
import { PrimaryButton } from "../../../shared/ui/PrimaryButton";
import { Screen } from "../../../shared/ui/Screen";
import { SecondaryButton } from "../../../shared/ui/SecondaryButton";
import { SectionCard } from "../../../shared/ui/SectionCard";

type Phase = "idle" | "showing" | "input" | "complete";

export function SocialGameScreen() {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<Phase>("idle");
  const [sequence, setSequence] = useState<SignalPadId[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [activePad, setActivePad] = useState<SignalPadId | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const submitMutation = useMutation({
    mutationFn: () => submitGameRun("social_ring_signal", { score }),
    onSuccess: () => {
      setHasSubmitted(true);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me"] }),
        queryClient.invalidateQueries({ queryKey: ["promocodes"] }),
        queryClient.invalidateQueries({ queryKey: ["planets-list"] }),
        queryClient.invalidateQueries({ queryKey: ["planet-leaderboard"] }),
        queryClient.invalidateQueries({ queryKey: ["game-summary"] }),
      ]);
    },
  });

  useEffect(() => {
    if (phase !== "showing") {
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const copy = [...sequence];
    const run = (index: number) => {
      if (index >= copy.length) {
        timer = setTimeout(() => {
          setActivePad(null);
          setCurrentIndex(0);
          setPhase("input");
        }, 400);
        return;
      }
      setActivePad(copy[index]);
      timer = setTimeout(() => {
        setActivePad(null);
        timer = setTimeout(() => run(index + 1), 220);
      }, 320);
    };
    run(0);
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [phase, sequence]);

  function start() {
    const initial = [randomSignal()];
    setSequence(initial);
    setCurrentIndex(0);
    setRound(1);
    setScore(0);
    setPhase("showing");
    setHasSubmitted(false);
  }

  function reset() {
    setPhase("idle");
    setSequence([]);
    setCurrentIndex(0);
    setScore(0);
    setRound(0);
    setActivePad(null);
    setHasSubmitted(false);
  }

  function handlePadPress(padId: SignalPadId) {
    if (phase !== "input") {
      return;
    }
    setActivePad(padId);
    setTimeout(() => setActivePad(null), 180);
    if (padId !== sequence[currentIndex]) {
      setPhase("complete");
      return;
    }
    const nextIndex = currentIndex + 1;
    setScore((value) => value + 2);
    if (nextIndex < sequence.length) {
      setCurrentIndex(nextIndex);
      return;
    }
    if (round >= SOCIAL_ROUNDS) {
      setPhase("complete");
      return;
    }
    const nextSequence = [...sequence, randomSignal()];
    setSequence(nextSequence);
    setCurrentIndex(0);
    setRound((value) => value + 1);
    setPhase("showing");
  }

  return (
    <Screen
      title="Сигнальный ринг"
      subtitle="Мини-игра на память и ритм. Сервер принимает только итоговый счёт и сам считает прогресс."
      footer={
        <View style={styles.footer}>
          <PrimaryButton disabled={phase === "showing" || phase === "input"} onPress={start}>
            {phase === "idle" ? "Старт" : "Запустить заново"}
          </PrimaryButton>
          <SecondaryButton onPress={reset}>Сбросить</SecondaryButton>
          <PrimaryButton
            disabled={phase !== "complete" || score === 0 || hasSubmitted || submitMutation.isPending}
            onPress={() => submitMutation.mutate()}
          >
            {submitMutation.isPending ? "Отправляем..." : hasSubmitted ? "Результат отправлен" : "Отправить результат"}
          </PrimaryButton>
        </View>
      }
    >
      <SectionCard title="Прогресс">
        <Text style={styles.metaText}>Раунд {round}/{SOCIAL_ROUNDS}</Text>
        <Text style={styles.metaText}>Счёт {score}</Text>
        <Text style={styles.metaText}>Фаза {phase}</Text>
      </SectionCard>
      <SectionCard title="Панели">
        <View style={styles.grid}>
          {SIGNAL_PADS.map((pad) => (
            <View key={pad.id} style={styles.pad}>
              <PrimaryButton onPress={() => handlePadPress(pad.id)}>
                {activePad === pad.id ? `${pad.label} •` : pad.label}
              </PrimaryButton>
            </View>
          ))}
        </View>
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: {
    gap: 12,
  },
  metaText: {
    color: colors.textMuted,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  pad: {
    flexBasis: "47%",
  },
});
