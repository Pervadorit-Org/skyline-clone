import { Link } from 'react-router-dom';

/** Fully-rounded pill CTA. `variant`: 'solid' (gold fill) | 'outline' (bordered). */
export function PillButton({ to, href, variant = 'solid', className = '', children, onClick }) {
  const classes = `df-home2-pill df-home2-pill--${variant} ${className}`.trim();
  if (to) {
    return (
      <Link to={to} className={classes} onClick={onClick}>
        {children}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={classes} onClick={onClick}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={classes} onClick={onClick}>
      {children}
    </button>
  );
}

export default PillButton;
