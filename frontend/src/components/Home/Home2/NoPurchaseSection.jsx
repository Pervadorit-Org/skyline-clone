import { homeConfig } from '../../../config/homeConfig';
import { ImageSlot } from './ImageSlot';
import { PillButton } from './PillButton';

// "No Purchase Necessary" split panel: copy + CTA on the left, character art
// on the right. Background is a CSS gradient (see home-v2.css) + DragonFury's
// own dragon art — not goldendragon.casino's hosted play-for-free images.
export function NoPurchaseSection() {
  const cfg = homeConfig.noPurchase;
  if (!cfg) return null;
  return (
    <section className="df-home2-section df-home2-nopurchase" style = {{backgroundImage: "https://www.goldendragon.casino/landing/play-for-free-bg.webp"}}>
      <div className="df-home2-nopurchase__inner">
        <div className="df-home2-nopurchase__text">
          <h2 className="df-home2-nopurchase__title">{cfg.title}</h2>
          <p className="df-home2-nopurchase__body">{cfg.body}</p>
          <PillButton to={cfg.ctaHref} variant="solid" className="df-home2-nopurchase__cta">
            <span className="df-home2-nopurchase__cta-desktop">{cfg.ctaLabel}</span>
            <span className="df-home2-nopurchase__cta-mobile">{cfg.ctaLabelMobile}</span>
          </PillButton>
        </div>
        <ImageSlot src={cfg.character} alt="" className="df-home2-nopurchase__character" />
      </div>
    </section>
  );
}

export default NoPurchaseSection;
