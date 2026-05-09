// Stub telemetry module - telemetry feature intentionally removed from Ciutatis
// This file exists only to satisfy upstream imports

export interface TelemetryClient {
  capture(): void;
  track(_event: string, _properties?: Record<string, unknown>): void;
}

export function getTelemetryClient(): TelemetryClient | undefined {
  return undefined;
}

export function createTelemetryClient(): TelemetryClient | undefined {
  return undefined;
}
