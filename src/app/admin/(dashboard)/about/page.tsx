'use client';

import { ProfileAdmin } from '@/components/admin/about/profile-admin';
import { SkillsAdmin } from '@/components/admin/about/skills-admin';
import { ExperienceAdmin } from '@/components/admin/about/experience-admin';
import { FactsAdmin } from '@/components/admin/about/facts-admin';
import { TestimonialsAdmin } from '@/components/admin/about/testimonials-admin';

export default function AboutAdminPage() {
  return (
    <div className="container mx-auto px-4 py-12 space-y-12">
      <h1 className="font-headline text-4xl font-bold">Manage About Page</h1>
      
      <section>
        <h2 className="font-headline text-2xl font-bold mb-4">Profile Section</h2>
        <ProfileAdmin />
      </section>

      <section>
        <h2 className="font-headline text-2xl font-bold mb-4">Technical Skills</h2>
        <SkillsAdmin />
      </section>

      <section>
        <h2 className="font-headline text-2xl font-bold mb-4">Work Experience</h2>
        <ExperienceAdmin />
      </section>

      <section>
        <h2 className="font-headline text-2xl font-bold mb-4">Testimonials</h2>
        <TestimonialsAdmin />
      </section>

      <section>
        <h2 className="font-headline text-2xl font-bold mb-4">Facts Section</h2>
        <FactsAdmin />
      </section>
    </div>
  );
}
