import { useRef, useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { ClientOnly } from "../components/ClientOnly";
import { Link } from "react-router-dom";
import { forgotPassword } from "../api/manApi";
import AuthShell from "../components/AuthShell";
import { NoIndexSeo } from "../components/Seo";
import { SITE_NAME } from "../config/site";

const fieldClass =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100 dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,_rgba(22,18,15,0.98),_rgba(18,15,12,0.98))] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-[#4a3c33] dark:focus:bg-[#181310] dark:focus:ring-[#2a221c]";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setMessage(null);

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    if (!captchaToken) {
      setError("Please complete the CAPTCHA.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await forgotPassword({
        email,
        captcha_token: captchaToken,
      });
      setMessage(
        response.message ||
          "If an account exists for that email, a password reset link has been sent."
      );
    } catch {
      setMessage(
        "If an account exists for that email, a password reset link has been sent."
      );
    } finally {
      setSubmitting(false);
      setCaptchaToken("");
      recaptchaRef.current?.reset();
    }
  };

  return (
    <AuthShell
      eyebrow="Account Recovery"
      title="Get back to your lists, ratings, and discussions."
      description="Request a password reset link for your Toon Ranks account. We keep the response private so account details stay protected."
      accentLabel="Reset link"
      accentTitle="A short-lived link sent to your email."
      accentBody="Use the link within 30 minutes to choose a new password. If you do not see it, check Spam and mark it as Not Spam."
      highlights={["30-minute link", "Private response", "Email protected"]}
      footerPrompt="Remembered your password?"
      footerLinkLabel="Log in"
      footerLinkTo="/login"
    >
      <NoIndexSeo title={`Forgot Password | ${SITE_NAME}`} />
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
            Forgot password
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Enter your account email and we'll send a reset link if an account
            exists.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/80 dark:bg-rose-950/40 dark:text-rose-200">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700 dark:border-emerald-900/80 dark:bg-emerald-950/40 dark:text-emerald-200">
            {message} Check your inbox and Spam folder. If it lands in Spam,
            mark it as Not Spam.
          </div>
        )}

        <label className="block">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Email
          </span>
          <input
            type="email"
            placeholder="Email used at signup"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldClass}
          />
        </label>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-3 dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,_rgba(25,21,18,0.96),_rgba(20,17,14,0.96))]">
          <ClientOnly>
            {() => (
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                onChange={(token) => setCaptchaToken(token || "")}
                onExpired={() => {
                  setCaptchaToken("");
                  setError("CAPTCHA expired. Please try again.");
                }}
                onError={() => {
                  setCaptchaToken("");
                  setError("CAPTCHA failed to load. Please retry.");
                }}
              />
            )}
          </ClientOnly>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className={`mt-5 w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white transition ${
            submitting
              ? "cursor-not-allowed bg-blue-400"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {submitting ? "Sending link..." : "Send reset link"}
        </button>

        <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
          <Link
            to="/signup"
            className="font-semibold text-blue-600 transition hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Need a new account?
          </Link>
        </p>
      </div>
    </AuthShell>
  );
};

export default ForgotPasswordPage;
