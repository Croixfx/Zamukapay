import { Link, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Bell, Wallet } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getNotifications, markNotificationsRead } from "@/lib/zamuka-data";

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
  role: "Supplier" | "Buyer" | "Admin";
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
            <NotificationBell />
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

function NotificationBell() {
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
    refetchInterval: 30_000,
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const notifications = notificationsQuery.data ?? [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open && unreadCount > 0) markReadMutation.mutate();
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 && (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">
            No notifications yet.
          </p>
        )}
        {notifications.slice(0, 5).map((n) => (
          <div key={n.id} className="flex flex-col gap-0.5 rounded-md px-2 py-2 text-sm">
            <p className={n.is_read ? "text-muted-foreground" : "font-medium"}>{n.message}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(n.created_at).toLocaleString("en-GB", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
