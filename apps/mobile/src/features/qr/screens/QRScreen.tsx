import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { createPaymentRequest, getPaymentRequestById, payPaymentRequest } from "../../../shared/api/client";
import { useSessionStore } from "../../../shared/state/session-store";
import { colors } from "../../../shared/theme/colors";
import { PrimaryButton } from "../../../shared/ui/PrimaryButton";
import { Screen } from "../../../shared/ui/Screen";
import { SectionCard } from "../../../shared/ui/SectionCard";
import { SecondaryButton } from "../../../shared/ui/SecondaryButton";
import { TextField } from "../../../shared/ui/TextField";

const isTestEnvironment = typeof process !== "undefined" && process.env.JEST_WORKER_ID !== undefined;

type VisionCameraModule = typeof import("react-native-vision-camera");
type BarcodeScannerModule = typeof import("react-native-vision-camera-barcode-scanner");

let visionCameraModule: VisionCameraModule | null = null;
let barcodeScannerModule: BarcodeScannerModule | null = null;

if (!isTestEnvironment) {
  try {
    visionCameraModule = require("react-native-vision-camera") as VisionCameraModule;
    barcodeScannerModule = require("react-native-vision-camera-barcode-scanner") as BarcodeScannerModule;
  } catch {
    visionCameraModule = null;
    barcodeScannerModule = null;
  }
}

function extractPaymentRequestId(payload: string) {
  const match = payload.match(/id=([^&\s]+)/);
  return match?.[1] ?? null;
}

function NativeQrScanner({
  isVisible,
  onClose,
  onScanned,
}: {
  isVisible: boolean;
  onClose: () => void;
  onScanned: (payload: string) => void;
}) {
  if (!visionCameraModule || !barcodeScannerModule) {
    return null;
  }

  const { useCameraPermission } = visionCameraModule;
  const { CodeScanner } = barcodeScannerModule;
  const { hasPermission, requestPermission } = useCameraPermission();

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={isVisible}>
      <View style={styles.cameraBackdrop}>
        <View style={styles.cameraShell}>
          <Text style={styles.cameraTitle}>Сканирование QR</Text>
          <Text style={styles.metaText}>
            Наведите камеру на QR-код. После первого успешного распознавания payload автоматически подставится в форму проверки.
          </Text>
          {hasPermission ? (
            <View style={styles.cameraViewport}>
              <CodeScanner
                barcodeFormats={["qr"]}
                isActive={isVisible}
                onBarcodeScanned={(barcodes) => {
                  const value = barcodes[0]?.rawValue ?? barcodes[0]?.displayValue;
                  if (!value) {
                    return;
                  }
                  onScanned(value);
                }}
                onError={() => undefined}
                style={styles.cameraFill}
              />
            </View>
          ) : (
            <View style={styles.permissionCard}>
              <Text style={styles.metaText}>Для аппаратного сканирования нужен доступ к камере.</Text>
              <PrimaryButton onPress={() => void requestPermission()}>Разрешить камеру</PrimaryButton>
            </View>
          )}
          <SecondaryButton onPress={onClose}>Закрыть сканер</SecondaryButton>
        </View>
      </View>
    </Modal>
  );
}

