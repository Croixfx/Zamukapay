import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Wallet } from "lucide-react";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span className="flex size-9 items-center justify-center rounded-xl bg-[image:var(--gradient-brand)] text-primary-foreground">
        <Wallet className="size-5" />
      </span>
      {!compact && (
        <span className="text-lg font-extrabold tracking-tight">
          Zamuka<span className="brand-gradient-text">Pay</span>
        </span>
      )}
    </span>
  );
}

type NavItem = { to: string; label: string };

export function AppShell({
  role,
  who,
  nav = [],
  children,
}: {
  role: "Supplier" | "Buyer";
  who: string;
  nav?: NavItem[];
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-[color-mix(in_oklab,var(--surface)_82%,transparent)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-5 py-4">
          <Link to="/">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  pathname === item.to
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right leading-tight">
              <p className="text-sm font-semibold">{who}</p>
              <p className="text-xs text-muted-foreground">{role} account</p>
            </div>
            <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-sm font-bold">
              {who.slice(0, 1)}
            </span>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
