<!--
  CIUTATIS — Civic Operations Platform
  ======================================
  A civic fork of Paperclip (https://github.com/paperclipai/paperclip)
  
  This project is a permanent fork of Paperclip, an open-source orchestration
  platform for AI-agent companies. Ciutatis adapts the same MIT-licensed codebase
  for civic and government use cases—city departments, citizen services, and
  municipal operations.
  
  Original work Copyright (c) 2025 Paperclip AI
  Fork maintained by tebayoso/ciutatis
-->

<p align="center">
  <a href="#quickstart"><strong>Quickstart</strong></a> &middot;
  <a href="https://ciutatis.com/docs"><strong>Docs</strong></a> &middot;
  <a href="https://github.com/tebayoso/ciutatis"><strong>GitHub</strong></a> &middot;
  <a href="https://discord.gg/m4HZY7xNG3"><strong>Discord</strong></a>
</p>

<p align="center">
  <a href="https://github.com/tebayoso/ciutatis/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License" /></a>
  <a href="https://github.com/tebayoso/ciutatis/stargazers"><img src="https://img.shields.io/github/stars/tebayoso/ciutatis?style=flat" alt="Stars" /></a>
  <a href="https://discord.gg/m4HZY7xNG3"><img src="https://img.shields.io/discord/000000000?label=discord" alt="Discord" /></a>
</p>

<br/>

<div align="center">
  <video src="https://github.com/user-attachments/assets/773bdfb2-6d1e-4e30-8c5f-3487d5b70c8f" width="600" controls></video>
</div>

<br/>

## What is Ciutatis?

# Open-source civic operations platform

**If AI assistants are _channels_, Ciutatis is the _institution_**

Ciutatis is a Node.js server and React UI that orchestrates AI channels to serve citizens and manage municipal operations. Bring your own channels, assign objectives, and track your department's work and budgets from one dashboard.

It looks like a task manager — but under the hood it has department structures, budgets, governance, objective alignment, and channel coordination.

**Manage municipal objectives, not paperwork backlogs.**

|        | Step               | Example                                                                  |
| ------ | ------------------ | ------------------------------------------------------------------------ |
| **01** | Define the objective | _"Process 10,000 citizen permit applications with 99% accuracy."_          |
| **02** | Onboard the channels | Department leads, case workers, reviewers — any channel, any provider.   |
| **03** | Approve and run    | Review strategy. Set budgets. Hit go. Monitor from the dashboard.        |

<br/>

> **COMING SOON: Civic Templates** — Deploy ready-made municipal configurations with one click. Browse pre-built department templates — full org structures, channel configs, and skills — and import them into your Ciutatis instance in seconds.

<br/>

<div align="center">
<table>
  <tr>
    <td align="center"><strong>Works<br/>with</strong></td>
    <td align="center"><img src="doc/assets/logos/gemini.svg" width="32" alt="Gemini" /><br/><sub>Gemini</sub></td>
    <td align="center"><img src="doc/assets/logos/bash.svg" width="32" alt="Bash" /><br/><sub>Bash</sub></td>
    <td align="center"><img src="doc/assets/logos/http.svg" width="32" alt="HTTP" /><br/><sub>HTTP</sub></td>
  </tr>
</table>

<em>If it can receive a heartbeat, it's onboarded.</em>

</div>

<br/>

## Ciutatis is right for you if

- ✅ You want to build **autonomous municipal operations**
- ✅ You **coordinate many different channels** toward a common civic objective
- ✅ You have **20 simultaneous channels** running and lose track of what everyone is doing
- ✅ You want channels running **autonomously 24/7**, but still want to audit work and chime in when needed
- ✅ You want to **monitor costs** and enforce budgets
- ✅ You want a process for managing channels that **feels like using a task manager**
- ✅ You want to manage your municipal operations **from your phone**

<br/>

## Features

<table>
<tr>
<td align="center" width="33%">
<h3>🔌 Bring Your Own Channel</h3>
Any channel, any runtime, one org chart. If it can receive a heartbeat, it's onboarded.
</td>
<td align="center" width="33%">
<h3>🎯 Goal Alignment</h3>
Every task traces back to the institutional mission. Channels know <em>what</em> to do and <em>why</em>.
</td>
<td align="center" width="33%">
<h3>💓 Heartbeats</h3>
Channels wake on a schedule, check work, and act. Delegation flows up and down the org chart.
</td>
</tr>
<tr>
<td align="center">
<h3>💰 Cost Control</h3>
Monthly budgets per channel. When they hit the limit, they stop. No runaway costs.
</td>
<td align="center">
<h3>🏢 Multi-Institution</h3>
One deployment, many institutions. Complete data isolation. One control plane for your municipality.
</td>
<td align="center">
<h3>🎫 Ticket System</h3>
Every conversation traced. Every decision explained. Full tool-call tracing and immutable audit log.
</td>
</tr>
<tr>
<td align="center">
<h3>🛡️ Governance</h3>
You're the board. Approve onboarding, override strategy, pause or terminate any channel — at any time.
</td>
<td align="center">
<h3>📊 Org Chart</h3>
Hierarchies, roles, reporting lines. Your channels have a supervisor, a title, and a job description.
</td>
<td align="center">
<h3>📱 Mobile Ready</h3>
Monitor and manage your municipal operations from anywhere.
</td>
</tr>
</table>

<br/>

## Problems Ciutatis solves

| Without Ciutatis                                                                                                                      | With Ciutatis                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| ❌ You have 20 channel sessions open and can't track which one does what. On reboot you lose everything.                              | ✅ Tasks are ticket-based, conversations are threaded, sessions persist across reboots.                                                |
| ❌ You manually gather context from several places to remind your channel what you're actually doing.                                 | ✅ Context flows from the task up through the project and institutional goals — your channel always knows what to do and why.           |
| ❌ Folders of channel configs are disorganized and you're re-inventing task management, communication, and coordination between channels. | ✅ Ciutatis gives you org charts, ticketing, delegation, and governance out of the box — so you run an institution, not a pile of scripts. |
| ❌ Runaway loops waste hundreds of dollars of tokens and max your quota before you even know what happened.                           | ✅ Cost tracking surfaces token budgets and throttles channels when they're out. Management prioritizes with budgets.                   |
| ❌ You have recurring jobs (citizen support, reports, inspections) and have to remember to manually kick them off.                    | ✅ Heartbeats handle regular work on a schedule. Management supervises.                                                                |
| ❌ You have an idea, you have to find your repo, fire up a channel, keep a tab open, and babysit it.                                 | ✅ Add a task in Ciutatis. Your channel works on it until it's done. Management reviews their work.                                    |

<br/>

## Why Ciutatis is special

Ciutatis handles the hard orchestration details correctly.

|                                   |                                                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Atomic execution.**             | Task checkout and budget enforcement are atomic, so no double-work and no runaway spend.                      |
| **Persistent channel state.**     | Channels resume the same task context across heartbeats instead of restarting from scratch.                    |
| **Runtime skill injection.**      | Channels can learn Ciutatis workflows and project context at runtime, without retraining.                     |
| **Governance with rollback.**     | Approval gates are enforced, config changes are revisioned, and bad changes can be rolled back safely.        |
| **Goal-aware execution.**         | Tasks carry full goal ancestry so channels consistently see the "why," not just a title.                      |
| **Portable department templates.**| Export/import departments, channels, and skills with secret scrubbing and collision handling.                  |
| **True multi-institution isolation.** | Every entity is institution-scoped, so one deployment can run many institutions with separate data and audit trails. |

<br/>

## What Ciutatis is not

|                              |                                                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Not a chatbot.**           | Channels have jobs, not chat windows.                                                                                    |
| **Not a channel framework.** | We don't tell you how to build channels. We tell you how to run an institution made of them.                             |
| **Not a workflow builder.**  | No drag-and-drop pipelines. Ciutatis models institutions — with org charts, goals, budgets, and governance.              |
| **Not a prompt manager.**    | Channels bring their own prompts, models, and runtimes. Ciutatis manages the organization they work in.                  |
| **Not a single-channel tool.** | This is for departments. If you have one channel, you probably don't need Ciutatis. If you have twenty — you definitely do. |
| **Not a code review tool.**  | Ciutatis orchestrates work, not pull requests. Bring your own review process.                                            |

<br/>

## Public site status

The production public site is bilingual and currently ships from the main `ui` application.

- English routes: `/en`, `/en/platform`, `/en/about`, `/en/partners`
- Spanish routes: `/es`, `/es/plataforma`, `/es/nosotros`, `/es/alianzas`
- `ciutatis.com/` redirects to `/en`

The standalone `landing/` workspace still exists for dedicated landing-page work, but the live `ciutatis.com` public experience is currently served from `ui`.

Recent public-site fixes included:

- stabilizing full-height public page scrolling and layout behavior
- improving English and Spanish copy, hierarchy, colors, and section structure
- isolating public routes from authenticated shell providers so public pages do not initialize company session and live-update traffic

<br/>

## Quickstart

Open source. Self-hosted. No account required.

```bash
npx ciutatis onboard --yes
```

Or manually:

```bash
git clone https://github.com/tebayoso/ciutatis.git
cd ciutatis
pnpm install
pnpm dev
```

This starts the API server at `http://localhost:3100`. An embedded PostgreSQL database is created automatically — no setup required.

> **Requirements:** Node.js 20+, pnpm 9.15+

<br/>

## FAQ

**What does a typical setup look like?**
Locally, a single Node.js process manages an embedded Postgres and local file storage. For production, point it at your own Postgres and deploy however you like. Configure projects, channels, and goals — the channels take care of the rest.

If you're a solo operator you can use Tailscale to access Ciutatis on the go. Then later you can deploy to e.g. Vercel when you need it.

**Can I run multiple institutions?**
Yes. A single deployment can run an unlimited number of institutions with complete data isolation.

**How is Ciutatis different from channels like Gemini?**
Ciutatis _uses_ those channels. It orchestrates them into an institution — with org charts, budgets, goals, governance, and accountability.

**Why should I use Ciutatis instead of just pointing my channel to Asana or Trello?**
Channel orchestration has subtleties in how you coordinate who has work checked out, how to maintain sessions, monitoring costs, establishing governance - Ciutatis does this for you.

(Bring-your-own-ticket-system is on the Roadmap)

**Do channels run continuously?**
By default, channels run on scheduled heartbeats and event-based triggers (task assignment, @-mentions). You can also hook in continuous channels. You bring your channel and Ciutatis coordinates.

<br/>

## Development

```bash
pnpm dev              # Full dev (API + UI, watch mode)
pnpm dev:once         # Full dev without file watching
pnpm dev:server       # Server only
pnpm dev:admin        # Standalone admin shell UI on localhost:4173
pnpm dev:landing      # Standalone landing workspace on localhost:3000 (not the current production source for ciutatis.com)
pnpm build            # Build all
pnpm typecheck        # Type checking
pnpm test:run         # Run tests
pnpm db:generate      # Generate DB migration
pnpm db:migrate       # Apply migrations
```

See [doc/DEVELOPING.md](doc/DEVELOPING.md) for the full development guide.

<br/>

## Roadmap

- ⚪ Get Gemini onboarding easier
- ⚪ Get cloud channels working e.g. serverless / e2b channels
- ⚪ Civic Templates — browse and deploy pre-built department configurations
- ⚪ Easy channel configurations / easier to understand
- ⚪ Better support for harness engineering
- 🟢 Plugin system (e.g. if you want to add a knowledgebase, custom tracing, queues, etc)
- ⚪ Better docs

<br/>

## Contributing

We welcome contributions. See the [contributing guide](CONTRIBUTING.md) for details.

<br/>

## Community

- [Discord](https://discord.gg/m4HZY7xNG3) — Join the community
- [GitHub Issues](https://github.com/tebayoso/ciutatis/issues) — bugs and feature requests
- [GitHub Discussions](https://github.com/tebayoso/ciutatis/discussions) — ideas and RFC

<br/>

## License

MIT &copy; 2026 Ciutatis

## Star History

[![Star History Chart](https://api.star-history.com/image?repos=tebayoso/ciutatis&type=date&legend=top-left)](https://www.star-history.com/?repos=tebayoso%2Fciutatis&type=date&legend=top-left)

<br/>

---

<p align="center">
  <img src="doc/assets/footer.jpg" alt="" width="720" />
</p>

<p align="center">
  <sub>Open source under MIT. Built for people who want to run institutions, not babysit channels.</sub>
</p>
