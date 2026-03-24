/**
 * Lurkr Knowledge Galaxy logo SVG component.
 */
export default function Logo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
    >
      {/* Outer galaxy ring */}
      <ellipse
        cx="50"
        cy="50"
        rx="45"
        ry="20"
        stroke="url(#galaxyGrad)"
        strokeWidth="1.5"
        opacity="0.6"
        transform="rotate(-20 50 50)"
      />
      <ellipse
        cx="50"
        cy="50"
        rx="38"
        ry="15"
        stroke="url(#galaxyGrad)"
        strokeWidth="1"
        opacity="0.4"
        transform="rotate(-20 50 50)"
      />
      {/* Core glow */}
      <circle cx="50" cy="50" r="8" fill="url(#coreGrad)" />
      <circle cx="50" cy="50" r="4" fill="#fff" opacity="0.9" />
      {/* Orbiting dots */}
      <circle cx="20" cy="42" r="2" fill="#FFD700" opacity="0.8" />
      <circle cx="78" cy="55" r="2.5" fill="#4169E1" opacity="0.8" />
      <circle cx="35" cy="72" r="1.5" fill="#00CED1" opacity="0.7" />
      <circle cx="68" cy="32" r="1.8" fill="#FF6347" opacity="0.7" />
      <circle cx="50" cy="22" r="1.2" fill="#9370DB" opacity="0.6" />
      <defs>
        <linearGradient id="galaxyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6495ED" />
          <stop offset="50%" stopColor="#9370DB" />
          <stop offset="100%" stopColor="#FFD700" />
        </linearGradient>
        <radialGradient id="coreGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="40%" stopColor="#6495ED" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#4169E1" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}
