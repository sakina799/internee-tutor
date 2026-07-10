export default function ProgressRing({ percentage }: { percentage: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-32 h-32">
      <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="#CAF0F8"
          strokeWidth="12"
        />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="#0077B6"
          strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-mono text-2xl font-medium text-[#03045E]">
          {percentage}%
        </span>
      </div>
    </div>
  );
}