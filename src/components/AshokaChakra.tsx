const AshokaChakra = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className} fill="none">
    <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="2" />
    <circle cx="50" cy="50" r="12" fill="currentColor" />
    {Array.from({ length: 24 }).map((_, i) => {
      const angle = (i * 15 * Math.PI) / 180;
      const x1 = 50 + 14 * Math.cos(angle);
      const y1 = 50 + 14 * Math.sin(angle);
      const x2 = 50 + 44 * Math.cos(angle);
      const y2 = 50 + 44 * Math.sin(angle);
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="1.5" />;
    })}
  </svg>
);

export default AshokaChakra;
