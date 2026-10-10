export function TestimonialCard({ item }) {
  const stars = Math.max(0, Math.min(5, item.stars ?? 5));
  return (
    <article className="df-home2-testimonial">
      <svg className="df-home2-testimonial__avatar" viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="12" cy="9.5" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path d="M5.2 18.4c1.2-2.8 3.8-4.4 6.8-4.4s5.6 1.6 6.8 4.4" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
      <span className="df-home2-testimonial__stars" aria-hidden>
        {'★'.repeat(stars)}
        {'☆'.repeat(5 - stars)}
      </span>
      <p className="df-home2-testimonial__quote">&ldquo;{item.quote}&rdquo;</p>
      <span className="df-home2-testimonial__name">{item.name}</span>
    </article>
  );
}

export default TestimonialCard;
