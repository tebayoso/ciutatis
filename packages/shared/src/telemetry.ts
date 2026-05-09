// Stub telemetry module for upstream features not in Ciutatis
// Telemetry tracking functions

export interface TelemetryClient {
  track(event: string, properties?: Record<string, unknown>): void;
}

export function trackAgentCreated(
  _client: TelemetryClient | null,
  _params: { agentRole: string; agentId: string },
): void {
  // Ciutatis: telemetry disabled
}

export function trackEvent(_event: string, _properties?: Record<string, unknown>): void {
  // Ciutatis: telemetry disabled
}

export function trackAgentFirstHeartbeat(
  _client: TelemetryClient | null,
  _params: { agentId: string },
): void {
  // Ciutatis: telemetry disabled
}

export function trackProjectCreated(
  _client: TelemetryClient | null,
  _params: { companyId: string; projectId: string },
): void {
  // Ciutatis: telemetry disabled
}
