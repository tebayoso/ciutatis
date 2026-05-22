import type { ReactNode } from "react";
import { Link } from "@/lib/router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Landmark,
  ArrowRight,
  Server,
  Activity,
  Github,
  MessageSquare,
  Building2,
  Workflow,
  ShieldCheck,
  Bot
} from "lucide-react";

function ContentShell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-7xl px-3 sm:px-8 lg:px-10", className)}>{children}</div>;
}

function SectionShell({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cn("border-b border-border/50 py-16 sm:py-24", className)}>
      {children}
    </section>
  );
}

export function GovOpsPage() {
  return (
    <div className="public-site h-[100dvh] w-full overflow-y-auto bg-background text-foreground">
      <div className="relative min-h-full">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-border/60 bg-background/86 backdrop-blur-xl">
          <ContentShell>
            <div className="py-4">
              <div className="public-panel public-shadow rounded-[18px] px-3 py-3 sm:px-5 sm:py-4">
                <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
                  <Link className="group flex min-w-0 items-center gap-3 text-foreground focus-visible:rounded-[14px]" to="/">
                    <div className="flex size-11 items-center justify-center rounded-[14px] border border-border bg-background/90 text-primary transition-colors group-hover:border-primary/70">
                      <Landmark className="size-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-base font-semibold tracking-tight" translate="no">
                        Ciutatis
                      </div>
                      <div className="truncate text-[11px] uppercase tracking-[0.18em] text-muted-foreground">GovOps Platform</div>
                    </div>
                  </Link>

                  <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-none sm:gap-3">
                    <a
                      className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-[10px] sm:inline-flex"
                      href="https://github.com/tebayoso/ciutatis"
                      target="_blank"
                      rel="noreferrer"
                    >
                      GitHub
                    </a>
                    <Button asChild className="rounded-[10px] px-3 shadow-none sm:px-5">
                      <Link to="/auth">Get Started</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </ContentShell>
        </header>

        <main id="public-main">
          {/* 1. Hero Section */}
          <SectionShell className="border-b-0 pb-12 pt-8 sm:pb-20 sm:pt-10 lg:pt-14">
            <ContentShell>
              <div className="public-panel public-shadow relative overflow-hidden rounded-[20px] px-4 py-12 text-center sm:px-8 sm:py-16 lg:px-12 lg:py-20">
                <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_50%)]" />
                </div>
                
                <div className="relative mx-auto max-w-4xl">
                  <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/88 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground shadow-sm">
                    <Landmark className="size-3.5 text-primary" aria-hidden="true" />
                    GovOps
                  </div>
                  <h1 className="public-display text-4xl leading-tight text-foreground sm:text-6xl lg:text-[4.5rem]">
                    The open source GovOps platform, <span className="text-primary">fully powered by AI</span>.
                  </h1>
                  <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl sm:leading-8">
                    Manage civic objectives, autonomous AI channels, and municipal operations from a single control plane. 
                    Built for governments that want to move faster without losing oversight.
                  </p>
                  <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
                    <Button asChild size="lg" className="h-12 w-full rounded-full px-8 text-base sm:w-auto">
                      <Link to="/auth">
                        Get Started
                        <ArrowRight className="ml-2 size-4" aria-hidden="true" />
                      </Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="h-12 w-full rounded-full border-border bg-background/88 px-8 text-base sm:w-auto">
                      <a href="https://github.com/tebayoso/ciutatis" target="_blank" rel="noreferrer">
                        <Github className="mr-2 size-4" aria-hidden="true" />
                        View on GitHub
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </ContentShell>
          </SectionShell>

          {/* 2. What is GovOps */}
          <SectionShell className="bg-secondary/20">
            <ContentShell>
              <div className="mx-auto mb-16 max-w-3xl text-center">
                <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">What is GovOps?</h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  Government Operations (GovOps) treats municipal administration as an engineering discipline. It brings automation, version control, and operational traceability to citizen services.
                </p>
              </div>
              
              <div className="grid gap-6 md:grid-cols-3">
                {[
                  {
                    icon: Building2,
                    title: "Institutional Memory",
                    body: "Context flows from civic goals down to every task, ensuring every department and channel knows what to do and why.",
                  },
                  {
                    icon: ShieldCheck,
                    title: "Governance & Approval",
                    body: "Sensitive actions wait for human review. Manage approvals, oversee strategy, and keep the decision record intact.",
                  },
                  {
                    icon: Workflow,
                    title: "Atomic Operations",
                    body: "Task checkout and execution are atomic, preventing double-work and runaway efforts across distributed municipal teams.",
                  },
                ].map((feature, i) => (
                  <div key={i} className="public-panel rounded-[18px] border border-border/60 bg-background/50 p-6">
                    <div className="mb-4 inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <feature.icon className="size-5" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
                  </div>
                ))}
              </div>
            </ContentShell>
          </SectionShell>

          {/* 3. Hosted Platform */}
          <SectionShell>
            <ContentShell>
              <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Hosted Municipal Platform</h2>
                  <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                    Ciutatis is the civic evolution of the open source Paperclip architecture. We provide a fully managed, multi-tenant control plane so you can focus on running your government, not your servers.
                  </p>
                  <ul className="mt-8 space-y-4">
                    {[
                      "True multi-institution isolation with separate data and audit trails",
                      "One deployment scales to support multiple departments or entire cities",
                      "Portable department templates for one-click setup of complete org charts",
                    ].map((item, i) => (
                      <li key={i} className="flex gap-3 text-muted-foreground">
                        <div className="mt-1 flex size-5 flex-none items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
                          <div className="size-1.5 rounded-full bg-primary" />
                        </div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="public-panel rounded-[20px] border border-border/80 bg-secondary/30 p-8 shadow-sm">
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="rounded-lg border border-border bg-background p-2 shadow-sm">
                        <Server className="size-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Fully Managed</h4>
                        <p className="mt-1 text-sm text-muted-foreground">Zero-configuration infrastructure managed by us.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="rounded-lg border border-border bg-background p-2 shadow-sm">
                        <ShieldCheck className="size-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Data Isolation</h4>
                        <p className="mt-1 text-sm text-muted-foreground">Strict multi-tenant boundaries for civic security.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ContentShell>
          </SectionShell>

          {/* 4. AI-Powered */}
          <SectionShell className="bg-secondary/20">
            <ContentShell>
              <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
                <div className="public-panel order-2 rounded-[20px] border border-border/80 bg-background/50 p-8 shadow-sm lg:order-1">
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="rounded-lg border border-border bg-background p-2 shadow-sm">
                        <Activity className="size-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Autonomous Heartbeats</h4>
                        <p className="mt-1 text-sm text-muted-foreground">Channels wake on schedule to process work without human triggers.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="rounded-lg border border-border bg-background p-2 shadow-sm">
                        <Bot className="size-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Bring Your Own Channels</h4>
                        <p className="mt-1 text-sm text-muted-foreground">Connect Gemini, Claude, OpenAI, or custom scripts to any role.</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="order-1 lg:order-2">
                  <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Fully Powered by AI</h2>
                  <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                    If AI assistants are channels, Ciutatis is the institution. Organize AI agents into departments, assign them civic objectives, and track their performance.
                  </p>
                  <ul className="mt-8 space-y-4">
                    {[
                      "Goal Alignment: Every AI task traces back to the institutional mission",
                      "Cost Control: Monthly budgets per channel to prevent runaway spend",
                      "Ticket System: Every AI decision is traced and explained in an immutable audit log",
                    ].map((item, i) => (
                      <li key={i} className="flex gap-3 text-muted-foreground">
                        <div className="mt-1 flex size-5 flex-none items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
                          <div className="size-1.5 rounded-full bg-primary" />
                        </div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </ContentShell>
          </SectionShell>

          {/* 5. Open Source & 6. Infrastructure */}
          <SectionShell>
            <ContentShell>
              <div className="grid gap-8 md:grid-cols-2">
                <div className="public-panel rounded-[20px] border border-border/80 bg-background p-8">
                  <Github className="mb-4 size-8 text-foreground" />
                  <h3 className="mb-2 text-2xl font-bold">Open Source</h3>
                  <p className="mb-6 text-muted-foreground">
                    Ciutatis is built on transparency. Our core engine is permanently open source under the MIT license, allowing governments to inspect, host, and modify the code without vendor lock-in.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <Button variant="outline" asChild>
                      <a href="https://github.com/tebayoso/ciutatis" target="_blank" rel="noreferrer">View Source</a>
                    </Button>
                    <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground">
                      <a href="https://discord.gg/m4HZY7xNG3" target="_blank" rel="noreferrer">
                        <MessageSquare className="mr-2 size-4" />
                        Join Discord
                      </a>
                    </Button>
                  </div>
                </div>

                <div className="public-panel rounded-[20px] border border-border/80 bg-background p-8">
                  <Server className="mb-4 size-8 text-foreground" />
                  <h3 className="mb-2 text-2xl font-bold">Modern Infrastructure</h3>
                  <p className="mb-6 text-muted-foreground">
                    Engineered for scale and security. Leveraging Cloudflare and modern plugin architecture to provide a resilient control plane with strict cost controls and runtime skill injection.
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2"><ArrowRight className="size-3 text-primary" /> Cloudflare distributed infrastructure</li>
                    <li className="flex items-center gap-2"><ArrowRight className="size-3 text-primary" /> Extensible plugin architecture</li>
                    <li className="flex items-center gap-2"><ArrowRight className="size-3 text-primary" /> Granular budget monitoring</li>
                  </ul>
                </div>
              </div>
            </ContentShell>
          </SectionShell>

          {/* 7. CTA Footer */}
          <SectionShell className="border-b-0 pb-16">
            <ContentShell>
              <div className="public-panel rounded-[24px] bg-foreground px-6 py-12 text-center text-background sm:px-12 sm:py-16 lg:px-20">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Start managing your government operations today
                </h2>
                <p className="text-muted mx-auto mt-4 max-w-2xl text-lg">
                  Join the municipalities using Ciutatis to orchestrate AI channels and citizen services from one control plane.
                </p>
                <div className="mt-8 flex justify-center">
                  <Button asChild size="lg" className="h-12 rounded-full bg-background px-8 text-foreground hover:bg-background/90">
                    <Link to="/auth">
                      Get Started Now
                      <ArrowRight className="ml-2 size-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </div>
            </ContentShell>
          </SectionShell>
        </main>

        <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
          <ContentShell>
            <span translate="no">Ciutatis</span>
            {" · "}
            Open source under MIT. Built for people who want to run institutions, not babysit channels.
          </ContentShell>
        </footer>
      </div>
    </div>
  );
}

export default GovOpsPage;
