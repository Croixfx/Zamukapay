import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarClock,
  CheckCircle,
  Clock,
  FileText,
  Landmark,
  Menu,
  PackageSearch,
  Percent,
  Smartphone,
  Sparkles,
  Store,
  TrendingUp,
  X,
} from "lucide-react";
import { Logo } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ZamukaPay — Invoice Financing for Rwandan MSMEs" },
      {
        name: "description",
        content:
          "ZamukaPay advances your unpaid invoice value instantly via Mobile Money. No collateral, no waiting 60 days.",
      },
      { property: "og:title", content: "ZamukaPay — Invoice Financing for Rwandan MSMEs" },
      {
        property: "og:description",
        content: "Get paid for the work you've already done. Instant MoMo advances with AI risk scoring.",
      },
    ],
  }),
  component: LandingPage,
});

const navLinks = [
  { href: "#problem", label: "Problem" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#who", label: "Who it's for" },
];

const painPoints = [
  {
    icon: CalendarClock,
    title: "You delivered the goods but payday is 60 days away",
    text: "Long payment terms tie up the cash you need to run your business today.",
  },
  {
    icon: PackageSearch,
    title: "You can't restock because your cash is stuck in unpaid invoices",
    text: "Without working capital, you miss orders, growth stalls, and opportunities pass.",
  },
  {
    icon: Landmark,
    title: "The bank wants collateral you don't have",
    text: "Traditional lenders ask for assets most small businesses cannot pledge.",
  },
];

const steps = [
  { step: "1", icon: FileText, label: "Submit Invoice" },
  { step: "2", icon: CheckCircle, label: "Buyer Confirms" },
  { step: "3", icon: Sparkles, label: "AI Scores Risk" },
  { step: "4", icon: BadgeCheck, label: "Advance Approved" },
  { step: "5", icon: Smartphone, label: "MoMo Payout" },
];

const stats = [
  { icon: TrendingUp, value: "80%", label: "of invoice value advanced instantly" },
  { icon: Percent, value: "4%", label: "average fee per advance" },
  { icon: Clock, value: "< 5 min", label: "from submission to payout" },
];

const audiences = [
  {
    icon: Store,
    iconBg: "bg-primary/15 text-primary",
    title: "Suppliers",
    text: "MSMEs, farmers, contractors, and distributors who invoice larger buyers and need cash now.",
    benefits: [
      "Advance up to 80% of invoice value",
      "No collateral required",
      "Repaid when buyer settles",
    ],
    cta: "Get Started as Supplier",
    variant: "default" as const,
  },
  {
    icon: Building2,
    iconBg: "bg-success/15 text-success",
    title: "Buyers",
    text: "Supermarkets, hotels, processors, and distributors who want to support their supplier network.",
    benefits: [
      "Confirm invoices digitally",
      "Preserve supplier relationships",
      "No change to your payment terms",
    ],
    cta: "Register as Buyer",
    variant: "outline" as const,
  },
];

function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-[color-mix(in_oklab,var(--surface)_82%,transparent)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Button asChild variant="outline" className="h-10 px-4">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild className="h-10 px-4">
              <Link to="/login">Get started</Link>
            </Button>
          </div>

          <button
            className="rounded-lg p-2 md:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="border-t border-border/70 px-5 py-4 md:hidden">
            <nav className="flex flex-col gap-3">
              {navLinks.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium text-muted-foreground"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <Link
                to="/login"
                className="text-sm font-medium text-foreground"
                onClick={() => setMobileOpen(false)}
              >
                Sign in
              </Link>
            </nav>
          </div>
        )}
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden px-5 py-20 md:py-28">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute -right-20 -top-40 size-[520px] rounded-full bg-primary/20 blur-[120px]" />
            <div className="absolute -bottom-40 -left-20 size-[420px] rounded-full bg-success/15 blur-[100px]" />
            <div className="absolute right-[20%] top-24 size-36 rounded-full bg-primary/25 blur-3xl" />
            <div className="absolute bottom-32 left-[10%] size-24 rounded-full bg-success/20 blur-2xl" />
          </div>

          <div className="relative mx-auto max-w-6xl">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="size-3.5" /> AI-powered invoice financing
              </span>
              <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight md:text-6xl">
                Get paid for the work you've already done.
              </h1>
              <p className="mt-6 text-lg text-muted-foreground md:text-xl">
                ZamukaPay advances your invoice value instantly via MoMo — no collateral, no waiting 60 days.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Button
                  asChild
                  size="lg"
                  className="h-12 px-6 text-base font-semibold shadow-[var(--shadow-glow)]"
                >
                  <Link to="/login">
                    Get Started as Supplier <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 px-6 text-base font-semibold">
                  <Link to="/login">Register as Buyer</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Problem */}
        <section id="problem" className="light-section px-5 py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-extrabold tracking-tight md:text-4xl">
              Sound familiar?
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center light-muted">
              Rwandan MSMEs face the same cash flow trap every month.
            </p>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {painPoints.map((card) => (
                <div key={card.title} className="light-card p-6">
                  <card.icon className="size-8 text-primary" strokeWidth={1.5} />
                  <h3 className="mt-4 text-lg font-bold leading-snug">{card.title}</h3>
                  <p className="mt-2 text-sm light-muted">{card.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="px-5 py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-extrabold tracking-tight md:text-4xl">
              From invoice to MoMo in minutes.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
              A simple, transparent flow built for Rwandan businesses.
            </p>

            <div className="mt-12 flex flex-wrap justify-center gap-8 md:gap-10">
              {steps.map((item) => (
                <div key={item.label} className="flex w-36 flex-col items-center text-center md:w-40">
                  <div className="flex size-16 items-center justify-center rounded-2xl bg-secondary text-primary">
                    <item.icon className="size-7" />
                  </div>
                  <p className="mt-3 text-sm font-semibold">
                    <span className="text-primary">{item.step}.</span> {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="light-section px-5 py-20">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-8 text-center md:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className="light-card p-6">
                  <stat.icon className="mx-auto size-8 text-primary" strokeWidth={1.5} />
                  <p className="mt-4 text-4xl font-extrabold tracking-tight text-light-fg">{stat.value}</p>
                  <p className="mt-1 text-sm font-medium light-muted">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Who it's for */}
        <section id="who" className="px-5 py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-extrabold tracking-tight md:text-4xl">
              Who it's for
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
              Built for the businesses that power Rwanda's economy.
            </p>

            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {audiences.map((card) => (
                <div key={card.title} className="panel p-8">
                  <div className={`flex size-14 items-center justify-center rounded-2xl ${card.iconBg}`}>
                    <card.icon className="size-7" />
                  </div>
                  <h3 className="mt-5 text-2xl font-bold">{card.title}</h3>
                  <p className="mt-2 text-muted-foreground">{card.text}</p>
                  <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                    {card.benefits.map((benefit) => (
                      <li key={benefit} className="flex items-center gap-2">
                        <CheckCircle className="size-4 text-success" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                  <Button asChild variant={card.variant} className="mt-6 h-11 w-full font-semibold">
                    <Link to="/login">{card.cta}</Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/70 bg-[var(--navy-deep)] px-5 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col justify-between gap-8 md:flex-row">
            <div className="max-w-sm">
              <Logo />
              <p className="mt-4 text-sm text-muted-foreground">
                Turning unpaid invoices into working capital for Rwandan MSMEs.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
              <div>
                <p className="font-semibold">Product</p>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <li>
                    <a href="#how-it-works" className="hover:text-foreground">
                      How it works
                    </a>
                  </li>
                  <li>
                    <a href="#who" className="hover:text-foreground">
                      Who it's for
                    </a>
                  </li>
                  <li>
                    <Link to="/login" className="hover:text-foreground">
                      Sign in
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <p className="font-semibold">Company</p>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <li>
                    <a href="#problem" className="hover:text-foreground">
                      About
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-foreground">
                      Contact
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <p className="font-semibold">Legal</p>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <li>
                    <a href="#" className="hover:text-foreground">
                      Privacy
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-foreground">
                      Terms
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-12 border-t border-border/70 pt-6 text-center text-xs text-muted-foreground">
            <p>Powered by AI risk scoring. Licensed partner model operating under BNR framework.</p>
            <p className="mt-1">© {new Date().getFullYear()} ZamukaPay. Kigali, Rwanda.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
