type CiutatisRuntimeWindow = Window & typeof globalThis & {
  __CIUTATIS_API_BASE?: string;
  __CIUTATIS_BASENAME?: string;
};

function readWindow() {
  return window as CiutatisRuntimeWindow;
}

export function getRuntimeApiBase() {
  const apiBase = readWindow().__CIUTATIS_API_BASE;
  return typeof apiBase === "string" && apiBase.trim().length > 0 ? apiBase : "/api";
}

export function getRuntimeBasename() {
  const basename = readWindow().__CIUTATIS_BASENAME;
  return typeof basename === "string" && basename.trim().length > 0 ? basename : "/";
}
