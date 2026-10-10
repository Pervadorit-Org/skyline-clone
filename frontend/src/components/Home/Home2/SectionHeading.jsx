export function SectionHeading({ title, lead, subtitle, uppercase = true, className = '' }) {
  if (!title) return null;
  const titleClass = `df-home2-heading__title${uppercase && !lead ? ' df-home2-heading__title--upper' : ''}${
    lead ? ' df-home2-heading__title--stacked' : ''
  }`;
  return (
    <div className={`df-home2-heading ${className}`}>
      <h2 className={titleClass}>
        {lead ? (
          <>
            <span className="df-home2-heading__lead">{lead}</span>
            <span className="df-home2-heading__main">{title}</span>
          </>
        ) : (
          title
        )}
      </h2>
      {subtitle ? <p className="df-home2-heading__subtitle">{subtitle}</p> : null}
    </div>
  );
}

export default SectionHeading;
