import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { QRScreen } from "./QRScreen";

const mockCreatePaymentRequest = jest.fn();
const mockGetPaymentRequestById = jest.fn();
const mockPayPaymentRequest = jest.fn();

jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    SafeAreaView: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

jest.mock("react-native-qrcode-svg", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return ({ value }: { value: string }) => <Text>{value}</Text>;
});

jest.mock("../../../shared/api/client", () => ({
  createPaymentRequest: (...args: unknown[]) => mockCreatePaymentRequest(...args),
  getPaymentRequestById: (...args: unknown[]) => mockGetPaymentRequestById(...args),
  payPaymentRequest: (...args: unknown[]) => mockPayPaymentRequest(...args),
}));

jest.mock("../../../shared/state/session-store", () => ({
  useSessionStore: (selector: (state: { me: { id: string; name: string } }) => unknown) =>
    selector({ me: { id: "usr_1", name: "Orbit Pilot" } }),
}));

describe("QRScreen", () => {
  beforeEach(() => {
    mockCreatePaymentRequest.mockReset();
    mockGetPaymentRequestById.mockReset();
    mockPayPaymentRequest.mockReset();
  });

  it("creates a payment request and completes mock pay flow from qr payload", async () => {
    mockCreatePaymentRequest.mockResolvedValue({ id: "pay_1" });
    mockGetPaymentRequestById.mockResolvedValue({
      id: "pay_1",
      amount: 42.5,
      description: "Planetary coffee",
      status: "pending",
    });
    mockPayPaymentRequest.mockResolvedValue({ success: true });

    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { gcTime: Infinity, retry: false },
        queries: { gcTime: Infinity, retry: false },
      },
    });

    const screen = render(
      <QueryClientProvider client={queryClient}>
        <QRScreen />
      </QueryClientProvider>,
    );

    fireEvent.changeText(screen.getByPlaceholderText("Сумма"), "42.5");
    fireEvent.changeText(screen.getByPlaceholderText("Описание платежа"), "Planetary coffee");
    fireEvent.press(screen.getByText("Сгенерировать QR"));

    await waitFor(() => expect(mockCreatePaymentRequest).toHaveBeenCalledWith(42.5, "Planetary coffee", "usr_1"));
    await waitFor(() => expect(screen.getAllByText("mtb://pay?id=pay_1").length).toBeGreaterThan(0));

    fireEvent.changeText(screen.getByPlaceholderText("Вставьте qr payload"), "mtb://pay?id=pay_1");
    fireEvent.press(screen.getByText("Проверить QR"));

    await waitFor(() => expect(mockGetPaymentRequestById).toHaveBeenCalledWith("pay_1"));
    await waitFor(() => expect(screen.getByText("Planetary coffee")).toBeTruthy());

    fireEvent.press(screen.getByText("Оплатить"));

    await waitFor(() => expect(mockPayPaymentRequest).toHaveBeenCalledWith("pay_1"));
    await waitFor(() => expect(screen.getByText("Оплачено")).toBeTruthy());

    queryClient.clear();
  });
});
