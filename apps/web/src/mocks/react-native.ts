import * as ReactNativeWeb from "react-native-web";

export * from "react-native-web";

export const Share = {
  async share(content: { message?: string; url?: string }) {
    const text = content.message ?? content.url ?? "";
    const webNavigator = navigator as Navigator & {
      share?: (data: { text?: string; url?: string }) => Promise<void>;
    };

    if (webNavigator.share) {
      await webNavigator.share({ text: content.message, url: content.url });
      return { action: "sharedAction" };
    }

    if (navigator.clipboard?.writeText && text) {
      await navigator.clipboard.writeText(text);
    }
    return { action: "sharedAction" };
  },
};

export default ReactNativeWeb;
