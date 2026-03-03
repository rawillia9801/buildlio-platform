// components/ops/ui.ts
import * as React from "react";

export { Button } from "@/components/ui/button";
export { Input } from "@/components/ui/input";

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

export { Badge as Pill } from "@/components/ui/badge";

export function StatCard(props: {
  title: string;
  value: React.ReactNode;
  subtext?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{props.title}</CardTitle>
        {props.right ? (
          <div className="text-muted-foreground">{props.right}</div>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{props.value}</div>
        {props.subtext ? (
          <p className="mt-1 text-xs text-muted-foreground">{props.subtext}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}