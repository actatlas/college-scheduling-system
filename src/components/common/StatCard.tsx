interface StatCardProps {
  label: string;
  value: string;
  detail: string;
  icon: string;
  tone: "royal" | "gold" | "navy" | "slate" | "emerald" | "amber";
  onClick?: () => void;
}

export function StatCard({
  label,
  value,
  detail,
  icon,
  tone,
  onClick,
}: StatCardProps) {
  return (
    <article
      className={`stat-card stat-card--${tone}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(event) => {
        if (onClick && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <div className="stat-card__icon">{icon}</div>
      <div>
        <p className="stat-card__value">{value}</p>
        <p className="stat-card__label">{label}</p>
        <p className="stat-card__detail">{detail}</p>
      </div>
    </article>
  );
}
