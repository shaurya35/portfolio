import type { APIRequestContext, Page } from "@playwright/test";

export const MOCK_PORT = 9191;
export const SITE_PORT = 3100;
export const MOCK_URL = `http://127.0.0.1:${MOCK_PORT}`;
export const SITE_URL = `http://127.0.0.1:${SITE_PORT}`;

export type RecordedRequest = { method: string; path: string; body: unknown };

/** Every write the site has sent the mock backend so far, oldest first. */
export async function backendWrites(request: APIRequestContext): Promise<RecordedRequest[]> {
  return (await request.get(`${MOCK_URL}/__requests`)).json();
}

/** How far the page is wider than the viewport, in px (0 = no sideways scroll). */
export function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

/** Pastes plain text into the editor the way a clipboard paste arrives. */
export async function pasteIntoEditor(page: Page, text: string) {
  await page.locator(".ProseMirror").click();
  await page.evaluate((value) => {
    const editor = document.querySelector(".ProseMirror")!;
    const data = new DataTransfer();
    data.setData("text/plain", value);
    editor.dispatchEvent(
      new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }),
    );
  }, text);
}
