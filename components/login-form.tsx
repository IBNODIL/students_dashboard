"use client";

import { authClient } from "@/lib/auth-client";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message || "Login failed");
        return;
      }

      router.refresh();
      router.push("/");
    } catch (err) {
      console.error(err);
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 via-sky-50 to-blue-50">
      <Card className="w-full max-w-md mx-4 p-8">
        <div className="mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg shadow-sm mb-4">
            SA
          </div>

          <h1 className="text-2xl font-bold">
            Welcome Back
          </h1>

          <p className="text-muted-foreground text-sm mt-1">
            Sign in to your attendance dashboard
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="space-y-4"
        >
          <div>
            <Label htmlFor="email">
              Email
            </Label>

            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              disabled={loading}
              required
            />
          </div>

          <div>
            <Label htmlFor="password">
              Password
            </Label>

            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              disabled={loading}
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading
              ? "Signing in..."
              : "Sign In"}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-6">
          This web page is in development progress
        </p>
      </Card>
    </div>
  );
}