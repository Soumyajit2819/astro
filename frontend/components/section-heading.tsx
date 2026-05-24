type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function SectionHeading({ eyebrow, title, description }: SectionHeadingProps) {
  return (
    <div className="max-w-3xl">
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-gold">{eyebrow}</p>
      <h2 className="font-display text-3xl font-semibold text-sage sm:text-4xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-sage/80">{description}</p>
    </div>
  );
}
