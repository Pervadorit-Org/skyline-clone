import { useHomeConfig } from '../../../config/homeConfigContext';
import { SectionHeading } from './SectionHeading';
import { FeatureCard } from './FeatureCard';

export function ReasonsSection() {
  const homeConfig = useHomeConfig();
  const { title, titleLead, cards } = homeConfig.reasons;
  return (
    <section className="df-home2-section df-home2-reasons">
      <SectionHeading title={title} lead={titleLead} uppercase={false} />
      <div className="df-home2-reasons__grid">
        {cards.map((c) => (
          <FeatureCard key={c.title} icon={c.icon} title={c.title} body={c.body} />
        ))}
      </div>
    </section>
  );
}

export default ReasonsSection;
