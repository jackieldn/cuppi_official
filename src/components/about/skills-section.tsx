'use client';

import Image from 'next/image';
import { TechnicalSkill } from '@/lib/about-types';
import { Reveal } from '@/components/ui/reveal';

interface SkillsSectionProps {
  skills: TechnicalSkill[];
}

const levelNames: { [key: number]: string } = {
  1: 'Beginner',
  2: 'Intermediate',
  3: 'Experienced',
  4: 'Advanced',
  5: 'Professional',
};

const SkillBar = ({ level }: { level: number }) => (
  <div className="flex items-center gap-1.5 h-3">
    {[...Array(5)].map((_, i) => (
      // The track is always there; the filled part grows in once the card has
      // finished fading up, one segment after another.
      <div
        key={i}
        className="h-full w-full rounded-full bg-muted"
        style={{ flexBasis: '20%' }}
      >
        {i < level && (
          <div
            className="skill-segment h-full w-full rounded-full bg-primary"
            style={{ '--i': i } as React.CSSProperties}
          />
        )}
      </div>
    ))}
  </div>
);


export function SkillsSection({ skills }: SkillsSectionProps) {
  return (
    <section>
      <div className="flex flex-wrap gap-4 max-w-6xl mx-auto justify-start">
        {skills.map((skill) => (
          <Reveal key={skill.id} stagger={70} className="bg-card p-4 rounded-2xl shadow-sm border flex flex-col gap-3 basis-full sm:basis-[calc(50%-0.5rem)] md:basis-[calc(33.333%-0.666rem)] lg:basis-[calc(25%-0.75rem)]">
            <div className="flex items-center gap-4">
              <div className="relative w-12 h-12 flex-shrink-0">
                {skill.iconUrl && (
                  <Image
                    src={skill.iconUrl}
                    alt={`${skill.name} icon`}
                    fill
                    className="object-contain rounded-xl"
                    sizes="48px"
                  />
                )}
              </div>
              <div className="flex-grow">
                <h3 className="font-semibold text-lg">{skill.name}</h3>
                <p className="text-sm text-muted-foreground">{levelNames[skill.level]}</p>
              </div>
            </div>
            <SkillBar level={skill.level} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
