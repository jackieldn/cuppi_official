'use client';

import Image from 'next/image';
import { WorkExperience } from '@/lib/about-types';
import { useRef, useState } from 'react';
import { useIsomorphicLayoutEffect } from '@/lib/use-flip';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';
import { Reveal } from '../ui/reveal';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface ExperienceSectionProps {
  experiences: WorkExperience[];
}

// A description taller than this many lines is folded, with a Show more / Show less toggle.
const DESCRIPTION_MAX_LINES = 6;

/**
 * The description, folded to DESCRIPTION_MAX_LINES lines when it is longer than that.
 * Short ones render exactly as before, with no toggle. The height is animated (so it
 * can't use CSS line-clamp), measured from the text itself and re-measured whenever the
 * width changes and the lines re-wrap.
 */
function ExperienceDescription({ text, id }: { text: string; id: string }) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [heights, setHeights] = useState<{ full: number; folded: number } | null>(null);

  useIsomorphicLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const measure = () => {
      const style = getComputedStyle(el);
      // line-height can come back as "normal"; fall back to a typical ratio.
      const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5;
      const folded = lineHeight * DESCRIPTION_MAX_LINES;
      const full = el.offsetHeight;
      // Half a line of slack, so a text that only just fits is not folded for a few pixels.
      setHeights(full > folded + lineHeight / 2 ? { full, folded } : null);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);

  const isFoldable = heights !== null;

  return (
    <div>
      <div
        id={id}
        className="relative overflow-hidden transition-[max-height] duration-500 ease-in-out motion-reduce:transition-none"
        style={isFoldable ? { maxHeight: isOpen ? heights.full : heights.folded } : undefined}
      >
        <p ref={textRef} className="text-foreground/80 whitespace-pre-line">{text}</p>
        {/* Fades the last folded line into the card, so the cut doesn't look accidental. */}
        {isFoldable && (
          <div
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card to-transparent transition-opacity duration-500 motion-reduce:transition-none',
              isOpen ? 'opacity-0' : 'opacity-100'
            )}
          />
        )}
      </div>
      {isFoldable && (
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={id}
          onClick={() => setIsOpen((open) => !open)}
          className="text-primary transition-colors hover:text-accent inline-flex items-center gap-1 mt-3 text-sm"
        >
          <span>{isOpen ? 'Show less' : 'Show more'}</span>
          <ChevronDown className={cn('h-4 w-4 transition-transform duration-300', isOpen && 'rotate-180')} />
        </button>
      )}
    </div>
  );
}

const ExperienceItem = ({ exp, isLastItem }: { exp: WorkExperience, isLastItem: boolean }) => (
    // Items that scroll into view together fade up one after another.
    <Reveal stagger={200} className="relative pl-16 pb-12">
        {/* Timeline Dot */}
        <div className="absolute left-6 -translate-x-1/2 w-4 h-4 bg-primary rounded-full ring-8 ring-background z-10" />

        {/* Timeline Line: Only render if it's not the last item */}
        {!isLastItem && (
            <div className="absolute left-6 top-1 w-0.5 h-full bg-border -translate-x-1/2" />
        )}
        
        <div className="grid md:grid-cols-3 gap-8 items-start">
            <div className="md:col-span-1">
            <p className="font-semibold text-primary">{exp.startDate} – {exp.isCurrent ? 'Present' : exp.endDate}</p>
            <div className="flex items-start gap-4 mt-2">
                {exp.logoUrl && (
                <div className="relative w-12 h-12 flex-shrink-0 mt-1">
                    <Image
                    src={exp.logoUrl}
                    alt={`${exp.companyName} logo`}
                    fill
                    className="object-contain rounded-xl"
                    sizes="48px"
                    />
                </div>
                )}
                <div>
                <h3 className="font-headline text-xl font-bold">{exp.companyName}</h3>
                <p className="text-muted-foreground">{exp.position}</p>
                </div>
            </div>
            </div>
            <div className="md:col-span-2">
            <div className="bg-card p-6 rounded-2xl border shadow-sm">
                {exp.description && <ExperienceDescription text={exp.description} id={`experience-description-${exp.id}`} />}
            </div>
            </div>
        </div>
    </Reveal>
);


export function ExperienceSection({ experiences }: ExperienceSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!experiences || experiences.length === 0) {
    return null;
  }
  
  const visibleExperiences = experiences.slice(0, 2);
  const hiddenExperiences = experiences.slice(2);

  return (
    <section className="max-w-3xl mx-auto">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="relative">
          {/* Always render visible experiences */}
          {visibleExperiences.map((exp, index) => (
            <ExperienceItem 
              key={exp.id} 
              exp={exp} 
              isLastItem={!isOpen && index === visibleExperiences.length - 1 && hiddenExperiences.length > 0} 
            />
          ))}

          {/* Render hidden experiences inside the animated content area */}
          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
            {hiddenExperiences.map((exp, index) => (
              <ExperienceItem 
                key={exp.id} 
                exp={exp} 
                isLastItem={index === hiddenExperiences.length - 1}
              />
            ))}
          </CollapsibleContent>
        </div>

        {/* The trigger is outside the content that animates */}
        {hiddenExperiences.length > 0 && (
          <div className="relative pl-16">
              <Separator />
              <CollapsibleTrigger asChild>
                <button className="text-primary transition-colors hover:text-accent group inline-flex items-center gap-1 pt-4">
                  <span>{isOpen ? 'Show less' : 'Show more'}</span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform duration-300", isOpen && "rotate-180")} />
                </button>
              </CollapsibleTrigger>
          </div>
        )}
      </Collapsible>
    </section>
  );
}