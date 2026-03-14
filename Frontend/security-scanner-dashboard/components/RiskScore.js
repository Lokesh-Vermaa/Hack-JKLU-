export default function RiskScore({ score, counts = {} }) {
  const getRiskLevel = (score) => {
    if (score >= 70) return { level: 'High Risk', color: 'text-red-400', bgColor: 'bg-red-900/20' };
    if (score >= 30) return { level: 'Medium Risk', color: 'text-yellow-400', bgColor: 'bg-yellow-900/20' };
    return { level: score > 0 ? 'Low Risk' : 'Secure', color: 'text-green-400', bgColor: 'bg-green-900/20' };
  };

  const { critical = 0, high = 0, medium = 0, low = 0 } = counts;

  const risk = getRiskLevel(score);

  return (
    <div className={`p-6 rounded-lg ${risk.bgColor} border border-gray-700`}>
      <h3 className="text-lg font-semibold mb-4">Risk Score</h3>

      <div className="text-center">
        <div className="relative w-32 h-32 mx-auto mb-4">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray={`${score}, 100`}
              className={risk.color}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-3xl font-bold ${risk.color}`}>{score}</span>
          </div>
        </div>

        <p className={`text-lg font-semibold ${risk.color}`}>{risk.level}</p>
      </div>

      <div className="mt-6 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Critical</span>
          <span className="text-red-400 font-bold">{critical}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">High</span>
          <span className="text-orange-400 font-bold">{high}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Medium</span>
          <span className="text-yellow-400 font-bold">{medium}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Low</span>
          <span className="text-green-400 font-bold">{low}</span>
        </div>
      </div>
    </div>
  );
}