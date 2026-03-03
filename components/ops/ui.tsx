// FILE: components/ops/ui.tsx
import * as React from "react";

/** Simple Tailwind UI primitives used by ops pages */

export function Card(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className = "", ...rest } = props;
  return (
    <div
      className={
        "rounded-2xl border border-slate-200 bg-white shadow-sm " + className
      }
      {...rest}
    />
  );
}

// Updated to accept title, subtitle, and right-side elements
export function CardHeader(props: React.HTMLAttributes<HTMLDivElement> & {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  const { className = "", title, subtitle, right, children, ...rest } = props;
  
  return (
    <div className={"flex items-start justify-between px-5 pt-5 pb-3 " + className} {...rest}>
      <div>
        {title && <CardTitle>{title}</CardTitle>}
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        {children}
      </div>
      {right && <div>{right}</div>}
    </div>
  );
}

export function CardTitle(props: React.HTMLAttributes<HTMLHeadingElement>) {
  const { className = "", ...rest } = props;
  return (
    <h3 className={"text-base font-semibold text-slate-900 " + className} {...rest} />
  );
}

export function CardContent(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className = "", ...rest } = props;
  return (
    <div className={"px-5 pb-5 " + className} {...rest} />
  );
}

export function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }
) {
  const { className = "", variant = "primary", ...rest } = props;

  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2";

  const styles =
    variant === "primary"
      ? "bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-400"
      : variant === "secondary"
      ? "bg-slate-100 text-slate-900 hover:bg-slate-200 focus:ring-slate-300"
      : "bg-transparent text-slate-900 hover:bg-slate-100 focus:ring-slate-300";

  return <button className={`${base} ${styles} ${className}`} {...rest} />;
}

export function Input(
  props: React.InputHTMLAttributes<HTMLInputElement>
) {
  const { className = "", ...rest } = props;
  return (
    <input
      className={
        "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 " +
        className
      }
      {...rest}
    />
  );
}

// Updated to accept the new tones used in your pages
export function Pill(
  props: React.HTMLAttributes<HTMLSpanElement> & { 
    tone?: "neutral" | "good" | "warn" | "bad" | "routine" | "important" | "ok" 
  }
) {
  const { className = "", tone = "neutral", ...rest } = props;

  const toneCls =
    tone === "good" || tone === "ok"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : tone === "warn" || tone === "important"
      ? "bg-amber-50 text-amber-800 border-amber-100"
      : tone === "bad"
      ? "bg-rose-50 text-rose-700 border-rose-100"
      : tone === "routine"
      ? "bg-blue-50 text-blue-700 border-blue-100"
      : "bg-slate-50 text-slate-700 border-slate-100";

  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wider " +
        toneCls +
        " " +
        className
      }
      {...rest}
    />
  );
}

// Updated to accept the accent prop
export function StatCard(props: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  accent?: "blue" | "purple" | "green" | "orange" | string;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="text-xs font-semibold tracking-widest text-slate-500">{props.label}</div>
        <div className="mt-2 text-3xl font-bold text-slate-900">{props.value}</div>
        {props.hint ? <div className="mt-2 text-xs font-medium text-slate-500">{props.hint}</div> : null}
      </CardContent>
    </Card>
  );
}