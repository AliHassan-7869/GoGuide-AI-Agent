import { copyText } from "../Components/utils/clipboard";
import * as Clipboard from "expo-clipboard";

jest.mock("expo-clipboard", () => ({ setStringAsync: jest.fn() }));

afterEach(() => {
  Clipboard.setStringAsync.mockReset();
  delete global.navigator;
});

describe("copyText", () => {
  it("copies with the native clipboard and reports success", async () => {
    Clipboard.setStringAsync.mockResolvedValue(true);
    await expect(copyText("PLAN-H-ABC123")).resolves.toBe(true);
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith("PLAN-H-ABC123");
  });

  it("falls back to the browser clipboard when the native one fails", async () => {
    Clipboard.setStringAsync.mockRejectedValue(new Error("denied"));
    const writeText = jest.fn(async () => {});
    Object.defineProperty(global, "navigator", { value: { clipboard: { writeText } }, configurable: true });
    await expect(copyText("hello")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("hello");
  });

  it("reports failure honestly when nothing could be copied", async () => {
    Clipboard.setStringAsync.mockRejectedValue(new Error("denied"));
    await expect(copyText("hello")).resolves.toBe(false);
  });

  it("does not claim to copy an empty value", async () => {
    await expect(copyText("")).resolves.toBe(false);
    await expect(copyText(null)).resolves.toBe(false);
    expect(Clipboard.setStringAsync).not.toHaveBeenCalled();
  });
});
