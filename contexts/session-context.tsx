"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface SessionContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const PUBLIC_ROUTES = ["/login"];

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/auth/get-session", {
          method: "GET",
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          // Better Auth returns { session, user } structure
          const userData = data?.user;
          if (userData) {
            setUser(userData);
          } else {
            setUser(null);
            // Redirect to login if not on a public route
            if (!PUBLIC_ROUTES.includes(pathname)) {
              router.push("/login");
            }
          }
        } else {
          setUser(null);
          // Redirect to login if not on a public route
          if (!PUBLIC_ROUTES.includes(pathname)) {
            router.push("/login");
          }
        }
      } catch (error) {
        console.error("Failed to check session:", error);
        setUser(null);
        if (!PUBLIC_ROUTES.includes(pathname)) {
          router.push("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [router, pathname]);

  const logout = async () => {
    try {
      await fetch("/api/auth/sign-out", {
        method: "POST",
        credentials: "include",
      });
      setUser(null);
      router.push("/login");
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  return (
    <SessionContext.Provider value={{ user, loading, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return context;
}
