import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../../shared/theme/colors";
import { PrimaryButton } from "../../../shared/ui/PrimaryButton";
import { Screen } from "../../../shared/ui/Screen";
import { SectionCard } from "../../../shared/ui/SectionCard";

const mockTransactions = [
  { id: 1, type: "expense", category: "Кафе", amount: 25.5 },
  { id: 2, type: "expense", category: "Кафе", amount: 18.0 },
  { id: 3, type: "expense", category: "Транспорт", amount: 3.5 },
  { id: 4, type: "expense", category: "Развлечения", amount: 45.0 },
  { id: 5, type: "income", category: "Зарплата", amount: 80.0 },
  { id: 6, type: "expense", category: "Крупная покупка", amount: 50.0 },
  { id: 7, type: "expense", category: "Кафе", amount: 12.0 },
] as const;

function buildAdvice() {
  const totalIncome = mockTransactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const cafeExpense = mockTransactions.filter((item) => item.category === "Кафе").reduce((sum, item) => sum + item.amount, 0);
  const totalExpense = mockTransactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  const largePurchase = mockTransactions.some((item) => item.type === "expense" && item.amount > totalIncome * 0.5);

  const advice: string[] = [];
  if (cafeExpense > totalIncome * 0.3) {
    advice.push("Слишком много тратишь в кафе. Попробуй зафиксировать недельный лимит и часть покупок заменить домашними.");
  }
  if (totalExpense > totalIncome) {
    advice.push("Расходы выше доходов. Стоит пересмотреть постоянные траты и убрать импульсивные категории.");
  }
  if (largePurchase) {
    advice.push("Крупная покупка съела больше половины дохода. Для таких трат лучше заранее собирать резерв.");
  }

  return advice;
}

export function AIScreen() {
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const advice = useMemo(() => (hasAnalyzed ? buildAdvice() : []), [hasAnalyzed]);

  return (
    <Screen title="AI-финансовый помощник" subtitle="Сценарий из документа реализован локально: экран анализирует моковые транзакции и выдаёт быстрые советы без backend-зависимости.">
      <SectionCard title="Запуск анализа" description="Кнопка запускает набор простых правил поверх локальных транзакций.">
        <PrimaryButton onPress={() => setHasAnalyzed(true)}>Анализировать</PrimaryButton>
      </SectionCard>

      <SectionCard title="Советы">
        {advice.length ? (
          advice.map((item) => (
            <View key={item} style={styles.adviceCard}>
              <Text style={styles.adviceText}>{item}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.metaText}>Нажмите «Анализировать», чтобы собрать советы по текущему моковому набору транзакций.</Text>
        )}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  adviceCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 20,
    padding: 14,
  },
  adviceText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
});
