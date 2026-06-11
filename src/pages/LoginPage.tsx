import { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ReCAPTCHA from "react-google-recaptcha";
import { ClientOnly } from "../components/ClientOnly";
import {
  createMobileAuthCode,
  login,
  resendVerificationEmail,
} from "../api/manApi";
import type { AuthResponse } from "../api/manApi";
import GoogleOAuthButton from "../components/GoogleOAuthButton";
import AuthShell from "../components/AuthShell";
import PasswordField from "../components/PasswordField";
import { scheduleLogoutAtJwtExp } from "../util/authUtils";
import { useUser } from "../login/useUser";
import { NoIndexSeo } from "../components/Seo";
import { SITE_NAME } from "../config/site";
import {
  getMobileAuthRequest,
  redirectToMobileAuthCallback,
} from "../util/mobileAuthRedirect";

const fieldClass =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100 dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,_rgba(22,18,15,0.98),_rgba(18,15,12,0.98))] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-[#4a3c33] dark:focus:bg-[#181310] dark:focus:ring-[#2a221c]";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { setUser } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA | null>(null);

  const [showResend, setShowResend] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendCaptcha, setResendCaptcha] = useState("");
  const mobileAuthRequest = getMobileAuthRequest(location.search);

  const finishAuthenticatedSession = async (data: AuthResponse) => {
    setUser(data.user);
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("user", JSON.stringify(data.user));
    scheduleLogoutAtJwtExp(setUser, data.access_token);
    setError(null);

    if (mobileAuthRequest.isMobile && mobileAuthRequest.redirectUri) {
      const mobileCode = await createMobileAuthCode({
        redirect_uri: mobileAuthRequest.redirectUri,
        state: mobileAuthRequest.state,
      });
      redirectToMobileAuthCallback(mobileCode.redirect_url);
      return;
    }

    navigate("/");
  };

  const handleLogin = async () => {
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError("Username and password are required.");
      return;
    }

    if (!captchaToken) {
      setError("Please complete the CAPTCHA.");
      return;
    }

    setSubmitting(true);

    try {
      const data = await login({
        username,
        password,
        captcha_token: captchaToken,
      });
      await finishAuthenticatedSession(data);
    } catch (err) {
      const msg = (err as Error).message || "";
      console.error("Login error:", msg);

      const [statusCode, ...rest] = msg.split(":");
      const detail = rest.join(":").trim();

      if (statusCode === "403" && detail === "Email not verified") {
        setError(
          "Email not verified. Please check your inbox and Spam folder. If the verification email is in Spam, mark it as Not Spam."
        );
        setShowResend(true);
      } else if (statusCode === "401" && detail === "Invalid credentials") {
        setError("Invalid username or password.");
      } else if (
        /captcha/i.test(detail) ||
        /token/i.test(detail) ||
        statusCode === "400"
      ) {
        setError("CAPTCHA expired. Please try again.");
      } else if (mobileAuthRequest.isMobile) {
        setError("Login succeeded, but returning to the app failed. Please try again.");
      } else {
        setError("Login failed. Please try again.");
      }
      setCaptchaToken("");
      recaptchaRef.current?.reset();
    } finally {
      setSubmitting(false);
    }
  };

  const triggerResend = async () => {
    setResendMsg(null);
    setResending(true);
    try {
      const { message } = await resendVerificationEmail({
        email: resendEmail || undefined,
        username: !resendEmail ? username : undefined,
        captcha_token: resendCaptcha || undefined,
      });
      setResendMsg(
        message ||
          "If an account exists, a new link was sent. Check Spam too, and mark the email as Not Spam if it lands there."
      );
    } catch (err) {
      console.error("Resend error:", (err as Error).message || err);
      setResendMsg(
        "If an account exists, a new link was sent. Check Spam too, and mark the email as Not Spam if it lands there."
      );
    } finally {
      setResending(false);
      setResendCaptcha("");
      recaptchaRef.current?.reset();
    }
  };

  return (
    <AuthShell
      eyebrow="Welcome Back"
      title="Pick up where you left off."
      description="Sign in to manage reading lists, rate titles, and keep your forum activity tied to one account."
      accentLabel="Your account"
      accentTitle="One place for rankings, lists, and discussion."
      accentBody="Your votes, saved chapters, and community activity stay together so you can jump back in without friction."
      highlights={["Reading lists", "Series ratings", "Forum replies"]}
      footerPrompt="Need an account?"
      footerLinkLabel="Create one"
      footerLinkTo="/signup"
    >
      <NoIndexSeo title={`Login | ${SITE_NAME}`} />
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
            Login
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Use your Toon Ranks credentials to continue.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/80 dark:bg-rose-950/40 dark:text-rose-200">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Username
            </span>
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={fieldClass}
            />
          </label>

          <label className="block">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Password
              </span>
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Forgot password?
              </Link>
            </div>
            <PasswordField
              placeholder="Enter your password"
              value={password}
              onChange={setPassword}
              className={fieldClass}
              autoComplete="current-password"
            />
          </label>
        </div>

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
          onClick={handleLogin}
          disabled={submitting}
          className={`mt-5 w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white transition ${
            submitting
              ? "cursor-not-allowed bg-blue-400"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {submitting ? "Signing in..." : "Login"}
        </button>

        {showResend && (
          <div className="mt-6 rounded-[26px] border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-700/60 dark:bg-amber-950/30 sm:p-5">
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Resend verification email
              </h3>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                If your verification link expired, enter the email used for
                signup and we'll send another one. Check Spam too, and mark the
                message as Not Spam if it lands there.
              </p>
            </div>

            <label className="mt-4 block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Email
              </span>
              <input
                type="email"
                placeholder="Email used at signup"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                className={fieldClass}
              />
            </label>

            <div className="mt-4 overflow-x-auto rounded-2xl border border-amber-200 bg-white/80 px-3 py-3 dark:border-amber-700/60 dark:bg-[linear-gradient(145deg,_rgba(25,21,18,0.96),_rgba(20,17,14,0.96))]">
              <ClientOnly>
                {() => (
                  <ReCAPTCHA
                    ref={recaptchaRef}
                    sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                    onChange={(t) => setResendCaptcha(t || "")}
                  />
                )}
              </ClientOnly>
            </div>

            <button
              onClick={triggerResend}
              disabled={resending}
              className={`mt-4 w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white transition ${
                resending
                  ? "cursor-not-allowed bg-blue-400"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {resending ? "Resending..." : "Resend verification email"}
            </button>

            {resendMsg && (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/80 dark:bg-emerald-950/40 dark:text-emerald-200">
                {resendMsg}
              </div>
            )}
          </div>
        )}

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200 dark:bg-[#3a3028]" />
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            Or continue with
          </span>
          <div className="h-px flex-1 bg-slate-200 dark:bg-[#3a3028]" />
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 px-4 py-4 dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,_rgba(25,21,18,0.96),_rgba(20,17,14,0.96))]">
          <GoogleOAuthButton onAuthenticated={finishAuthenticatedSession} />
        </div>
      </div>
    </AuthShell>
  );
};

export default LoginPage;
