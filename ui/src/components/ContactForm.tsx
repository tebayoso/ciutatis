import { useState, type FormEvent } from "react";
import type { PublicContactLocale, PublicContactSubmission } from "@ciutatis/shared";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ContactFormState {
  name: string;
  email: string;
  message: string;
}

type ContactFormField = keyof ContactFormState;
type ContactFormErrors = Partial<Record<ContactFormField, string>>;
type FormStatus = "idle" | "submitting" | "success" | "error";

export interface ContactFormCopy {
  nameLabel: string;
  namePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  messageLabel: string;
  messagePlaceholder: string;
  submitIdle: string;
  submitSubmitting: string;
  successTitle: string;
  successAction: string;
  errorMessage: string;
  validation: {
    nameRequired: string;
    emailRequired: string;
    emailInvalid: string;
    messageRequired: string;
  };
}

interface ContactFormProps {
  copy: ContactFormCopy;
  locale: PublicContactLocale;
  sourcePath: string;
}

const EMPTY_FORM: ContactFormState = {
  name: "",
  email: "",
  message: "",
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function buildPublicContactSubmission(
  form: ContactFormState,
  locale: PublicContactLocale,
  sourcePath: string,
): PublicContactSubmission {
  return {
    name: form.name.trim(),
    email: form.email.trim(),
    message: form.message.trim(),
    locale,
    sourcePath,
  };
}

export function validateContactForm(form: ContactFormState, copy: ContactFormCopy): ContactFormErrors {
  const submission = buildPublicContactSubmission(form, "en", "/");
  const errors: ContactFormErrors = {};

  if (!submission.name) {
    errors.name = copy.validation.nameRequired;
  }
  if (!submission.email) {
    errors.email = copy.validation.emailRequired;
  } else if (!isValidEmail(submission.email)) {
    errors.email = copy.validation.emailInvalid;
  }
  if (!submission.message) {
    errors.message = copy.validation.messageRequired;
  }

  return errors;
}

export function ContactForm({ copy, locale, sourcePath }: ContactFormProps) {
  const [form, setForm] = useState<ContactFormState>(EMPTY_FORM);
  const [status, setStatus] = useState<FormStatus>("idle");
  const [fieldErrors, setFieldErrors] = useState<ContactFormErrors>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors = validateContactForm(form, copy);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setStatus("idle");
      return;
    }

    setStatus("submitting");
    try {
      await api.post<{ id: string; identifier: string }>("/contact", buildPublicContactSubmission(form, locale, sourcePath));
      setStatus("success");
      setForm(EMPTY_FORM);
      setFieldErrors({});
    } catch {
      setStatus("error");
    }
  }

  function handleChange(field: ContactFormField, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setStatus((current) => (current === "success" ? current : "idle"));
    if (fieldErrors[field]) {
      setFieldErrors((current) => {
        const next = { ...current };
        delete next[field];
        return next;
      });
    }
  }

  if (status === "success") {
    return (
      <div
        className="rounded-[18px] border border-emerald-300/70 bg-emerald-50 p-6 text-center"
        role="status"
        aria-live="polite"
      >
        <div className="mb-2 text-2xl">✓</div>
        <p className="text-lg font-medium text-emerald-900">{copy.successTitle}</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-4"
          onClick={() => setStatus("idle")}
        >
          {copy.successAction}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="contact-name">{copy.nameLabel}</Label>
        <Input
          id="contact-name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder={copy.namePlaceholder}
          value={form.name}
          onChange={(event) => handleChange("name", event.target.value)}
          aria-invalid={fieldErrors.name ? "true" : "false"}
          disabled={status === "submitting"}
        />
        {fieldErrors.name ? (
          <p className="text-sm text-destructive" aria-live="polite">
            {fieldErrors.name}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-email">{copy.emailLabel}</Label>
        <Input
          id="contact-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder={copy.emailPlaceholder}
          value={form.email}
          onChange={(event) => handleChange("email", event.target.value)}
          aria-invalid={fieldErrors.email ? "true" : "false"}
          spellCheck={false}
          disabled={status === "submitting"}
        />
        {fieldErrors.email ? (
          <p className="text-sm text-destructive" aria-live="polite">
            {fieldErrors.email}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-message">{copy.messageLabel}</Label>
        <Textarea
          id="contact-message"
          name="message"
          autoComplete="off"
          placeholder={copy.messagePlaceholder}
          rows={5}
          value={form.message}
          onChange={(event) => handleChange("message", event.target.value)}
          aria-invalid={fieldErrors.message ? "true" : "false"}
          disabled={status === "submitting"}
        />
        {fieldErrors.message ? (
          <p className="text-sm text-destructive" aria-live="polite">
            {fieldErrors.message}
          </p>
        ) : null}
      </div>

      {status === "error" ? (
        <div
          className="rounded-[14px] border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          role="status"
          aria-live="polite"
        >
          {copy.errorMessage}
        </div>
      ) : null}

      <Button type="submit" className="w-full rounded-[10px]" disabled={status === "submitting"}>
        {status === "submitting" ? copy.submitSubmitting : copy.submitIdle}
      </Button>
    </form>
  );
}
