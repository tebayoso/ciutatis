import { ArrowRight, Database, FileSearch, ShieldCheck, Ticket, Users } from "lucide-react";
import { Link } from "@/lib/router";
import { Button } from "@/components/ui/button";
import { InstitutionSearch } from "@/components/InstitutionSearch";

export function ScrutinyPage() {
  return (
    <div className="min-h-screen overflow-y-auto bg-[linear-gradient(180deg,#f8f5ef_0%,#fbfaf7_32%,#eef3f7_100%)] text-slate-950">
      {/* Header matching PublicSite/Portal vibe */}
      <header className="sticky top-0 z-40 border-b border-white/60 bg-white/50 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-3 focus-visible:rounded-[14px] focus-visible:outline-2 focus-visible:outline-slate-950 focus-visible:outline-offset-2">
              <div className="flex size-10 items-center justify-center rounded-[12px] bg-slate-950 text-white">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <div className="text-base font-bold tracking-tight" translate="no">Ciutatis</div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Public Scrutiny</div>
              </div>
            </Link>

            <nav className="flex items-center gap-3">
              <Button variant="ghost" asChild className="rounded-full border-slate-300 bg-white/50">
                <Link to="/portal">Citizen Portal</Link>
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6 lg:px-8">
        
        {/* 1. Hero Section */}
        <section className="mb-16 text-center">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-4xl leading-tight sm:text-6xl" style={{ fontFamily: "Fraunces, serif" }}>
              Public Scrutiny
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              Full transparency for government accountability. Search your government institution, audit decisions, 
              track funds, and hold your representatives accountable.
            </p>
            <div className="mt-8 flex items-center justify-center gap-4">
              <Button 
                onClick={() => document.getElementById("institution-search")?.scrollIntoView({ behavior: "smooth" })}
                className="h-12 rounded-full bg-slate-950 px-6 text-white hover:bg-slate-800"
              >
                Search your government
              </Button>
              <Button asChild variant="outline" className="h-12 rounded-full border-slate-300 bg-white/50 px-6">
                <Link to="/portal">Submit a request</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* 2. Institution Search */}
        <section id="institution-search" className="mb-20 scroll-mt-24">
          <div className="mx-auto max-w-4xl">
            <InstitutionSearch />
          </div>
        </section>

        {/* 3. What You Can Audit */}
        <section className="mb-24">
          <div className="mb-10 text-center">
            <h2 className="text-3xl" style={{ fontFamily: "Fraunces, serif" }}>What you can audit</h2>
            <p className="mt-3 text-slate-600">Full traceability from mandate to outcome.</p>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-[28px] border border-slate-200/80 bg-white/60 p-6 shadow-sm">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                <Users className="size-5" />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">People & Roles</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">View org charts, responsibilities, and decision-makers for every department.</p>
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                Coming soon
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200/80 bg-white/60 p-6 shadow-sm">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <FileSearch className="size-5" />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">Contracts & Funds</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Track budgets, expenditures, and vendor contracts attached to public mandates.</p>
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                Coming soon
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200/80 bg-white/60 p-6 shadow-sm">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                <Ticket className="size-5" />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">Citizen Requests</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Monitor aggregate resolution times and SLAs for public support tickets.</p>
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                Coming soon
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200/80 bg-white/60 p-6 shadow-sm">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
                <Database className="size-5" />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">Decisions</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Review AI and human decision justifications, including context and references.</p>
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                Coming soon
              </div>
            </div>
          </div>
        </section>

        {/* 4. How It Works */}
        <section className="mb-24 rounded-[32px] border border-slate-200/80 bg-white/80 p-8 shadow-sm sm:p-12">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-6 text-3xl" style={{ fontFamily: "Fraunces, serif" }}>The Transparency Model</h2>
            <div className="space-y-6 text-slate-600">
              <p className="text-base leading-7">
                <strong>Scrutiny vs Portal:</strong> The Ciutatis model splits interaction into two distinct experiences. 
                The <em>Citizen Portal</em> is where you submit requests, report issues, and communicate with your government. 
                The <em>Public Scrutiny</em> page is where you view aggregate data, audit decisions, and hold the institution accountable.
              </p>
              <p className="text-base leading-7">
                <strong>Default to Open:</strong> We believe that government data should be open by default. Instead of forcing citizens to file FOIA (Freedom of Information Act) requests for basic operational data, Ciutatis exposes this data securely and continuously.
              </p>
              <p className="text-base leading-7">
                <strong>Traceability:</strong> Every action taken by a municipal agent (human or AI) is logged. Scrutiny aims to expose this immutable audit log so you can see exactly why a decision was made.
              </p>
            </div>
          </div>
        </section>

        {/* 5. Data Sources */}
        <section className="mb-24 text-center">
          <div className="mx-auto max-w-2xl rounded-3xl border border-dashed border-slate-300 bg-slate-50/50 p-10">
            <Database className="mx-auto mb-4 size-8 text-slate-400" />
            <h3 className="text-xl font-semibold text-slate-900">Open Data Commitment</h3>
            <p className="mt-3 text-slate-600">
              Connecting government data sources...
            </p>
            <p className="mt-2 text-sm text-slate-500">
              We are working with institutions to map their internal systems to the Public Scrutiny view.
            </p>
          </div>
        </section>

      </main>

      {/* 6. Footer / Final CTA */}
      <footer className="border-t border-slate-200/80 bg-white/50 py-12">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold text-slate-900">Ready to engage?</h2>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Button 
              onClick={() => {
                window.scrollTo({ top: 0, behavior: "smooth" });
                setTimeout(() => document.getElementById("institution-search")?.scrollIntoView({ behavior: "smooth" }), 300);
              }}
              className="h-12 rounded-full bg-slate-950 px-6 text-white hover:bg-slate-800"
            >
              Search your government
            </Button>
            <Button asChild variant="outline" className="h-12 rounded-full border-slate-300 bg-white px-6">
              <Link to="/portal">
                Submit a request
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
          <div className="mt-12 text-sm text-slate-500">
            &copy; {new Date().getFullYear()} Ciutatis. Open source civic infrastructure.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default ScrutinyPage;
