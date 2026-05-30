// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  buildPublicContactSubmission,
  validateContactForm,
  type ContactFormCopy,
} from "./ContactForm";

const englishCopy: ContactFormCopy = {
  nameLabel: "Name",
  namePlaceholder: "Your name",
  emailLabel: "Email",
  emailPlaceholder: "you@example.com",
  messageLabel: "Message",
  messagePlaceholder: "Your message",
  submitIdle: "Send message",
  submitSubmitting: "Sending...",
  successTitle: "Success",
  successAction: "Send another message",
  errorMessage: "Something went wrong",
  validation: {
    nameRequired: "Name is required",
    emailRequired: "Email is required",
    emailInvalid: "Please enter a valid email address",
    messageRequired: "Message is required",
  },
};

describe("ContactForm helpers", () => {
  it("builds the public contact payload with trimmed values, locale, and source path", () => {
    expect(
      buildPublicContactSubmission(
        {
          name: "  Jane Doe  ",
          email: "  jane@example.com ",
          message: "  Need help with onboarding.  ",
        },
        "es",
        "/es/procesos",
      ),
    ).toEqual({
      name: "Jane Doe",
      email: "jane@example.com",
      message: "Need help with onboarding.",
      locale: "es",
      sourcePath: "/es/procesos",
    });
  });

  it("returns localized validation messages for missing and invalid fields", () => {
    expect(
      validateContactForm(
        {
          name: " ",
          email: "invalid-email",
          message: "",
        },
        englishCopy,
      ),
    ).toEqual({
      name: "Name is required",
      email: "Please enter a valid email address",
      message: "Message is required",
    });
  });
});
