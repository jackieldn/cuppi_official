import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export function AboutSection() {
  const aboutImage = PlaceHolderImages.find((img) => img.id === "about-me");

  return (
    <section className="py-24 sm:py-32">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div className="order-last lg:order-first">
            <h2 className="font-headline text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              About me
            </h2>
            <p className="mt-6 text-lg leading-8 text-foreground/80">
              A Hungarian-born designer in London mixing motion, illustration,
              tech, and bad jokes. Currently at T&Pm/WPP working on NatWest Group
              projects. Obsessed with: dinosaurs, Japanese, coding silly tools,
              and making things unnecessarily fun.
            </p>
            <div className="mt-10">
              <Button asChild size="lg" variant="outline" className="transition-transform hover:scale-105">
                <Link href="#">More about me</Link>
              </Button>
            </div>
          </div>
          <div className="mx-auto w-full max-w-sm lg:max-w-none">
            <div className="relative aspect-square overflow-hidden rounded-full shadow-2xl">
              {aboutImage && (
                <Image
                  src={aboutImage.imageUrl}
                  alt={aboutImage.description}
                  fill
                  className="object-cover"
                  data-ai-hint={aboutImage.imageHint}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
