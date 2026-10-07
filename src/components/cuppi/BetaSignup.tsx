'use client';

import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import React, { useState, useRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { BetaSignupInputSchema, SignupFormValues } from '@/lib/beta-signup-schema';
import Link from 'next/link';
import { useAnalytics } from '@/firebase';
import { logEvent } from 'firebase/analytics';

const features = [
  { id: "home_feed", label: "Home Feed" },
  { id: "pets_health", label: "Pets Health" },
  { id: "budgets", label: "Budgets" },
  { id: "birthdays", label: "Birthdays" },
  { id: "receipts_scanning", label: "Receipts scanning" },
  { id: "bin_day_reminders", label: "Bin Day reminders" },
];

export function BetaSignup() {
  const iconUrl = "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Ffooter%2FHomeOS-devIcon-iOS-Default-1024x1024%401x%20copy.webp?alt=media&token=82afd99c-a6db-4066-ab65-69289be9161f";
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const [isVerified, setIsVerified] = useState(false);
  const analytics = useAnalytics();
  
  // This should point to your deployed Cloud Function URL
  const functionUrl = 'https://submitbetasignup-m5o37pqq5a-uc.a.run.app';

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(BetaSignupInputSchema),
    defaultValues: {
      email: '',
      interestedFeatures: [],
    },
  });

  const onSubmit = async (data: SignupFormValues) => {
    const gRecaptchaToken = recaptchaRef.current?.getValue();
    if (!gRecaptchaToken) {
        toast({
            variant: "destructive",
            title: "Verification failed",
            description: "Please complete the CAPTCHA before submitting.",
        });
        return;
    }

    try {
      const response = await fetch(functionUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, gRecaptchaToken }),
      });

      const result = await response.json();

      if (result.success) {
        if (analytics) {
          logEvent(analytics, 'sign_up', { method: 'beta_form' });
        }
        toast({
          title: result.message,
          description: "Thank you for signing up. We'll be in touch soon.",
        });
        setIsDialogOpen(false);
        form.reset();
        recaptchaRef.current?.reset();
        setIsVerified(false);
      } else {
        toast({
          variant: 'destructive',
          title: 'Something went wrong',
          description: result.message || "An unknown error occurred.",
        });
        recaptchaRef.current?.reset();
        setIsVerified(false);
      }
    } catch (error: any) {
      console.error("Failed to submit beta signup:", error);
      toast({
        variant: 'destructive',
        title: 'Something went wrong',
        description: 'Could not contact the server. Please try again.',
      });
      recaptchaRef.current?.reset();
      setIsVerified(false);
    }
  };

  return (
    <section className="bg-accent text-accent-foreground w-full max-w-6xl mt-8 rounded-[2rem]">
      <div className="px-4 py-8 md:py-4 flex flex-col md:flex-row items-center justify-center text-center md:text-left">
          <Image
            src={iconUrl}
            alt="Cuppi App Icon"
            width={75}
            height={75}
            className="rounded-[16.5px] mb-3 md:mb-0 md:mr-6"
          />
        <div className="flex-1">
            <p className="font-serif text-2xl font-bold [text-shadow:0_1px_2px_rgba(0,0,0,0.2)]">Early Access</p>
            <p className="text-lg leading-snug [text-shadow:0_1px_2px_rgba(0,0,0,0.2)]">
                Be part of building the most private Home app for the UK.
            </p>
        </div>
        <div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                form.reset();
                recaptchaRef.current?.reset();
                setIsVerified(false);
              }
            }}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-white text-accent transition-transform hover:scale-105 hover:bg-white/90 rounded-2xl mt-5 md:mt-0">
                  Gain early access
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-[3rem] max-h-[90dvh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Join the Beta</DialogTitle>
                <DialogDescription>
                  Get early access and help shape the future of Cuppi.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input placeholder="you@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="interestedFeatures"
                    render={() => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel>What interests you most?</FormLabel>
                          <FormDescription>
                            Select all that apply.
                          </FormDescription>
                        </div>
                        <div className="space-y-2">
                          {features.map((item) => (
                            <FormField
                              key={item.id}
                              control={form.control}
                              name="interestedFeatures"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={item.id}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(item.label)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...(field.value || []), item.label])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== item.label
                                                )
                                              )
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal text-base">
                                      {item.label}
                                    </FormLabel>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <ReCAPTCHA
                    ref={recaptchaRef}
                    sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
                    onChange={() => setIsVerified(true)}
                    onExpired={() => setIsVerified(false)}
                  />
                  <p className="px-2 text-xs text-muted-foreground text-center">
                    By submitting your details, you agree to our{' '}
                    <Link href="/terms" target="_blank" className="underline hover:text-primary">
                      Terms and Conditions
                    </Link>
                    ,{' '}
                    <Link href="/beta-program-policy" target="_blank" className="underline hover:text-primary">
                        Beta Program Policy
                    </Link>
                    {' '}and{' '}
                    <Link href="/privacy" target="_blank" className="underline hover:text-primary">
                      Privacy Policy
                    </Link>
                    . We would love to welcome everyone into the fold, but please keep in mind that
                    joining our Beta Testing programme doesn’t automatically guarantee a spot, and an
                    invitation may not be sent immediately. We value your privacy and believe in
                    keeping a tidy house; therefore, your information will be automatically deleted one
                    year after you sign up.
                  </p>
                  <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                      <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                      <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={form.formState.isSubmitting || !isVerified}>Submit</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </section>
  );
}
