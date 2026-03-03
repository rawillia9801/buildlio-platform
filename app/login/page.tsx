// FILE: app/login/page.tsx
"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardContent, Input, Button } from "@/components/ops/ui";
import { createBrowserClient } from "@supabase/ssr";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorMsg = searchParams.get("error");
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Initialize Supabase
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Authenticate
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      router.push(`/login?error=${encodeURIComponent(error.message)}`);
      setLoading(false);
    } else {
      router.push("/"); // Successfully logged in, return to Nexus
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto mt-20">
      <CardHeader 
        title="SYSTEM LOGIN" 
        subtitle="Access your operations dashboard." 
      />
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700 border border-rose-100">
              {errorMsg}
            </div>
          )}
          
          <div className="space-y-1">
            <label className="text-xs font-semibold tracking-widest text-slate-500">EMAIL</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-semibold tracking-widest text-slate-500">PASSWORD</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          
          <div className="pt-2">
            <Button type="submit" variant="primary" className="w-full" disabled={loading}>
              {loading ? "AUTHENTICATING..." : "SIGN IN"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12 flex items-start justify-center">
      <Suspense fallback={<div className="mt-20 text-sm font-medium text-slate-500 tracking-widest">LOADING...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}