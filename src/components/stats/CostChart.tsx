import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface CostChartProps {
  data: { model: string; cost: number }[]
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

export function CostChart({ data }: CostChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-zinc-500 text-sm">
        暂无数据
      </div>
    )
  }

  const formatCost = (value: number) => `$${value.toFixed(4)}`

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          dataKey="cost"
          nameKey="model"
          cx="50%"
          cy="50%"
          outerRadius={80}
          innerRadius={40}
          paddingAngle={2}
          label={({ model, percent }) =>
            `${model.split('/').pop()} (${(percent * 100).toFixed(0)}%)`
          }
          labelLine={false}
        >
          {data.map((_, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[index % COLORS.length]}
              stroke="transparent"
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: '#27272a',
            border: '1px solid #3f3f46',
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value: number) => [formatCost(value), '费用']}
        />
        <Legend
          wrapperStyle={{ fontSize: 11 }}
          formatter={(value: string) => {
            const parts = value.split('/')
            return parts[parts.length - 1] || value
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
