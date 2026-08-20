import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState("login"); // "login" | "register" | "forgot"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("student");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetRequested, setResetRequested] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "forgot" && !resetRequested) {
        const { data } = await authApi.forgotPassword({ username: username.trim() });
        setResetToken(data.token);
        setResetRequested(true);
        return;
      }
      if (mode === "forgot") {
        await authApi.resetPassword({ username: username.trim(), token: resetToken.trim(), new_password: resetPassword });
        setMode("login");
        setResetRequested(false);
        setResetToken("");
        setResetPassword("");
        setError("");
        return;
      }
      if (mode === "login") {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), password, fullName.trim(), role);
      }
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-semibold text-paper">Assignment Autograder</h1>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-card">
          <div className="mb-5 flex rounded-lg bg-paper-dim p-1 text-sm font-medium">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded-md py-1.5 transition ${mode === "login" ? "bg-white text-ink-700 shadow-sm" : "text-ink-400"}`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 rounded-md py-1.5 transition ${mode === "register" ? "bg-white text-ink-700 shadow-sm" : "text-ink-400"}`}
            >
              Register
            </button>
            <button
              type="button"
              onClick={() => setMode("forgot")}
              className={`flex-1 rounded-md py-1.5 transition ${mode === "forgot" ? "bg-white text-ink-700 shadow-sm" : "text-ink-400"}`}
            >
              Forgot password?
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-400">Full name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-md border border-ink-100 px-3 py-2 text-sm focus:border-marigold"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-medium text-ink-400">Username</label>
              <input
                type="text"
                required
                minLength={3}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-md border border-ink-100 px-3 py-2 text-sm focus:border-marigold"
              />
            </div>

            {mode !== "forgot" && <div>
              <label className="mb-1 block text-xs font-medium text-ink-400">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-ink-100 px-3 py-2 text-sm focus:border-marigold"
              />
            </div>}

            {mode === "forgot" && resetRequested && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-400">Reset token</label>
                  <input
                    type="text"
                    required
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    className="w-full rounded-md border border-ink-100 px-3 py-2 text-sm focus:border-marigold"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-400">New password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    className="w-full rounded-md border border-ink-100 px-3 py-2 text-sm focus:border-marigold"
                  />
                </div>
              </>
            )}

            {mode === "register" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-400">I am a&hellip;</label>
                <div className="flex gap-2">
                  {["student", "ta"].map((r) => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => setRole(r)}
                      className={`flex-1 rounded-md border px-3 py-2 text-sm capitalize transition ${
                        role === r ? "border-marigold bg-marigold-light/20 text-marigold-dark" : "border-ink-100 text-ink-400"
                      }`}
                    >
                      {r === "ta" ? "TA" : r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && <p className="text-sm text-fail">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-ink py-2.5 text-sm font-medium text-paper transition hover:bg-ink-500 disabled:opacity-50"
            >
              {loading
                ? "Please wait\u2026"
                : mode === "login"
                  ? "Log in"
                  : mode === "register"
                    ? "Create account"
                    : resetRequested
                      ? "Reset password"
                      : "Send reset instructions"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
