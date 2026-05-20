import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";

import { googleOAuthLogin } from "../api/manApi";
import type { CredentialResponse } from "@react-oauth/google";
import { scheduleLogoutAtJwtExp } from "../util/authUtils";
import { useUser } from "../login/useUser";
import type { AuthResponse } from "../api/manApi";

type GoogleOAuthButtonProps = {
  onAuthenticated?: (data: AuthResponse) => Promise<void> | void;
};

const GoogleOAuthButton = ({ onAuthenticated }: GoogleOAuthButtonProps) => {
  const navigate = useNavigate();
  const { setUser } = useUser();

  const handleGoogleSuccess = async (
    credentialResponse: CredentialResponse
  ) => {
    if (!credentialResponse.credential) {
      alert("Missing Google token");
      return;
    }

    try {
      const token = credentialResponse.credential;
      const data = await googleOAuthLogin(token);
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);

      // ⏱️ Auto logout after 10 hours (same as normal login)
      // setTimeout(() => {
      //   localStorage.removeItem("token");
      //   localStorage.removeItem("user");
      //   setUser(null);
      //   alert("Session expired. Please login again.");
      //   window.location.href = "/";
      // }, 10 * 60 * 60 * 1000);
      // handleAutoLogout(setUser);
      scheduleLogoutAtJwtExp(setUser, data.access_token);
      if (onAuthenticated) {
        await onAuthenticated(data);
      } else {
        navigate("/");
      }
    } catch (err) {
      alert("Google login failed");
      console.error("Google OAuth error:", err);
    }
  };

  return (
    <GoogleLogin
      onSuccess={handleGoogleSuccess}
      onError={() => alert("Google Login Failed")}
    />
  );
};

export default GoogleOAuthButton;
