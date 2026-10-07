import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "../ui/button";

const testimonials = [
  {
    quote:
      "Jack revolutionised our Sprinklr templates — hugely improving workflow efficiency.",
    author: "Sally Parsons",
    role: "Production Lead",
  },
  {
    quote: "Always proactive, smart, and a pleasure to work with.",
    author: "Producers at T&Pm",
    role: "",
  },
];

export function TestimonialsSection() {
  return (
    <section className="bg-background/70 pb-24 sm:pb-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-headline text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Testimonials
          </h2>
        </div>
        <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-2">
          {testimonials.map((testimonial) => (
            <Card
              key={testimonial.author}
              className="flex flex-col rounded-2xl shadow-lg"
            >
              <CardContent className="flex-1 p-6">
                <blockquote className="text-lg italic text-foreground/90">
                  <p>“{testimonial.quote}”</p>
                </blockquote>
              </CardContent>
              <CardFooter className="p-6 pt-0">
                <cite className="text-base not-italic text-foreground/70">
                  — {testimonial.author}
                  {testimonial.role && `, ${testimonial.role}`}
                </cite>
              </CardFooter>
            </Card>
          ))}
        </div>
        <div className="mt-16 text-center">
          <Button asChild variant="link" className="text-lg text-primary">
            <Link href="/about#testimonials">
              Read more feedback <ArrowRight className="ml-2 size-5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
