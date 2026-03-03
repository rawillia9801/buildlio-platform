import { Card, CardHeader, StatCard, Pill, Button } from "@/components/ops/ui";

export function DailyOpsPage() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <StatCard accent="blue" label="PENDING ORDERS" value="—" hint="Walmart | eBay | Other" />
        <StatCard accent="purple" label="UPCOMING BILLS" value="—" hint="Next 7 days" />
        <StatCard accent="green" label="ACTIVE LITTERS" value="—" hint="Due milestones" />
        <StatCard accent="orange" label="ALERTS" value="—" hint="Needs attention" />
      </div>

      <Card>
        <CardHeader
          title="TODAY'S PRIORITIES"
          right={<Button variant="primary">ADD TASK</Button>}
          subtitle="A simple list you can run every day."
        />
        <div className="divide-y divide-black/5">
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <div className="text-sm text-slate-700">Review sales totals & reconcile fees</div>
            <Pill tone="routine">ROUTINE</Pill>
          </div>
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <div className="text-sm text-slate-700">Check low-stock inventory items</div>
            <Pill tone="important">IMPORTANT</Pill>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="QUICK VIEW" subtitle="What you’ll see here once wired." />
          <div className="p-5 text-sm text-slate-600">
            <ul className="list-disc space-y-2 pl-5">
              <li>Unpaid balances by buyer</li>
              <li>Upcoming puppy milestones (deworming/vaccines/weights)</li>
              <li>Walmart/eBay orders needing action</li>
              <li>Domain renewals + hosting renewals</li>
            </ul>
          </div>
        </Card>

        <Card>
          <CardHeader title="SHORTCUTS" subtitle="Fast actions (visual now, wired later)." />
          <div className="grid grid-cols-2 gap-3 p-5">
            <button className="rounded-2xl border border-black/10 bg-white p-4 text-left hover:bg-slate-50">
              <div className="text-xs font-semibold tracking-widest text-slate-500">ADD</div>
              <div className="mt-1 text-sm font-semibold">New Order</div>
              <div className="mt-1 text-xs text-slate-500">Walmart / eBay / Other</div>
            </button>
            <button className="rounded-2xl border border-black/10 bg-white p-4 text-left hover:bg-slate-50">
              <div className="text-xs font-semibold tracking-widest text-slate-500">ADD</div>
              <div className="mt-1 text-sm font-semibold">New Bill</div>
              <div className="mt-1 text-xs text-slate-500">Personal / Business</div>
            </button>
            <button className="rounded-2xl border border-black/10 bg-white p-4 text-left hover:bg-slate-50">
              <div className="text-xs font-semibold tracking-widest text-slate-500">OPEN</div>
              <div className="mt-1 text-sm font-semibold">Secretary</div>
              <div className="mt-1 text-xs text-slate-500">Chat + tasks + context</div>
            </button>
            <button className="rounded-2xl border border-black/10 bg-white p-4 text-left hover:bg-slate-50">
              <div className="text-xs font-semibold tracking-widest text-slate-500">OPEN</div>
              <div className="mt-1 text-sm font-semibold">Tools & Hosting</div>
              <div className="mt-1 text-xs text-slate-500">Domains + sites + servers</div>
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}