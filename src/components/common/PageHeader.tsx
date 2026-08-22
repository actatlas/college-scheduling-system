import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  category?: string;
  actions?: ReactNode;
  breadcrumbs?: ReactNode;
  helpText?: string;
}

export function PageHeader({
  title,
  description,
  category,
  actions,
  breadcrumbs,
  helpText,
}: PageHeaderProps) {
  return (
    <div className="page-panel">
      {breadcrumbs ? (
        <div className="page-breadcrumbs">{breadcrumbs}</div>
      ) : null}
      <div className="page-header">
        <div>
          {category ? <p className="eyebrow">{category}</p> : null}
          <h1>{title}</h1>
          {description ? <p className="muted">{description}</p> : null}
        </div>
        {actions ? <div className="page-header__actions">{actions}</div> : null}
      </div>
      {helpText ? (
        <div className="page-help">
          <div className="page-help__content">
            <span className="status-badge">Tip</span>
            <span>{helpText}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
