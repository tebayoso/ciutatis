type CiutatisRuntimeWindow = Window & typeof globalThis & {
  __CIUTATIS_API_BASE?: string;
  __CIUTATIS_BASENAME?: string;
};

function readWindow() {
  return window as CiutatisRuntimeWindow;
}

export function getRuntimeApiBase() {
  return readWindow().__CIUTATIS_API_BASE ?? "/api";
}

export function getRuntimeBasename() {
  return readWindow().__CIUTATIS_BASENAME ?? "/";
}
