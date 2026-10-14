import { useHomeConfig } from '../../../config/homeConfigContext';
import { FeatureCard } from './FeatureCard';

export function FeatureCardsSection() {
  const homeConfig = useHomeConfig();
  const cards = homeConfig.featureCards;
  return (
    <section className="df-home2-section df-home2-reasons df-home2-feature-cards">
      <div className="df-home2-reasons__grid">
        {cards.map((c) => (
          <FeatureCard key={c.title} icon={c.icon} title={c.title} body={c.body} />
        ))}
      </div>
    </section>
  );
}

export default FeatureCardsSection;
