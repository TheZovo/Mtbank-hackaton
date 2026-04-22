import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  SHIELD_PULSE_BASE_SPEED,
  SHIELD_PULSE_ROUND_SPEED,
  SHIELD_PULSE_START,
  SHIELD_ROUNDS,
  getShieldAccuracyBand,
  getShieldScoreIncrement,
} from "@mtb/game-core";
import { submitGameRun } from "../../../shared/api/client";
import { Screen } from "../../../shared/ui/Screen";
import { PrimaryButton } from "../../../shared/ui/PrimaryButton";
import { SecondaryButton } from "../../../shared/ui/SecondaryButton";
import { SectionCard } from "../../../shared/ui/SectionCard";

export function ShieldGameScreen() {
  const queryClient = useQueryClient();
  const directionRef = useRef(1);
  const [round, setRound] = useState(1);
  const [position, setPosition] = useState(SHIELD_PULSE_START);
  const [score, setScore] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const speed = SHIELD_PULSE_BASE_SPEED + Math.min(round, 6) * SHIELD_PULSE_ROUND_SPEED;
  const accuracyBand = getShieldAccuracyBand(position);

  const submitMutation = useMutation({
    mutationFn: () => submitGameRun("credit_shield_reactor", { score }),
    onSuccess: (payload) => {
      setHasSubmitted(true);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
        queryClient.invalidateQueries({ queryKey: ["rewards"] }),
        queryClient.invalidateQueries({ queryKey: ["quests"] }),
        queryClient.invalidateQueries({ queryKey: ["game-summary"] }),
      ]);
    },
  });

  useEffect(() => {
    if (!isRunning || isComplete) {
      return;
    }
    const timer = setInterval(() => {
      setPosition((current) => {
        let next = current + directionRef.current * speed * 0.1;
        if (next >= 100) {
          next = 100 - (next - 100);
          directionRef.current = -1;
        }
        if (next <= 0) {
          next = -next;
          directionRef.current = 1;
        }
        return Math.max(0, Math.min(100, next));
      });
    }, 16);
    return () => clearInterval(timer);
  }, [isComplete, isRunning, speed]);

  function reset() {
    directionRef.current = 1;
    setRound(1);
    setPosition(SHIELD_PULSE_START);
    setScore(0);
    setIsRunning(false);
    setIsComplete(false);
    setHasSubmitted(false);
  }

  function lockPulse() {
    if (!isRunning || isComplete) {
      return;
    }
    setScore((value) => value + getShieldScoreIncrement(accuracyBand));
    if (round >= SHIELD_ROUNDS) {
      setIsRunning(false);
      setIsComplete(true);
      return;
    }
    setRound((value) => value + 1);
  }

  return (
    <Screen
      title="Реактор щита"
      subtitle="Тайминг-игра без web-специфики: результат отправляется в `/v1/games/credit_shield_reactor/runs`."
      footer={
        <View style={{ gap: 12 }}>
          <PrimaryButton onPress={() => setIsRunning(true)} disabled={isRunning || isComplete}>
            Старт реактора
          </PrimaryButton>
          <SecondaryButton onPress={lockPulse} disabled={!isRunning || isComplete}>
            Зафиксировать импульс
          </SecondaryButton>
          <SecondaryButton onPress={reset}>Сбросить</SecondaryButton>
          <PrimaryButton
            disabled={!isComplete || score === 0 || hasSubmitted || submitMutation.isPending}
            onPress={() => submitMutation.mutate()}
          >
            {submitMutation.isPending ? "Отправляем..." : hasSubmitted ? "Результат отправлен" : "Отправить результат"}
          </PrimaryButton>
        </View>
      }
    >
      <SectionCard title="Состояние">
        <Text style={{ color: "#9DB6C9" }}>Раунд {round}/{SHIELD_ROUNDS}</Text>
        <Text style={{ color: "#9DB6C9" }}>Счет {score}</Text>
        <Text style={{ color: "#9DB6C9" }}>Точность {accuracyBand}</Text>
      </SectionCard>
      <SectionCard title="Шкала импульса">
        <View style={{ backgroundColor: "#11263A", borderRadius: 16, height: 18, overflow: "hidden" }}>
          <View
            style={{
              backgroundColor: accuracyBand === "perfect" ? "#14B8A6" : accuracyBand === "good" ? "#F59E0B" : "#FF7A59",
              height: 18,
              marginLeft: `${position}%`,
              width: 18,
            }}
          />
        </View>
        <Text style={{ color: "#9DB6C9" }}>Позиция {Math.round(position)}%</Text>
      </SectionCard>
    </Screen>
  );
}
