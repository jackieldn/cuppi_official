
import { CuppiHeader } from '@/components/cuppi/header';
import { CuppiFooter } from '@/components/cuppi/footer';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const features = {
  general: [
    { feature: 'Monthly Price', starter: 'Free', pro: '£5.99' },
    { feature: 'Annual Price', starter: 'Free', pro: '£59.90 (2 months free)' },
    { feature: 'Support', starter: 'Standard', pro: 'Priority' },
  ],
  household: [
    { feature: 'Home Feed posts', starter: '1 post/day', pro: 'Unlimited' },
    { feature: 'Invite Home Members', starter: '1 invite (Adult or Child)', pro: '✅' },
    { feature: 'Number of Adults', starter: '1, using the invite', pro: '4 (including owner)' },
    { feature: 'Number of Children', starter: '1, using the invite', pro: '4' },
    { feature: 'Birthday Profiles', starter: '10', pro: '50' },
    { feature: 'Bin Days', starter: '1', pro: '5' },
    { feature: 'Receipts', starter: '10 receipts /month', pro: 'Unlimited' },
  ],
  pets: [
    { feature: 'Pet Profiles', starter: '1', pro: '5' },
    { feature: 'Pet medications', starter: '2 active', pro: 'Unlimited' },
    { feature: 'Pet Vaccinations', starter: '1 active', pro: 'Unlimited' },
    { feature: 'Pet Appointments', starter: '2 active', pro: 'Unlimited' },
    { feature: 'Pet Healing Tracker', starter: '1 active (1 entry/day)', pro: 'Unlimited' },
    { feature: 'Vet Details', starter: '✅', pro: '✅' },
    { feature: 'Pet Insurance Details', starter: '✅', pro: '✅' },
    { feature: 'Pet Weight Tracker', starter: '1 entry /month', pro: 'Unlimited' },
  ],
  budget: [
    { feature: 'Budget', starter: '✅', pro: '✅' },
    { feature: 'Budget Payday', starter: '✅', pro: '✅' },
    { feature: 'Income and Remaining Balance', starter: '✅', pro: '✅' },
  ],
  security: [
    { feature: 'App customisations', starter: '✅', pro: '✅' },
    { feature: 'Home Companion (non-AI)', starter: '✅', pro: '✅' },
    { feature: 'Biometric Login', starter: '✅', pro: '✅' },
    { feature: '2-step Verification', starter: '✅', pro: '✅' },
    { feature: 'Account Activity', starter: '✅', pro: '✅' },
  ]
};

const featureCategories = [
    { title: "Household", features: features.household },
    { title: "Pets", features: features.pets },
    { title: "Budget", features: features.budget },
    { title: "Security & More", features: features.security },
];

const renderFeatureValue = (value: string) => {
    if (value === '✅') {
        return <Check className="h-5 w-5 text-green-500" />;
    }
    if (value === '❌') {
        return <X className="h-5 w-5 text-red-500" />;
    }
    return <p>{value}</p>;
};

export default function PricingPage() {
  return (
    <div className="bg-background text-foreground flex flex-col min-h-screen">
      <CuppiHeader />
      <main className="w-full flex flex-col items-center p-4 pt-8 flex-grow">
        <div className="w-full max-w-6xl mx-auto container px-4 pb-24 sm:pb-32">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h1 className="font-headline text-4xl sm:text-5xl font-bold">Cuppi Plans</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Start with our generous free plan and upgrade when you need more power. Simple, transparent, and built for you.
            </p>
          </div>

          <div className="mt-16 space-y-8 max-w-5xl mx-auto">
            {/* Starter Plan Card */}
            <div className="border rounded-2xl p-8 flex flex-col text-center bg-card">
              <h2 className="text-2xl font-bold font-headline">Starter</h2>
              <p className="mt-2 text-muted-foreground h-12">Start completely free with Cuppi with a generous starter plan.</p>
              <p className="mt-6 text-4xl font-bold">Free</p>
              <p className="text-sm text-muted-foreground">Forever</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Pro Monthly Plan Card */}
                <div className="border rounded-2xl p-8 flex flex-col text-center bg-card">
                  <h2 className="text-2xl font-bold font-headline">Pro Monthly</h2>
                   <p className="mt-2 text-muted-foreground h-12">Unlock the full power of Cuppi, month by month.</p>
                  <p className="mt-6 text-4xl font-bold">£5.99</p>
                  <p className="text-sm text-muted-foreground">per month</p>
                </div>
                
                {/* Pro Annual Plan Card */}
                <div className="border rounded-2xl p-8 flex flex-col relative text-center bg-card">
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground">Best Value</Badge>
                  <h2 className="text-2xl font-bold font-headline">Pro Annual</h2>
                  <p className="mt-2 text-muted-foreground h-12">Get 2 months free when you pay for the year.</p>
                  <p className="mt-6 text-4xl font-bold">£59.90</p>
                  <p className="text-sm text-muted-foreground">per year</p>
                </div>
            </div>
          </div>
          
          <div className="mt-20">
            <h3 className="font-headline text-3xl font-bold mb-8 text-center">Feature Comparison</h3>
            {featureCategories.map(category => (
                <div key={category.title} className="mb-12">
                    <h4 className="font-headline text-2xl font-bold mb-6 text-center">{category.title}</h4>
                    <div className="max-w-4xl mx-auto border rounded-lg overflow-hidden">
                        <div className="grid grid-cols-3 items-center bg-muted font-semibold">
                            <div className="p-3 text-right"></div>
                            <div className="p-3 text-center border-l">Starter</div>
                            <div className="p-3 text-center border-l">Pro</div>
                        </div>
                        {category.features.map((feature, index) => (
                           <div key={feature.feature} className={cn("grid grid-cols-3 items-stretch", index % 2 === 0 ? "bg-card" : "bg-transparent")}>
                             <p className="p-3 text-sm text-muted-foreground text-right self-center">{feature.feature}</p>
                             <div className="flex items-center justify-center p-3 text-center text-sm font-medium border-l">{renderFeatureValue(feature.starter)}</div>
                             <div className="flex items-center justify-center p-3 text-center text-sm font-bold text-accent border-l">{renderFeatureValue(feature.pro)}</div>
                           </div>
                        ))}
                    </div>
                </div>
            ))}
          </div>

        </div>
      </main>
      <CuppiFooter />
    </div>
  );
}
