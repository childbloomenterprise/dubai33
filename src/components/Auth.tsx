import { useState } from "react";
import { Mail, LockKeyhole, ArrowRight, ShieldCheck } from "lucide-react";
import { useLinc } from "../state";
import { supabase } from "../lib/client";
import { Button, Modal, ErrorBox } from "./ui";
export function Auth() {
  const {
    authOpen,
    setAuthOpen,
    authConfigured,
    recovery,
    notify,
    completeRecovery,
  } = useLinc();
  const [mode, setMode] = useState<"login" | "recovery">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adult, setAdult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError("");
    try {
      const result = recovery
        ? await supabase.auth.updateUser({ password })
        : mode === "recovery"
          ? await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: `${window.location.origin}/auth`,
            })
          : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      notify(
        recovery
          ? "Password updated. Welcome aboard."
          : mode === "recovery"
            ? "If your invited account exists, a recovery link will arrive shortly."
            : "Welcome back.",
      );
      setAuthOpen(false);
      if (recovery) {
        completeRecovery();
        window.history.replaceState({}, "", "/");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open={authOpen}
      onOpenChange={setAuthOpen}
      title={
        recovery
          ? "Choose your password"
          : mode === "recovery"
            ? "Find your way back"
            : "Welcome aboard"
      }
      description="LINC-33 is currently available to invited travelers aged 18 and over."
    >
      {!authConfigured ? (
        <div className="setup-message">
          <ShieldCheck size={32} />
          <h3>We’re getting ready for your journey.</h3>
          <p>
            Account services haven’t been connected yet. You can explore local
            foods and general health resources, and emergency access stays
            available.
          </p>
          <p className="muted small">
            Pilot administrator: connect Supabase + invitation email delivery
            using the setup guide.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="form-stack">
          {!recovery && (
            <label>
              Email address
              <div className="input-icon">
                <Mail size={18} />
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                />
              </div>
            </label>
          )}
          {(recovery || mode === "login") && (
            <label>
              Password
              <div className="input-icon">
                <LockKeyhole size={18} />
                <input
                  type="password"
                  autoComplete={recovery ? "new-password" : "current-password"}
                  minLength={recovery ? 12 : 1}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Your password"
                />
              </div>
            </label>
          )}
          {mode === "login" && (
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={adult}
                onChange={(e) => setAdult(e.target.checked)}
                required
              />
              I confirm I am at least 18 years old.
            </label>
          )}
          {error && <ErrorBox message={error} />}
          <Button
            type="submit"
            loading={busy}
            disabled={mode === "login" && !adult}
          >
            {recovery
              ? "Set password"
              : mode === "recovery"
                ? "Send recovery link"
                : "Sign in"}
            <ArrowRight size={17} />
          </Button>
          {!recovery && (
            <Button
              variant="ghost"
              type="button"
              onClick={() => setMode(mode === "login" ? "recovery" : "login")}
            >
              {mode === "login" ? "Forgot your password?" : "Back to sign in"}
            </Button>
          )}
          <p className="muted small">
            New here? Open your invitation email to set your password. Open
            registration is currently closed.
          </p>
        </form>
      )}
    </Modal>
  );
}
