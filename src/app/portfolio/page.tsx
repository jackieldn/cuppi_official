'use client';
import { FeaturedWorkSection } from "@/components/landing/featured-work-section";
import { HeroSection } from "@/components/landing/hero-section";
import { ShowreelSection } from "@/components/landing/showreel-section";
import { TestimonialsSection } from "@/components/landing/testimonials-section";

export default function PortfolioPage() {
  return (
    <div className="relative flex flex-col">
      <main className="flex-1">
        <HeroSection />
        <FeaturedWorkSection />
        <ShowreelSection />
        <TestimonialsSection />
      </main>
    </div>
  );
}
