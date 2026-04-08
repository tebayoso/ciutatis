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
      expect(html).toContain("Report a civic issue or ask the proper office a clear question.");
      expect(html).toContain("Citizen reporting desk");
      expect(html).toContain("Name");
      expect(html).toContain("Email");
      expect(html).toContain("Question or report");
      expect(html).toContain("Send civic request");
    }
  });

  it("switches the contact copy and labels for the Spanish public site", () => {
    const html = renderPublicSite("/es/casos");

    expect(html).toContain("Reporta un problema civico o haz una pregunta clara al area correcta.");
    expect(html).toContain("Mesa ciudadana");
    expect(html).toContain("Nombre");
    expect(html).toContain("Email");
    expect(html).toContain("Consulta o reporte");
    expect(html).toContain("Enviar pedido civico");
  });
});
