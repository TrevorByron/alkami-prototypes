// The library previews every prototype in an iframe, so if the app is ever
// added as its own prototype each copy would load another copy, forever.

export const isFramed = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

export function isOwnApp(url: string) {
  try {
    return new URL(url).origin === window.location.origin;
  } catch {
    return false;
  }
}
