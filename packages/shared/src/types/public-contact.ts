export type PublicContactLocale = "en" | "es";

export interface PublicContactSubmission {
  name: string;
  email: string;
  message: string;
  locale: PublicContactLocale;
  sourcePath: string;
}
