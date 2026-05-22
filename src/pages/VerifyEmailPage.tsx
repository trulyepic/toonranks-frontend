import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { resendVerificationEmail, verifyEmail } from "../api/manApi";
import ReCAPTCHA from "react-google-recaptcha";
import { NoIndexSeo } from "../components/Seo";
import { SITE_NAME } from "../config/site";

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"verifying" | "success" | "error">(
    "verifying"
  );
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [resendCaptcha, setResendCaptcha] = useState("");
  const recaptchaRef = useRef<ReCAPTCHA | null>(null);

  const handleResend = async () => {
    setResending(true);
    setResendMsg(null);
    try {
      const { message } = await resendVerificationEmail({
        email: email || undefined,
        captcha_token: resendCaptcha || undefined,
      });
      setResendMsg(
        message ||
          "If an account exists, a new link was sent. Check Spam too, and mark the email as Not Spam if it lands there."
      );
    } catch {
      setResendMsg(
        "If an account exists, a new link was sent. Check Spam too, and mark the email as Not Spam if it lands there."
      );
    } finally {
      setResending(false);
      setResendCaptcha("");
      recaptchaRef.current?.reset();
    }
  };

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }

    verifyEmail(token)
      .then((msg) => {
        setStatus("success");
        setMessage(msg || "Email verified successfully!");
        setTimeout(() => navigate("/login"), 3000);
      })
      .catch((err) => {
        setStatus("error");
        if (err.message.includes("expired")) {
          setMessage("Verification link expired. Please request a new one.");
        } else {
          setMessage("Invalid or already-used token.");
        }
      });
  }, [navigate, searchParams]);

  return (
    <div className="dark-theme-shell flex min-h-screen items-center justify-center px-4 py-10">
      <NoIndexSeo title={`Verify Email | ${SITE_NAME}`} />
      <div className="w-full max-w-md rounded-[1.75rem] border border-slate-200 bg-white/92 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.14)] dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,_rgba(30,24,20,0.98),_rgba(21,17,14,0.98))]">
        <div className="text-center">
          {status === "verifying" && (
            <p className="text-lg text-blue-600 dark:text-blue-300">
              Verifying your email...
            </p>
          )}
          {status === "success" && (
            <p className="text-lg text-emerald-600 dark:text-emerald-300">
              {message} <br /> Redirecting to login...
            </p>
          )}
          {status === "error" && (
            <p className="text-lg text-red-600 dark:text-red-300">{message}</p>
          )}
        </div>

        {status === "error" && /expired/i.test(message) && (
          <div className="mt-6 text-left">
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-stone-200">
              Enter your email to resend:
            </label>
            <p className="mb-3 text-sm leading-6 text-slate-600 dark:text-stone-300">
              After resending, check your inbox and Spam folder. If the email is
              in Spam, mark it as Not Spam before using the link.
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="dark-theme-field mb-3 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 dark:border-[#3a3028] dark:text-stone-100 dark:placeholder:text-stone-500"
              placeholder="you@example.com"
            />
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
              onChange={(t) => setResendCaptcha(t || "")}
              className="mb-3"
            />
            <button
              onClick={handleResend}
              disabled={resending}
              className={`w-full rounded-xl py-2.5 text-white ${
                resending
                  ? "cursor-not-allowed bg-blue-400"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {resending ? "Resending..." : "Resend verification email"}
            </button>
            {resendMsg && (
              <p className="mt-3 text-center text-sm text-slate-700 dark:text-stone-300">
                {resendMsg}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage;
