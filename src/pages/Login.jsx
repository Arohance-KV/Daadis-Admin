import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { loginUser, clearError } from "../redux/slices/authSlice";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { isLoading, error, isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    // Clear any previous errors when component mounts
    dispatch(clearError());

    // Redirect if already authenticated
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate, dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(clearError());

    const credentials = {
      email: email.trim(),
      password: password,
    };

    try {
      const result = await dispatch(loginUser(credentials));
      if (result.type === "auth/loginUser/fulfilled") {
        navigate("/dashboard");
      }
    } catch (error) {
      // Error handling is done by Redux
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="min-h-dvh grid lg:grid-cols-2 bg-bg text-text">
      {/* Brand panel — desktop only. Deep chocolate base so white text stays AA; saffron used sparingly as glow + logo. */}
      <div
        className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 text-white"
        style={{ background: "linear-gradient(135deg, #2a1b12 0%, #1a1410 100%)" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 15%, rgba(245,158,11,.35) 0, transparent 45%), radial-gradient(circle at 85% 80%, rgba(251,146,60,.25) 0, transparent 50%)",
          }}
        />
        <div className="relative flex items-center">
          <img src="/logo.png" alt="Daadi's" className="h-16 w-auto" />
        </div>
        <div className="relative max-w-md">
          <h1 className="font-display text-4xl font-semibold leading-tight">
            Sweetness, managed with care.
          </h1>
          <p className="mt-4 text-white/85">
            Your control room for orders, catalog and everything that keeps the
            kitchen running.
          </p>
        </div>
        <p className="relative text-sm text-white/70">
          &copy; {new Date().getFullYear()} Daadis. Admin access only.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          {/* Compact brand mark for mobile */}
          <div className="mb-8 flex lg:hidden">
            <img src="/logo.png" alt="Daadi's" className="h-12 w-auto" />
          </div>

          <h2 className="font-display text-3xl font-semibold text-ink">Welcome back</h2>
          <p className="mt-2 text-sm text-muted">Sign in to your admin dashboard.</p>

          {error && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-2 rounded-[12px] border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                placeholder="you@daadis.in"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  placeholder="Enter your password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={isLoading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted hover:text-text disabled:opacity-50"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading || !email.trim() || !password}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted">
            Need help? Contact your system administrator.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
