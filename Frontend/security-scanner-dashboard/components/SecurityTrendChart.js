import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function SecurityTrendChart() {
  const data = [
    { day: 'Mon', vulnerabilities: 12 },
    { day: 'Tue', vulnerabilities: 19 },
    { day: 'Wed', vulnerabilities: 15 },
    { day: 'Thu', vulnerabilities: 8 },
    { day: 'Fri', vulnerabilities: 12 },
    { day: 'Sat', vulnerabilities: 6 },
    { day: 'Sun', vulnerabilities: 9 },
  ];

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h3 className="text-xl font-bold mb-4">Vulnerability Trend</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="day" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#F9FAFB'
              }}
            />
            <Line
              type="monotone"
              dataKey="vulnerabilities"
              stroke="#06B6D4"
              strokeWidth={2}
              dot={{ fill: '#06B6D4', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#06B6D4', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}