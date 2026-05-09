export interface CurrentUserRedactionOptions {
  enabled: boolean | undefined;
}

export function redactCurrentUserText(
  _text: string,
  _opts?: CurrentUserRedactionOptions
): string {
  return _text;
}

export function redactCurrentUserValue(
  _value: unknown,
  _opts?: CurrentUserRedactionOptions
): unknown {
  return _value;
}
