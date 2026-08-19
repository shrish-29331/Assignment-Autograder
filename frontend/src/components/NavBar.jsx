import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="bg-ink text-paper">
      <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="font-display text-xl font-semibold tracking-tight">Autograder</span>
          <span className="font-mono text-xs text-marigold-light">pro</span>
        </Link>

        {user && (
          <nav className="flex items-center gap-6 text-sm">
            <span className="text-ink-200">
              {user.full_name} <span className="text-ink-300">&middot; {user.role === "ta" ? "TA" : "Student"}</span>
            </span>
            <button
              onClick={handleLogout}
              className="rounded-md border border-ink-400 px-3 py-1.5 text-paper transition hover:border-marigold hover:text-marigold-light"
            >
              Log out
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}
