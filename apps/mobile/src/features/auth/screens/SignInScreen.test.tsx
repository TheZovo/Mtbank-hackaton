import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { SignInScreen } from "./SignInScreen";

const requestOtpMock = jest.fn();
const verifyOtpMock = jest.fn();
const setSessionMock = jest.fn();

jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    SafeAreaView: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
  };
});

jest.mock("../../../shared/api/client", () => ({
  requestOtp: (...args: unknown[]) => requestOtpMock(...args),
  verifyOtp: (...args: unknown[]) => verifyOtpMock(...args),
}));

jest.mock("../../../shared/state/session-store", () => ({
  useSessionStore: (selector: (state: { setSession: typeof setSessionMock }) => unknown) =>
    selector({ setSession: setSessionMock }),
}));

describe("SignInScreen", () => {
  beforeEach(() => {
    requestOtpMock.mockReset();
    verifyOtpMock.mockReset();
    setSessionMock.mockReset();
  });

  it("requests otp and completes login flow", async () => {
    requestOtpMock.mockResolvedValue({
      challenge_id: "otp_123",
      expires_in_seconds: 300,
      dev_code: "123456",
    });
    verifyOtpMock.mockResolvedValue({
      access_token: "access",
      refresh_token: "refresh",
      token_type: "bearer",
      expires_in_seconds: 1800,
      user: {
        user_id: "usr_1",
        phone: "+19991234567",
        display_name: "Test Pilot",
        segment: "student",
        created_at: new Date().toISOString(),
      },
      me: {
        user: {
          user_id: "usr_1",
          phone: "+19991234567",
          display_name: "Test Pilot",
          segment: "student",
          created_at: new Date().toISOString(),
        },
        selected_planet: "ORBIT_COMMERCE",
      },
    });
    setSessionMock.mockResolvedValue(undefined);

    const screen = render(<SignInScreen />);
    fireEvent.changeText(screen.getByPlaceholderText("+1 999 123 45 67"), "+19991234567");
    fireEvent.changeText(screen.getByPlaceholderText("Например, Pilot Roman"), "Test Pilot");
    fireEvent.press(screen.getByText("Получить OTP"));

    await waitFor(() => expect(requestOtpMock).toHaveBeenCalled());
    expect(screen.getByText("Dev OTP: 123456")).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText("000000"), "123456");
    fireEvent.press(screen.getByText("Войти в приложение"));

    await waitFor(() => expect(verifyOtpMock).toHaveBeenCalled());
    await waitFor(() => expect(setSessionMock).toHaveBeenCalled());
  });
});
