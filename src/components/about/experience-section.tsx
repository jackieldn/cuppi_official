'use client';

import Image from 'next/image';
import { WorkExperience } from '@/lib/about-types';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface ExperienceSectionProps {
  experiences: WorkExperience[];
}

const ExperienceItem = ({ exp, isLastItem }: { exp: WorkExperience, isLastItem: boolean }) => (
    <div className="relative pl-16 pb-12">
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
                {exp.description && <p className="text-foreground/80 whitespace-pre-line">{exp.description}</p>}
            </div>
            </div>
        </div>
    </div>
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
                <button className="text-primary hover:underline group inline-flex items-center gap-1 pt-4">
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