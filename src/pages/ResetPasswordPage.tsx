import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../api/manApi";
import AuthShell from "../components/AuthShell";
import PasswordField from "../components/PasswordField";
import { NoIndexSeo } from "../components/Seo";
import { SITE_NAME } from "../config/site";

const fieldClass =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100 dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,_rgba(22,18,15,0.98),_rgba(18,15,12,0.98))] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-[#4a3c33] dark:focus:bg-[#181310] dark:focus:ring-[#2a221c]";

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setMessage(null);

    if (!token) {
      setError("Missing reset token. Please request a new password reset link.");
      return;
    }

    if (password.trim().length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await resetPassword({ token, password });
      setMessage(response.message || "Password reset successful.");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Reset link is invalid or expired. Please request a new link."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="New Password"
      title="Choose a fresh password for your Toon Ranks account."
      description="Reset links expire quickly. If this one no longer works, request another from the login page."
      accentLabel="Account security"
      accentTitle="One reset link, one password change."
      accentBody="After your password changes, the reset link cannot be reused. Log in with the new password to continue."
      highlights={["8+ characters", "Single-use link", "Back to login"]}
      footerPrompt="Already reset it?"
      footerLinkLabel="Log in"
      footerLinkTo="/login"
    >
      <NoIndexSeo title={`Reset Password | ${SITE_NAME}`} />
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
            Reset password
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Enter a new password for your account.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/80 dark:bg-rose-950/40 dark:text-rose-200">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/80 dark:bg-emerald-950/40 dark:text-emerald-200">
            {message} Redirecting to login...
          </div>
        )}

        {!token && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-200">
            This reset link is missing a token. Request a new reset email from
            the login page.
          </div>
        )}

        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              New password
            </span>
            <PasswordField
              value={password}
              onChange={setPassword}
              placeholder="Enter a new password"
              className={fieldClass}
              autoComplete="new-password"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Confirm password
            </span>
            <PasswordField
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Confirm your new password"
              className={fieldClass}
              autoComplete="new-password"
            />
          </label>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting || !token}
          className={`mt-5 w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white transition ${
            submitting || !token
              ? "cursor-not-allowed bg-blue-400"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {submitting ? "Updating password..." : "Reset password"}
        </button>

        <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
          <Link
            to="/forgot-password"
            className="font-semibold text-blue-600 transition hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Request a new reset link
          </Link>
        </p>
      </div>
    </AuthShell>
  );
};

export default ResetPasswordPage;
