export default function AuthIllustration() {
  return (
    <svg
      viewBox="0 0 500 420"
      className="w-full h-full max-w-md"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="90" cy="90" r="70" fill="#0077B6" opacity="0.25" />
      <circle cx="430" cy="340" r="90" fill="#00B4D8" opacity="0.2" />

      <rect x="60" y="180" width="34" height="90" rx="14" fill="#0077B6" />
      <rect x="68" y="165" width="18" height="20" rx="4" fill="#03045E" />
      <rect x="60" y="220" width="34" height="14" fill="#CAF0F8" opacity="0.7" />

      <g>
        <path d="M150 300 L350 300 L385 330 L115 330 Z" fill="#03045E" />
        <path d="M160 300 L340 300 L340 190 L160 190 Z" fill="#0077B6" />
        <rect x="172" y="200" width="156" height="90" rx="4" fill="#FFFFFF" />
        <rect x="182" y="210" width="60" height="8" rx="2" fill="#00B4D8" />
        <rect x="182" y="224" width="136" height="26" rx="4" fill="#CAF0F8" />
        <rect x="182" y="256" width="65" height="24" rx="4" fill="#90E0EF" />
        <rect x="253" y="256" width="65" height="24" rx="4" fill="#00B4D8" />
      </g>

      <rect x="380" y="250" width="70" height="95" rx="8" fill="#FFFFFF" stroke="#90E0EF" strokeWidth="3" />
      <rect x="390" y="262" width="50" height="70" rx="4" fill="#CAF0F8" />

      <g transform="translate(330,300)">
        <path
          d="M10 40 Q10 -10 60 -10 Q110 -10 110 40"
          fill="none"
          stroke="#03045E"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <rect x="0" y="35" width="24" height="34" rx="10" fill="#0077B6" />
        <rect x="96" y="35" width="24" height="34" rx="10" fill="#0077B6" />
      </g>

      <g transform="translate(270,340) rotate(-20)">
        <rect x="0" y="0" width="90" height="10" rx="4" fill="#00B4D8" />
        <rect x="0" y="0" width="14" height="10" rx="4" fill="#03045E" />
      </g>
    </svg>
  );
}