import { homeConfig } from '../../../config/homeConfig';
import { SectionHeading } from './SectionHeading';
import { TestimonialCard } from './TestimonialCard';

export function TestimonialsSection() {
  const { title, subtitle, items } = homeConfig.testimonials;
  return (
    <section className="df-home2-section df-home2-testimonials" aria-labelledby="df-home2-testimonials-title">
      <SectionHeading title={title} subtitle={subtitle} uppercase={false} />
      <div className="df-home2-testimonials__grid">
        {items.map((item, i) => (
          <TestimonialCard key={`${item.name}-${i}`} item={item} />
        ))}
      </div>
    </section>
  );
}

export default TestimonialsSection;
