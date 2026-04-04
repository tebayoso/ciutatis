// @vitest-environment node

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "../context/ThemeContext";
import { PublicSite } from "./PublicSite";

function renderPublicSite(pathname: string) {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[pathname]}>
      <ThemeProvider>
        <PublicSite />
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe("PublicSite contact section", () => {
  it("renders the contact form in the shared closing section across the public pages", () => {
    const pages = ["/", "/en/platform", "/en/about", "/en/partners"];

    for (const pathname of pages) {
      const html = renderPublicSite(pathname);
      expect(html).toContain("Create a support request directly from the public site.");
      expect(html).toContain("Contact support");
      expect(html).toContain("Name");
      expect(html).toContain("Email");
      expect(html).toContain("Message");
      expect(html).toContain("Send message");
    }
  });

  it("switches the contact copy and labels for the Spanish public site", () => {
    const html = renderPublicSite("/es/casos");

    expect(html).toContain("Creá un pedido de soporte directo desde el sitio público.");
    expect(html).toContain("Contactar soporte");
    expect(html).toContain("Nombre");
    expect(html).toContain("Email");
    expect(html).toContain("Mensaje");
    expect(html).toContain("Enviar mensaje");
  });
});
