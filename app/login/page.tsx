// FILE: app/login/page.tsx
"use client";

import React, { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardContent, Input, Button } from "@/components/ops/ui";

function LoginForm() {
  const searchParams = useSearchParams();
  const errorMsg = searchParams.get("error");
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Your actual authentication logic will go here later
    console.log("Attempting login for:", email);
  };

  return (
    <Card className="w-full max-w-md mx-auto mt-20">
      <CardHeader 
        title="SYSTEM LOGIN" 
        subtitle="Access your operations dashboard." 
      />
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4 pt-2">
          {/* Automatically handles and displays ?error= url parameters */}
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
            <Button type="submit" variant="primary" className="w-full">
              SIGN IN
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// This is the default export that Next.js expects.
// The Suspense boundary satisfies the build requirement for useSearchParams.
export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12 flex items-start justify-center">
      <Suspense fallback={<div className="mt-20 text-sm font-medium text-slate-500 tracking-widest">LOADING...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}