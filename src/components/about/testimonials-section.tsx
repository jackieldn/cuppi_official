'use client';

import { useState } from 'react';
import { Testimonial } from '@/lib/about-types';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Separator } from '../ui/separator';
import { format } from 'date-fns';

interface TestimonialsSectionProps {
  testimonials: Testimonial[];
}

const PREVIEW_LENGTH = 250; // Number of characters to show in the preview

const TestimonialItem = ({ testimonial }: { testimonial: Testimonial }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isLong = testimonial.text.length > PREVIEW_LENGTH;
  const previewText = isLong ? `${testimonial.text.substring(0, PREVIEW_LENGTH)}...` : testimonial.text;
  const remainingText = isLong ? testimonial.text.substring(PREVIEW_LENGTH) : '';

  let formattedDate = '';
  if (testimonial.date) {
    try {
      // The date is a string 'YYYY-MM-DD', but JS Date constructor needs to account for timezones.
      // Adding time avoids it being interpreted as the previous day in some timezones.
      formattedDate = format(new Date(`${testimonial.date}T12:00:00`), "MMMM yyyy");
    } catch (e) {
      console.error("Invalid date format for testimonial:", testimonial.date);
      // If date is invalid, don't display anything
    }
  }


  return (
    <Card className="flex flex-col rounded-2xl shadow-lg">
      <CardContent className="flex-1 p-6">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <blockquote className="text-lg italic text-foreground/90 whitespace-pre-line">
             <span>“{previewText}</span>
              <CollapsibleContent className="inline">
                <span>{remainingText}</span>
              </CollapsibleContent>
              <span>”</span>
          </blockquote>
          {isLong && (
            <CollapsibleTrigger asChild>
              <button className="text-primary hover:underline group inline-flex items-center gap-1 mt-2 text-sm">
                <span>{isOpen ? 'Show less' : 'Show more'}</span>
                <ChevronDown className={cn("h-4 w-4 transition-transform duration-300", isOpen && "rotate-180")} />
              </button>
            </CollapsibleTrigger>
          )}
        </Collapsible>
      </CardContent>
      <CardFooter className="p-6 pt-0 flex justify-between items-end">
        <div className="text-base not-italic text-foreground/70">
          <p className="font-semibold">{testimonial.name}</p>
          <p>{testimonial.role}{testimonial.role && testimonial.company ? ', ' : ''}{testimonial.company}</p>
        </div>
        {formattedDate && (
            <time className="text-sm text-muted-foreground not-italic">
                {formattedDate}
            </time>
        )}
      </CardFooter>
    </Card>
  );
};


export function TestimonialsSection({ testimonials }: TestimonialsSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!testimonials || testimonials.length === 0) {
    return null;
  }

  const visibleTestimonials = testimonials.slice(0, 4);
  const hiddenTestimonials = testimonials.slice(4);

  return (
    <section id="testimonials" className="scroll-mt-20">
      <Separator className="my-16" />
      <div className="container mx-auto px-4 text-center">
        <h2 className="font-headline text-5xl font-bold tracking-tight text-foreground sm:text-6xl mb-16">
          Testimonials
        </h2>
      </div>
      <div className="max-w-6xl mx-auto">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {visibleTestimonials.map((testimonial) => (
              <TestimonialItem key={testimonial.id} testimonial={testimonial} />
            ))}
          </div>
          
          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
              {hiddenTestimonials.map((testimonial) => (
                <TestimonialItem key={testimonial.id} testimonial={testimonial} />
              ))}
            </div>
          </CollapsibleContent>

          {hiddenTestimonials.length > 0 && (
            <div className="mt-8 text-center">
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="group">
                  <span>{isOpen ? 'Show less' : 'Show more'}</span>
                  <ChevronDown className={cn("ml-2 h-4 w-4 transition-transform duration-300", isOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
            </div>
          )}
        </Collapsible>
      </div>
    </section>
  );
}