export function QRScreen() {
  const me = useSessionStore((state) => state.me);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [scanValue, setScanValue] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<{ id: string; amount: number; description: string; status: string } | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isScannerVisible, setScannerVisible] = useState(false);

  const createMutation = useMutation({
    mutationFn: () => createPaymentRequest(Number(amount), description.trim(), me?.id ?? ""),
    onSuccess: (result) => {
      setQrPayload(`mtb://pay?id=${result.id}`);
      setFeedback(null);
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : "Не удалось создать QR.");
    },
  });
  const scanMutation = useMutation({
    mutationFn: async () => {
      const requestId = extractPaymentRequestId(scanValue);
      if (!requestId) {
        throw new Error("Неверный QR payload.");
      }
      return getPaymentRequestById(requestId);
    },
    onSuccess: (result) => {
      setSelectedRequest(result);
      setFeedback(null);
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : "Не удалось прочитать QR.");
    },
  });
  const payMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRequest) {
        throw new Error("Нет запроса для оплаты.");
      }
      await payPaymentRequest(selectedRequest.id);
      return selectedRequest.id;
    },
    onSuccess: (requestId) => {
      setSelectedRequest((current) => (current && current.id === requestId ? { ...current, status: "paid" } : current));
      setFeedback("Оплачено");
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : "Не удалось завершить оплату.");
    },
  });

  if (!me?.id) {
    return (
      <Screen title="QR-платежи" subtitle="Сначала авторизуйтесь, чтобы создать персональный платежный запрос.">
        <SectionCard title="Нет сессии">
          <Text style={styles.metaText}>QR-flow использует идентификатор текущего пользователя.</Text>
        </SectionCard>
      </Screen>
    );
  }

  return (
    <Screen title="QR-платежи" subtitle="Экран из документа создаёт платёжный запрос, генерирует QR payload и позволяет пройти mock scan/pay flow.">
      <SectionCard title="Создать QR">
        <TextField keyboardType="number-pad" label="Сумма" onChangeText={setAmount} placeholder="Сумма" value={amount} />
        <TextField label="Описание" onChangeText={setDescription} placeholder="Описание платежа" value={description} />
        <PrimaryButton disabled={!amount.trim() || !description.trim() || createMutation.isPending} onPress={() => createMutation.mutate()}>
          {createMutation.isPending ? "Создаём..." : "Сгенерировать QR"}
        </PrimaryButton>
        {qrPayload ? (
          <View style={styles.qrCard}>
            <QRCode size={180} value={qrPayload} />
            <Text style={styles.payloadText}>{qrPayload}</Text>
          </View>
        ) : null}
      </SectionCard>

      <SectionCard title="Проверка QR" description="Для тестируемого mobile-flow сканирование реализовано через вставку payload, без нативной камеры.">
        {visionCameraModule && barcodeScannerModule ? (
          <PrimaryButton onPress={() => setScannerVisible(true)}>Открыть камеру</PrimaryButton>
        ) : (
          <Text style={styles.metaText}>Нативный camera scanner недоступен в этой среде, поэтому оставлен ручной fallback через payload.</Text>
        )}
        <TextField autoCapitalize="none" label="QR payload" onChangeText={setScanValue} placeholder="Вставьте qr payload" value={scanValue} />
        <SecondaryButton disabled={!scanValue.trim() || scanMutation.isPending} onPress={() => scanMutation.mutate()}>
          {scanMutation.isPending ? "Проверяем..." : "Проверить QR"}
        </SecondaryButton>
        {selectedRequest ? (
          <View style={styles.requestCard}>
            <Text style={styles.requestTitle}>{selectedRequest.description}</Text>
            <Text style={styles.metaText}>Сумма: {selectedRequest.amount}</Text>
            <Text style={styles.metaText}>Статус: {selectedRequest.status === "paid" ? "Оплачено" : "Ожидает оплаты"}</Text>
            {selectedRequest.status !== "paid" ? (
              <PrimaryButton disabled={payMutation.isPending} onPress={() => payMutation.mutate()}>
                {payMutation.isPending ? "Оплачиваем..." : "Оплатить"}
              </PrimaryButton>
            ) : null}
          </View>
        ) : null}
        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
      </SectionCard>
      <NativeQrScanner
        isVisible={isScannerVisible}
        onClose={() => setScannerVisible(false)}
        onScanned={(payload) => {
          setScanValue(payload);
          setScannerVisible(false);
          setFeedback("QR считан камерой. Проверьте детали платежа.");
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  qrCard: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderRadius: 24,
    gap: 14,
    padding: 18,
  },
  payloadText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  requestCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 20,
    gap: 10,
    padding: 14,
  },
  requestTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
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
  cameraBackdrop: {
    backgroundColor: "rgba(5, 8, 18, 0.88)",
    flex: 1,
    justifyContent: "flex-end",
    padding: 16,
  },
  cameraShell: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  cameraTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  cameraViewport: {
    backgroundColor: "#000",
    borderRadius: 20,
    height: 360,
    overflow: "hidden",
  },
  cameraFill: {
    flex: 1,
  },
  permissionCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 18,
    gap: 12,
    padding: 14,
  },
});
