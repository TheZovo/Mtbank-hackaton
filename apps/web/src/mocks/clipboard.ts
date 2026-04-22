const fallbackClipboard = new Map<string, string>();

async function writeClipboardValue(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  fallbackClipboard.set("value", value);
}

const Clipboard = {
  setString(value: string) {
    void writeClipboardValue(value);
  },
  async getString() {
    if (navigator.clipboard?.readText) {
      return navigator.clipboard.readText();
    }
    return fallbackClipboard.get("value") ?? "";
  },
};

export default Clipboard;
