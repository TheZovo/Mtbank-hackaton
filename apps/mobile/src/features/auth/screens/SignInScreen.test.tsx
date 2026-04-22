import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SignInScreen } from "./SignInScreen";

const mockRequestOtp = jest.fn();
const mockVerifyOtp = jest.fn();
const mockSetSession = jest.fn();

jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    SafeAreaView: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
  };
});

jest.mock("../../../shared/api/client", () => ({
  requestOtp: (...args: unknown[]) => mockRequestOtp(...args),
  verifyOtp: (...args: unknown[]) => mockVerifyOtp(...args),
}));

jest.mock("../../../shared/state/session-store", () => ({
  useSessionStore: (selector: (state: { setSession: typeof mockSetSession }) => unknown) =>
    selector({ setSession: mockSetSession }),
}));

describe("SignInScreen", () => {
  beforeEach(() => {
    mockRequestOtp.mockReset();
    mockVerifyOtp.mockReset();
    mockSetSession.mockReset();
  });

  it("requests otp and completes login flow", async () => {
    mockRequestOtp.mockResolvedValue({
      message: "OTP sent",
      dev_otp: "123456",
    });
    mockVerifyOtp.mockResolvedValue({
      access_token: "access",
      refresh_token: "refresh",
      user: {
        id: "usr_1",
        phone: "+375290001122",
        name: "Test Pilot",
      },
    });
    mockSetSession.mockResolvedValue(undefined);

    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { gcTime: Infinity, retry: false },
        queries: { gcTime: Infinity, retry: false },
      },
    });
    const screen = render(
      <QueryClientProvider client={queryClient}>
        <SignInScreen />
      </QueryClientProvider>,
    );
    fireEvent.changeText(screen.getByPlaceholderText("+375 29 000 00 00"), "+375290001122");
    fireEvent.changeText(screen.getByPlaceholderText("Например, Алина"), "Test Pilot");
    fireEvent.press(screen.getByText("Получить OTP"));

    await waitFor(() => expect(mockRequestOtp).toHaveBeenCalledWith({ phone: "+375290001122" }));
    expect(screen.getByText("Dev OTP: 123456")).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText("123456"), "123456");
    fireEvent.press(screen.getByText("Войти в приложение"));

    await waitFor(() =>
      expect(mockVerifyOtp).toHaveBeenCalledWith({
        code: "123456",
        name: "Test Pilot",
        phone: "+375290001122",
      }),
    );
    await waitFor(() => expect(mockSetSession).toHaveBeenCalled());
    queryClient.clear();
  });
});
