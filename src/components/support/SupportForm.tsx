'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { sendSupportEmail } from '@/app/actions/send-support-email';
import React, { useState, useRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

const supportFormSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  email: z.string().email('Invalid email address.'),
  category: z.string().min(1, 'Please select a category.'),
  message: z.string().min(10, 'Message must be at least 10 characters.'),
});

type SupportFormValues = z.infer<typeof supportFormSchema>;

const supportCategories = [
  'General Inquiry',
  'Bug Report',
  'Feature Request',
  'Account Issue',
  'Billing',
  'Other',
];

export function SupportForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const [isVerified, setIsVerified] = useState(false);

  const form = useForm<SupportFormValues>({
    resolver: zodResolver(supportFormSchema),
    defaultValues: {
      name: '',
      email: '',
      category: '',
      message: '',
    },
  });

  async function onSubmit(data: SupportFormValues) {
    setIsSubmitting(true);
    
    const token = recaptchaRef.current?.getValue();
    if (!token) {
        toast({
            variant: "destructive",
            title: "Verification failed",
            description: "Please complete the CAPTCHA before submitting.",
        });
        setIsSubmitting(false);
        return;
    }

    const result = await sendSupportEmail(data, token);
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: 'Message Sent!',
        description: "We've received your message and will get back to you shortly.",
      });
      form.reset();
      recaptchaRef.current?.reset();
      setIsVerified(false);
    } else {
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: result.message || 'There was a problem sending your message.',
      });
      recaptchaRef.current?.reset();
      setIsVerified(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your Name</FormLabel>
                <FormControl>
                  <Input placeholder="Jane Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your Email</FormLabel>
                <FormControl>
                  <Input placeholder="jane.doe@example.com" {...field} />
                </FormControl>
                 <FormDescription>
                    This can be your Cuppi or Apple ID email address.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a support category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {supportCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell us how we can help..."
                  className="min-h-[150px]"
                  {...field}
                />
              </FormControl>
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
        <Button type="submit" disabled={isSubmitting || !isVerified} className="w-full">
          {isSubmitting ? 'Sending...' : 'Send Message'}
        </Button>
      </form>
    </Form>
  );
}
