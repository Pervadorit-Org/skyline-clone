import { homeConfig } from '../../../config/homeConfig';

export function IntroSection() {
  const cfg = homeConfig.intro;
  return (
    <section className="df-home2-intro">
      <h2 className="df-home2-intro__headline">
        {cfg.line1} <span className="df-home2-intro__highlight">{cfg.highlight}</span> {cfg.line1b}
        <br />
        {cfg.line2}
      </h2>
      {cfg.subtitle ? <p className="df-home2-intro__subtitle">{cfg.subtitle}</p> : null}
    </section>
  );
}

export default IntroSection;
