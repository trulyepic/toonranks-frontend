import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ReCAPTCHA from "react-google-recaptcha";
import { createMobileAuthCode, signup } from "../api/manApi";
import type { AuthResponse } from "../api/manApi";
import GoogleOAuthButton from "../components/GoogleOAuthButton";
import AuthShell from "../components/AuthShell";
import { NoIndexSeo } from "../components/Seo";
import { SITE_NAME } from "../config/site";
import { useUser } from "../login/useUser";
import { scheduleLogoutAtJwtExp } from "../util/authUtils";
import {
  buildMobileSignupVerificationRedirect,
  getMobileAuthRequest,
  redirectToMobileAuthCallback,
} from "../util/mobileAuthRedirect";

const fieldClass =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100 dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,_rgba(22,18,15,0.98),_rgba(18,15,12,0.98))] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-[#4a3c33] dark:focus:bg-[#181310] dark:focus:ring-[#2a221c]";

const SignupPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const { setUser } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [captchaToken, setCaptchaToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const mobileAuthRequest = getMobileAuthRequest(location.search);

  const finishAuthenticatedSession = async (data: AuthResponse) => {
    setUser(data.user);
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("user", JSON.stringify(data.user));
    scheduleLogoutAtJwtExp(setUser, data.access_token);

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

  const handleSignup = async () => {
    const u = username.trim();
    const p = password.trim();
    const e = email.trim().toLowerCase();

    setError(null);
    setInfo(null);

    if (!u || !p || !e) {
      setError("All fields are required.");
      return;
    }
    if (!captchaToken) {
      setError("Please complete the CAPTCHA.");
      return;
    }

    setSubmitting(true);
    try {
      await signup({
        username: u,
        password: p,
        email: e,
        captcha_token: captchaToken,
      });

      setInfo(
        "Signup successful. Please check your inbox and Spam folder for the verification email."
      );
      const mobileRedirect =
        buildMobileSignupVerificationRedirect(mobileAuthRequest);
      if (mobileRedirect) {
        redirectToMobileAuthCallback(mobileRedirect);
        return;
      }
      navigate("/check-your-email");
    } catch (err) {
      const raw = err instanceof Error ? err.message : "0:Signup failed";
      const [status, ...rest] = raw.split(":");
      const detail = rest.join(":").trim().toLowerCase();

      if (status === "409") {
        if (detail.includes("email")) {
          setError(
            "Email already exists. Please log in or use a different email."
          );
        } else if (detail.includes("username")) {
          setError("Username already exists. Try a different one.");
        } else {
          setError("Account already exists.");
        }
      } else if (status === "422") {
        setError("Invalid email. Only Gmail or Yahoo addresses are allowed.");
      } else if (status === "400") {
        setError("Please complete the CAPTCHA.");
      } else {
        setError("Signup failed. Please try again.");
      }

      console.error("Signup error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Create Account"
      title="Start tracking everything in one place."
      description="Create your Toon Ranks account to save series, rate categories once, and join the forum with a consistent identity."
      accentLabel="What you unlock"
      accentTitle="A cleaner reading flow from ranking to discussion."
      accentBody="Keep your saved lists, ratings, and forum activity tied to one account so your progress is easy to return to later."
      highlights={["Saved lists", "Locked-in ratings", "Forum identity"]}
      footerPrompt="Already have an account?"
      footerLinkLabel="Log in"
      footerLinkTo="/login"
    >
      <NoIndexSeo title={`Sign Up | ${SITE_NAME}`} />
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
            Sign Up
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Create your account and verify your email to get started. If the
            verification email lands in Spam, mark it as Not Spam so future
            messages arrive normally.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/80 dark:bg-rose-950/40 dark:text-rose-200">
            {error}
          </div>
        )}

        {info && (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/80 dark:bg-emerald-950/40 dark:text-emerald-200">
            {info}
          </div>
        )}

        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Username
            </span>
            <input
              type="text"
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={fieldClass}
            />
          </label>

          <label className="block">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Email
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Gmail or Yahoo only
              </span>
            </div>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldClass}
            />
          </label>

          <label className="block">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Password
              </span>
              <Link
                to="/login"
                className="text-xs font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Already registered?
              </Link>
            </div>
            <input
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={fieldClass}
            />
          </label>
        </div>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-3 dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,_rgba(25,21,18,0.96),_rgba(20,17,14,0.96))]">
          <ReCAPTCHA
            sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
            onChange={(token) => setCaptchaToken(token || "")}
            onExpired={() => setError("CAPTCHA expired. Please try again.")}
            onError={() => setError("CAPTCHA failed to load. Please retry.")}
          />
        </div>

        <button
          onClick={handleSignup}
          disabled={submitting}
          className={`mt-5 w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white transition ${
            submitting
              ? "cursor-not-allowed bg-emerald-400"
              : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {submitting ? "Creating account..." : "Sign Up"}
        </button>

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

export default SignupPage;
