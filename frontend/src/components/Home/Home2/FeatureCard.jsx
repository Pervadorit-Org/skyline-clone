import { ImageSlot } from './ImageSlot';

// Shared by the "Reasons" and "Feature Cards" sections. `icon` can be a real
// image path (rendered as the 3D-icon slot, ~334x320) or an emoji glyph
// (existing live copy) — only a genuinely missing icon falls back to the
// neutral placeholder box.
export function FeatureCard({ icon, title, body }) {
  const isImage = typeof icon === 'string' && (icon.startsWith('/') || icon.startsWith('http'));
  return (
    <div className="df-home2-feature-card">
      <div className="df-home2-feature-card__icon">
        {isImage ? (
          <ImageSlot src={icon} alt="" className="df-home2-feature-card__icon-img" />
        ) : icon ? (
          <span className="df-home2-feature-card__icon-emoji" aria-hidden>
            {icon}
          </span>
        ) : (
          <ImageSlot src="" alt={title} className="df-home2-feature-card__icon-img" />
        )}
      </div>
      <h3 className="df-home2-feature-card__title">{title}</h3>
      <p className="df-home2-feature-card__body">{body}</p>
    </div>
  );
}

export default FeatureCard;
