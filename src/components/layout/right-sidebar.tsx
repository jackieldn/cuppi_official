'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Bot, ChevronUp, Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Textarea } from '@/components/ui/textarea';

export function RightSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const aboutImage = PlaceHolderImages.find((img) => img.id === 'about-me');

  const isExpandedHorizontally = isOpen || isHovered;

  return (
    <div
      className="fixed top-4 right-4 z-40"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="space-y-2"
      >
        <div className={cn(
          "bg-card/80 backdrop-blur-lg border rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ease-in-out",
          isExpandedHorizontally ? "w-80" : "w-14"
        )}>
          <CollapsibleTrigger asChild>
            <button
              aria-label={isOpen ? 'Collapse widgets' : 'Expand widgets'}
              className={cn(
                'w-full py-2 px-4 transition-all hover:bg-accent/80 flex items-center justify-between font-headline text-lg'
              )}
            >
              <div className="flex items-center gap-2">
                <Sparkles
                  className={cn(
                    'size-5 transition-all duration-300',
                    isExpandedHorizontally ? 'rotate-0' : 'rotate-180 scale-125'
                  )}
                />
                <span
                  className={cn(
                    'transition-opacity duration-200 whitespace-nowrap',
                    isExpandedHorizontally ? 'opacity-100' : 'opacity-0'
                  )}
                >
                  Widgets
                </span>
              </div>
              <ChevronUp
                className={cn('size-5 transition-transform', {
                  'rotate-180': !isOpen,
                })}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
            <div className="p-6 pt-4 space-y-8 w-80">
              {/* VCard */}
              <div className="space-y-4 text-center">
                {aboutImage && (
                  <div className="relative mx-auto w-24 h-24">
                    <Image
                      src={aboutImage.imageUrl}
                      alt={aboutImage.description}
                      fill
                      className="object-cover rounded-[28px] shadow-md"
                      sizes="96px"
                      data-ai-hint={aboutImage.imageHint}
                    />
                  </div>
                )}
                <div>
                  <h3 className="font-headline text-xl font-bold">Jack</h3>
                  <p className="text-sm text-foreground/70">
                    Senior Motion GFX Designer
                  </p>
                </div>
                <div className="flex justify-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="#">About</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="#">Contact</Link>
                  </Button>
                </div>
              </div>

              {/* Showreel Creator */}
              <div className="space-y-3 text-center rounded-lg border p-4">
                <Button className="w-full">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Create your showreel
                </Button>
              </div>

              {/* Chat Widget */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Bot className="size-5" />
                  <h3 className="font-headline text-lg font-semibold">
                    Talk to my bot
                  </h3>
                </div>
                <div className="h-48 bg-background/50 rounded-md p-2 flex flex-col justify-end">
                  <p className="text-xs text-foreground/60 text-center p-4">
                    This is a placeholder for the chat bot. I'll set this up
                    later!
                  </p>
                </div>
                <div className="relative">
                  <Textarea
                    placeholder="Ask me anything..."
                    className="pr-10"
                    rows={1}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                    variant="ghost"
                  >
                    <ChevronUp className="h-4 w-4 rotate-90" />
                  </Button>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}
