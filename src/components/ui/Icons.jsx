// Íconos de línea (estilo outline) para tarjetas y encabezados
function Svg({ children, size = 24 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const CalendarIcon = (props) => (
  <Svg {...props}>
    <rect x="3" y="4.5" width="18" height="17" rx="3" />
    <path d="M16 2.5v4M8 2.5v4M3 10h18" />
  </Svg>
);

export const ReportIcon = (props) => (
  <Svg {...props}>
    <path d="M14.5 2.5H7a2.5 2.5 0 0 0-2.5 2.5v14A2.5 2.5 0 0 0 7 21.5h10a2.5 2.5 0 0 0 2.5-2.5V7.5z" />
    <path d="M14.5 2.5v3a2 2 0 0 0 2 2h3" />
    <path d="M8.5 16.5l2.5-3 2 2 3-4" />
  </Svg>
);

export const GearIcon = (props) => (
  <Svg {...props}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);

// Ilustración decorativa de hojas para el banner de bienvenida
export function LeafArt({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 190 130"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="58" cy="92" r="38" fill="#cfe5d6" />
      <path
        d="M66 130c0-30 6-62 24-96"
        stroke="#7fae8e"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <g fill="#9cc6aa">
        <ellipse cx="52" cy="98" rx="9" ry="17" transform="rotate(-48 52 98)" />
        <ellipse cx="82" cy="86" rx="9" ry="17" transform="rotate(46 82 86)" />
        <ellipse cx="56" cy="70" rx="9" ry="16" transform="rotate(-48 56 70)" />
        <ellipse cx="86" cy="56" rx="9" ry="16" transform="rotate(46 86 56)" />
        <ellipse cx="68" cy="38" rx="8" ry="15" transform="rotate(-40 68 38)" />
      </g>
      <ellipse cx="92" cy="22" rx="7" ry="14" transform="rotate(30 92 22)" fill="#7fb08f" />
      <path d="M118 130V58a58 58 0 0 1 58 58v14z" fill="#cfe5d6" />
      <path d="M118 130V58a58 58 0 0 1 58 58z" fill="#7fb08f" opacity="0.55" />
      <path d="M118 130a58 58 0 0 1 58-58v58z" fill="#2f7a50" />
      <path d="M130 118c10-22 24-34 44-42" stroke="#e8f4ec" strokeWidth="2" strokeLinecap="round" />
      <path d="M148 40a15 15 0 0 1 15 15h-15z" fill="#2f7a50" />
      <path d="M148 40a15 15 0 0 0-15 15h15z" fill="#9cc6aa" />
    </svg>
  );
}
