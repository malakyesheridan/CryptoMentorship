'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { AllocationSnapshot } from '@/lib/roi-dashboard'

const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#f97316', '#0ea5e9', '#64748b']

export function RoiAllocationChart({ allocation }: { allocation: AllocationSnapshot | null }) {
  if (!allocation) {
    return (
      <Card className="card">
        <CardHeader>
          <CardTitle>Allocation Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">No allocation data available.</p>
        </CardContent>
      </Card>
    )
  }

  const data = [
    ...allocation.items.map((item) => ({
      name: item.asset,
      value: item.weight * 100
    })),
    {
      name: 'Cash',
      value: allocation.cashWeight * 100
    }
  ]

  return (
    <Card className="card">
      <CardHeader>
        <CardTitle>Allocation Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2">
          {data.map((entry, index) => (
            <div key={entry.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-slate-700">{entry.name}</span>
              </div>
              <span className="text-slate-600">{entry.value.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
