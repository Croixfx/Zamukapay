import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, ShieldCheck, Store, Building2, ShieldHalf } from "lucide-react";
import { Logo } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/api";
import { login } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — ZamukaPay" },
      {
        name: "description",
        content:
          "Sign in to ZamukaPay to turn unpaid invoices into instant MoMo cash advances for Rwandan suppliers and buyers.",
      },
      { property: "og:title", content: "Sign in — ZamukaPay" },
      {
        property: "og:description",
        content: "Turn unpaid invoices into instant MoMo cash advances with AI risk scoring.",
      },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [role, setRole] = useState<"supplier" | "buyer" | "admin">("supplier");
  const [email, setEmail] = useState("aline@umucyo.rw");
  const [password, setPassword] = useState("demo1234");

  function selectRole(next: "supplier" | "buyer" | "admin") {
    setRole(next);
    if (next === "admin") {
      setEmail("admin@zamukapay.rw");
      setPassword("admin1234");
    } else if (next === "supplier") {
      setEmail("aline@umucyo.rw");
      setPassword("demo1234");
    } else {
      setEmail("simba@supermarket.rw");
      setPassword("demo1234");
    }
  }

  const loginMutation = useMutation({
    mutationFn: () => login(email, password),
    onSuccess: (user) => {
      const destination =
        user.role === "BUYER"
          ? "/buyer-dashboard"
          : user.role === "ADMIN"
            ? "/admin-dashboard"
            : "/supplier-dashboard";
      navigate({ to: destination });
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-md rise-in">
        <div className="mb-8 text-center">
          <div className="flex justify-center">
            <Logo />
          </div>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight">
            Get paid today, not in 90 days
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Invoice financing for Rwandan MSMEs, settled straight to Mobile Money.
          </p>
        </div>

        <form
          className="panel space-y-5 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            loginMutation.mutate();
          }}
        >
          <div className="space-y-2">
            <Label>I am a</Label>
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  { key: "supplier", label: "Supplier", note: "I issue invoices", icon: Store },
                  { key: "buyer", label: "Buyer", note: "I pay invoices", icon: Building2 },
                  { key: "admin", label: "Admin", note: "I run ZamukaPay", icon: ShieldHalf },
                ] as const
              ).map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => selectRole(option.key)}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    role === option.key
                      ? "border-transparent bg-secondary shadow-[var(--shadow-glow)]"
                      : "border-border hover:bg-secondary/60"
                  }`}
                >
                  <option.icon
                    className={`size-5 ${role === option.key ? "text-success" : "text-muted-foreground"}`}
                  />
                  <p className="mt-2 text-sm font-semibold">{option.label}</p>
                  <p className="text-xs text-muted-foreground">{option.note}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {loginMutation.isError && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {getApiErrorMessage(loginMutation.error, "Invalid email or password.")}
            </p>
          )}

          <Button
            type="submit"
            className="h-11 w-full text-base font-semibold"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Sign in as {role === "supplier" ? "Supplier" : role === "buyer" ? "Buyer" : "Admin"}
          </Button>

          <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 text-success" /> BNR-aligned demo environment · Kigali,
            Rwanda
          </p>
        </form>
      </div>
    </div>
  );
}
