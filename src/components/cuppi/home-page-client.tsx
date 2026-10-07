'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Carousel, CarouselApi, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

const welcomeFeatures = [
  {
    imageUrl: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Fwelcome_home%2Fhomeos-sheet-2.webp?alt=media&token=d5c474e4-adce-44c7-9514-018fd06891ba",
    description: "Your Home's social media. The focus is on you and your household. No advertisements, no tracking, just bringing calm into the everyday chaos.",
    title: "A New Kind of Feed"
  },
  {
    imageUrl: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Fwelcome_home%2Fhomeos-sheet-13.webp?alt=media&token=5751bbf8-6ce8-4bae-abc8-d7dd8d05bdd3",
    title: "Memories, secured",
    description: "Your posts and messages are private and no one else can have a peek at your baking and hiking moments outside your Household. Keeping your precious home life truly special."
  },
  {
    imageUrl: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Fwelcome_home%2Fhomeos-sheet-7.webp?alt=media&token=bafb10fe-b592-466d-ad41-766a66467042",
    description: "Smart posts for maximum help. We are introducing new ways to interact on your Home Feed. From Month Ahead overviews to your Pet's medication, you will find everything important here.",
    title: "Smart Posts"
  },
  {
    imageUrl: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Fwelcome_home%2Fhomeos-sheet-9.webp?alt=media&token=7f52540a-acc1-4d49-b5ee-a473735dff67",
    description: "We are adding new features weekly to expand our tools and refine their usability. Have everything in one place from tracking your Pet's annual vaccinations to organising the next Birthday party.",
    title: "Expanding Features"
  }
];

const birthdayFeatures = [
    {
        imageUrl: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Fbirthday_section%2Fhomeos-sheet-20.webp?alt=media&token=da10a8c0-51c3-4b2d-a258-6fa95d9014a6",
        title: "From a ping to a grand celebration",
        description: "Trade the last-minute panic for a bit of home baking. With proactive notifications, you’ll have plenty of time to find the perfect gift or prep a birthday surprise without the usual rush of a frantic shopping spree."
    },
    {
        imageUrl: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Fbirthday_section%2Fhomeos-sheet-21.webp?alt=media&token=d68b7241-7fb2-4df9-bebf-64456c20e34a",
        title: "Save once, remember forever",
        description: "Keep all your loved ones’ birthdays neatly organised in one secure place. At a glance, you can see exactly when the big day is arriving, what age they’ll be turning, and the milestone year you are celebrating together."
    },
    {
        imageUrl: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Fbirthday_section%2Fhomeos-sheet-19.webp?alt=media&token=08d6272b-03b8-4bc7-8ba1-75b3b7950a34",
        title: "Gift ideas that actually bring joy",
        description: "We all know the struggle of trying to think of the perfect present on the spot. Our simple gift lists allow you to jot down those special ideas the moment they are mentioned, so you can surprise them with exactly what they wanted months ago."
    }
];

const binDayFeatures = [
    {
        imageUrl: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Fbinday_section%2Fhomeos-sheet-22.webp?alt=media&token=024329ee-8039-4668-9e25-07675afdb9a9",
        title: "Confusing? Not anymore.",
        description: "Create your Bin Day profiles, select which materials are being collected, and tell us how frequently the truck visits. Once it's set, you can relax; we’ll send you a gentle notification at 6.00 pm the evening before, giving you plenty of time to get the right bin to the kerb."
    },
    {
        imageUrl: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Fbinday_section%2Fhomeos-sheet-23.webp?alt=media&token=ffc040bf-195a-404d-bbd8-21f5cbe91806",
        title: "Council database (Preview)",
        description: "We are on a mission to map out every council website in the UK and put them into one simple search bar for you. Find your local council and get the latest, most accurate information on your collections. We’ll even notify you if we think your schedule might need a quick check for updates."
    }
];

const petFeatures = [
    {
        imageUrl: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Fpets_section%2Fhomeos-sheet-5.webp?alt=media&token=9dee748b-3590-4358-b0a9-ab5e7ecf0b60",
        title: "A Vet-grade app in your hand",
        description: "Create Pet profiles and be up-to-date with all their needs. Save your vet and insurance information, track healing, weight and be vaccination-ready with reminders."
    },
    {
        imageUrl: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Fpets_section%2Fhomeos-sheet-6.webp?alt=media&token=f45a3d6b-c66c-43e9-ab93-85824f181416",
        title: "Pet health, simplified",
        description: "If your Pet is senior and you need to be on top of their Medications or you just want to track your little one’s Weight and growth, we have all kinds of tools for you."
    },
    {
        imageUrl: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Fpets_section%2Fhomeos-sheet-14.webp?alt=media&token=5efa8a03-eaad-43b9-866d-f166c3d61c05",
        title: "Appointments, never missed",
        description: "Just like in a calendar, quickly record your next visit, select how early you want to get reminded and we will do the rest."
    },
    {
        imageUrl: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Fpets_section%2Fhomeos-sheet-15.webp?alt=media&token=fcf03c7c-d7c9-4448-b93d-50d4ea74d097",
        title: "Medications, never missed either",
        description: "We know how important it is to keep track of our Pet’s medications. Set up daily, weekly, monthly or annual reminders and have a history of administered meds."
    }
];

const receiptFeatures = [
    {
        imageUrl: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Freceipts_section%2Fhomeos-sheet-26.webp?alt=media&token=56a3a33e-817d-42be-b9f2-1e43b82ee138",
        title: "Simple shopping tracking",
        description: `Set your monthly Food & Household budget and see exactly how much is left at a glance. You can save your stores, track receipt totals, and even store barcodes to make those occasional returns much less of a headache.`
    },
    {
        imageUrl: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Freceipts_section%2Fhomeos-sheet-25.webp?alt=media&token=92114231-7800-4a72-8e86-04904c8e6171",
        title: "For the detail-oriented",
        description: "If you love a deep dive into your data, Cuppi allows you to log every individual item from your receipt. This gives you a complete category overview, so you can see exactly where your money is going - whether it's the weekly essentials or those cheeky weekend treats."
    },
    {
        imageUrl: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Freceipts_section%2Fhomeos-sheet-24.webp?alt=media&token=0ea80b49-079a-4cfa-b106-011a75d5b771",
        title: "Effortless scanning (Early Access)",
        description: `Try our experimental receipt scanner and take the sting out of manual typing. We are actively teaching our software to recognise a wide variety of UK formats, so you can digitise your paper trail in seconds.`
    }
];

const budgetFeatures = [
    {
        imageUrl: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Fbudget_section%2Fhomeos-sheet-18.webp?alt=media&token=1e05341f-936e-4954-8d5d-75bdcca03fe7",
        title: "See the whole picture",
        description: "Gain a clear view of your financial home. Track your income and paydays alongside every household expense—from utilities and subscriptions to the weekly grocery run. You can even split bills with family members, ensuring everyone knows their fair share without the awkward conversations."
    },
    {
        imageUrl: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Fbudget_section%2Fhomeos-sheet-17.webp?alt=media&token=206e0a06-1c92-44a2-bd9e-8dee9d2e2336",
        title: "Clear, helpful insights",
        description: "Understand your spending at a glance. Our clean graphs and simple category breakdowns help you see exactly where your money is going, giving you the confidence to make better financial decisions for your home."
    },
    {
        imageUrl: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Fbudget_section%2Fhomeos-sheet-16.webp?alt=media&token=269ef8fa-f642-4ca6-9c45-6fe3c06b14b1",
        title: "The 15-Minute Budget Builder",
        description: "Getting started is the hardest part, so we’ve done the heavy lifting for you. Our Budget Builder gets you up and running in less than 15 minutes. We’ll suggest essential categories (like Housing, Utilities, and Pets) and common items (such as Council Tax, Rent, or your TV Licence), so you only need to tinker with the numbers to make it yours."
    }
]

export function CuppiHomePage({ children }: { children: React.ReactNode }) {
  const heroImageUrl = "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fheader_landing%2FHomeOS_M001_banner-medium_001.webp?alt=media&token=86e6c60f-d971-4bc5-a699-a1ea147daaba";
  const personalisationImageUrl = "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Fwelcome_home%2Fhomeos-sheet-12.webp?alt=media&token=9cf0d557-76fa-4a90-bed0-de3551604e57";
  const securityImageUrl = "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Fsecurity_section%2Fhomeos-sheet-3.webp?alt=media&token=a3f16bcb-63f5-4ff4-b0e9-ffcdce741ba6";
  const valuesImageUrl = "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Fsecurity_section%2FHomeOS-v2-security.webp?alt=media&token=d92f8071-731c-4db4-8763-a2c7ac3d15d0";

  const [isLoaded, setIsLoaded] = useState(false);
  const [welcomeApi, setWelcomeApi] = useState<CarouselApi>();
  const [birthdaysApi, setBirthdaysApi] = useState<CarouselApi>();
  const [binDayApi, setBinDayApi] = useState<CarouselApi>();
  const [petsApi, setPetsApi] = useState<CarouselApi>();
  const [receiptsApi, setReceiptsApi] = useState<CarouselApi>();
  const [budgetApi, setBudgetApi] = useState<CarouselApi>();
  
  useEffect(() => {
    // Using a short timeout to ensure the animation starts after the initial paint.
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);
  

  return (
    <>
      <section className="w-full max-w-6xl">
        <div className="relative w-full overflow-hidden rounded-[2rem] aspect-[1.5/2] md:aspect-[16/9]">
          <div className={cn("absolute inset-0 opacity-0", isLoaded && "animate-fade-in-up")}>
              <Image
                src={heroImageUrl}
                alt="A calming image showing a preview of the Cuppi app interface on a phone."
                fill
                sizes="1000vw"
                priority
                className={cn(
                  "object-cover transition-transform ease-out",
                  "duration-4000",
                  isLoaded ? "scale-150 md:scale-130" : "scale-[1.45] md:scale-[1.25]",
                  "translate-x-[-80px] md:translate-x-[100px] md:-translate-y-[50px]"
                )}
              />
          </div>
          <div className="absolute inset-0 flex items-center justify-center text-center md:text-left bg-black/20">
            <div className="relative text-white text-center md:text-center bottom-[60px] md:bottom-auto md:right-[200px]">
              
              <h1 className="font-sf-pro text-xl md:text-2xl font-normal tracking-wide opacity-0 animate-fade-in-right [text-shadow:0_2px_8px_rgba(0,0,0,0.6)]">
                Reminders that care as much
              </h1>
              
              <p className="relative font-serif text-5xl md:text-5xl italic -mt-2 opacity-0 animate-fade-in-right delay-2000 [text-shadow:0_2px_8px_rgba(0,0,0,0.6)] md:pr-[20px]">
                as you do
              </p>
              
            </div>
          </div>
        </div>
      </section>

      <nav className="my-6 flex flex-wrap justify-center gap-3">
        <Link href="#welcome-home" className="px-4 py-1.5 border rounded-full text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground hover:border-accent">
          Welcome Home
        </Link>
        <Link href="#whats-new" className="px-4 py-1.5 border rounded-full text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground hover:border-accent">
          What's New
        </Link>
        <Link href="#birthdays" className="px-4 py-1.5 border rounded-full text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground hover:border-accent">
          Birthdays
        </Link>
        <Link href="#bin-day" className="px-4 py-1.5 border rounded-full text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground hover:border-accent">
          Bin Day
        </Link>
        <Link href="#personalisation" className="px-4 py-1.5 border rounded-full text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground hover:border-accent">
          Personalisation
        </Link>
        <Link href="#pets" className="px-4 py-1.5 border rounded-full text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground hover:border-accent">
          Pets
        </Link>
        <Link href="#receipts" className="px-4 py-1.5 border rounded-full text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground hover:border-accent">
          Receipts
        </Link>
        <Link href="#budget" className="px-4 py-1.5 border rounded-full text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground hover:border-accent">
          Budget
        </Link>
        <Link href="#security" className="px-4 py-1.5 border rounded-full text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground hover:border-accent">
          Security
        </Link>
        <Link href="#values" className="px-4 py-1.5 border rounded-full text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground hover:border-accent">
          Values
        </Link>
      </nav>

      {/* This is where the server component will be rendered */}
      {children}

      <section id="welcome-home" className="bg-white text-black w-full max-w-6xl py-24 sm:py-32 mt-16 rounded-[2rem] scroll-mt-24">
        <div className="px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xl font-semibold text-neutral-600">Welcome Home</h2>
            <h3 className="font-serif text-4xl md:text-6xl font-bold tracking-tight mt-2">
              Your digital life, packed beautifully.
            </h3>
            <p className="mt-6 text-lg md:text-xl text-neutral-700 max-w-2xl mx-auto">
              Cuppi is your calm and private household app where you save information once and get reminded gently forever.
            </p>
          </div>

          <div className="mt-16">
            <Carousel
              opts={{
                align: "start",
              }}
              className="w-full"
              setApi={setWelcomeApi}
            >
              <CarouselContent className="-ml-8">
                {welcomeFeatures.map((feature, index) => (
                  <CarouselItem key={index} className="pl-8 basis-4/5 md:basis-2/3 lg:basis-2/5">
                    <div className="flex flex-col text-left">
                       <div className="bg-background rounded-[2rem] overflow-hidden">
                        <Image
                          src={feature.imageUrl}
                          alt={feature.title}
                          width={400}
                          height={820}
                          sizes="(max-width: 768px) 80vw, 40vw"
                          className="w-full h-auto object-cover"
                          loading="eager"
                        />
                      </div>
                      <h4 className="font-headline text-2xl font-bold mt-6">{feature.title}</h4>
                      <p className="mt-2 text-neutral-600 max-w-xs whitespace-pre-line">
                        {feature.description}
                      </p>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <div className={cn("mt-4 flex justify-end gap-2 transition-opacity", !welcomeApi && "opacity-0")}>
                <CarouselPrevious className="static" />
                <CarouselNext className="static" />
              </div>
            </Carousel>
          </div>
        </div>
      </section>

      <section id="birthdays" className="bg-white text-black w-full max-w-6xl py-24 sm:py-32 mt-16 rounded-[2rem] scroll-mt-24">
        <div className="px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xl font-semibold text-neutral-600">Birthdays</h2>
            <h3 className="font-serif text-4xl md:text-6xl font-bold tracking-tight mt-2">
              Celebrate every milestone, stress-free.
            </h3>
            <p className="mt-6 text-lg md:text-xl text-neutral-700 max-w-2xl mx-auto">
              From gentle reminders to grand celebrations, Cuppi helps you stay on top of all the important dates.
            </p>
          </div>

          <div className="mt-16">
            <Carousel
              opts={{
                align: "start",
              }}
              className="w-full"
              setApi={setBirthdaysApi}
            >
              <CarouselContent className="-ml-8">
                {birthdayFeatures.map((feature, index) => (
                  <CarouselItem key={index} className="pl-8 basis-4/5 md:basis-2/3 lg:basis-2/5">
                    <div className="flex flex-col text-left">
                       <div className="bg-background rounded-[2rem] overflow-hidden">
                        <Image
                          src={feature.imageUrl}
                          alt={feature.title}
                          width={400}
                          height={820}
                          sizes="(max-width: 768px) 80vw, 40vw"
                          className="w-full h-auto object-cover"
                          loading="eager"
                        />
                      </div>
                      <h4 className="font-headline text-2xl font-bold mt-6">{feature.title}</h4>
                      <p className="mt-2 text-neutral-600 max-w-xs whitespace-pre-line">
                        {feature.description}
                      </p>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <div className={cn("mt-4 flex justify-end gap-2 transition-opacity", !birthdaysApi && "opacity-0")}>
                <CarouselPrevious className="static" />
                <CarouselNext className="static" />
              </div>
            </Carousel>
          </div>
        </div>
      </section>

      <section id="bin-day" className="bg-white text-black w-full max-w-6xl py-24 sm:py-32 mt-16 rounded-[2rem] scroll-mt-24">
        <div className="px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xl font-semibold text-neutral-600">Bin Day</h2>
            <h3 className="font-serif text-4xl md:text-6xl font-bold tracking-tight mt-2">
            “Is it plastic or paper collection tomorrow??”
            </h3>
            <p className="mt-6 text-lg md:text-xl text-neutral-700 max-w-2xl mx-auto">
            We’ve all been there - standing at the window and trying to see which bin the neighbours have put out. With Cuppi, those moments are a thing of the past. We’ll keep track of the schedule so you don’t have to.
            </p>
          </div>

          <div className="mt-16">
            <Carousel
              opts={{
                align: "start",
              }}
              className="w-full"
              setApi={setBinDayApi}
            >
              <CarouselContent className="-ml-8">
                {binDayFeatures.map((feature, index) => (
                  <CarouselItem key={index} className="pl-8 basis-4/5 md:basis-2/3 lg:basis-2/5">
                    <div className="flex flex-col text-left">
                       <div className="bg-background rounded-[2rem] overflow-hidden">
                        <Image
                          src={feature.imageUrl}
                          alt={feature.title}
                          width={400}
                          height={820}
                          sizes="(max-width: 768px) 80vw, 40vw"
                          className="w-full h-auto object-cover"
                          loading="eager"
                        />
                      </div>
                      <h4 className="font-headline text-2xl font-bold mt-6">{feature.title}</h4>
                      <p className="mt-2 text-neutral-600 max-w-xs whitespace-pre-line">
                        {feature.description}
                      </p>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <div className={cn("mt-4 flex justify-end gap-2 transition-opacity", !binDayApi && "opacity-0")}>
                <CarouselPrevious className="static" />
                <CarouselNext className="static" />
              </div>
            </Carousel>
          </div>
        </div>
      </section>

      <section id="personalisation" className="bg-white text-black w-full max-w-6xl py-24 sm:py-32 mt-16 rounded-[2rem] scroll-mt-24">
        <div className="px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="relative aspect-[4/3]">
              <Image
                src={personalisationImageUrl}
                alt="Various color themes of the Cuppi app"
                fill
                sizes="(max-width: 768px) 90vw, 45vw"
                className="object-contain"
              />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-semibold text-neutral-600">Personalisation</h2>
              <h3 className="font-serif text-4xl md:text-6xl font-bold tracking-tight mt-2">
                Colours. Full of life.
              </h3>
              <p className="mt-6 text-lg md:text-xl text-neutral-700 max-w-md mx-auto">
                Either August slipped away with Amber Skies, or you just want to stay in a Lavender Haze - your Home should reflect your personality.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="pets" className="bg-white text-black w-full max-w-6xl py-24 sm:py-32 mt-16 rounded-[2rem] scroll-mt-24">
        <div className="px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xl font-semibold text-neutral-600">Pets</h2>
            <h3 className="font-serif text-4xl md:text-6xl font-bold tracking-tight mt-2">
              Taking care of your pets, just like we care for ours.
            </h3>
            <p className="mt-6 text-lg md:text-xl text-neutral-700 max-w-2xl mx-auto">
              We know that pets are family and keeping them healthy and happy can be a full-time job. And we are changing that.
            </p>
          </div>

          <div className="mt-16">
            <Carousel
              opts={{
                align: "start",
              }}
              className="w-full"
              setApi={setPetsApi}
            >
              <CarouselContent className="-ml-8">
                {petFeatures.map((feature, index) => (
                  <CarouselItem key={index} className="pl-8 basis-4/5 md:basis-2/3 lg:basis-2/5">
                    <div className="flex flex-col text-left">
                       <div className="bg-background rounded-[2rem] overflow-hidden">
                        <Image
                          src={feature.imageUrl}
                          alt={feature.title}
                          width={400}
                          height={820}
                          sizes="(max-width: 768px) 80vw, 40vw"
                          className="w-full h-auto object-cover"
                          loading="eager"
                        />
                      </div>
                      <h4 className="font-headline text-2xl font-bold mt-6">{feature.title}</h4>
                      <p className="mt-2 text-neutral-600 max-w-xs whitespace-pre-line">
                        {feature.description}
                      </p>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <div className={cn("mt-4 flex justify-end gap-2 transition-opacity", !petsApi && "opacity-0")}>
                <CarouselPrevious className="static" />
                <CarouselNext className="static" />
              </div>
            </Carousel>
          </div>
        </div>
      </section>

      <section id="receipts" className="bg-white text-black w-full max-w-6xl py-24 sm:py-32 mt-16 rounded-[2rem] scroll-mt-24">
        <div className="px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xl font-semibold text-neutral-600">Receipts</h2>
            <h3 className="font-serif text-4xl md:text-6xl font-bold tracking-tight mt-2">
              See your monthly shopping, right down to the last apple.
            </h3>
            <p className="mt-6 text-lg md:text-xl text-neutral-700 max-w-2xl mx-auto">
              Cuppi helps you stay firmly within your food budget, giving you the power to dive deep into your spending habits whenever you choose.
            </p>
          </div>

          <div className="mt-16">
            <Carousel
              opts={{
                align: "start",
              }}
              className="w-full"
              setApi={setReceiptsApi}
            >
              <CarouselContent className="-ml-8">
                {receiptFeatures.map((feature, index) => (
                  <CarouselItem key={index} className="pl-8 basis-4/5 md:basis-2/3 lg:basis-2/5">
                    <div className="flex flex-col text-left">
                       <div className="bg-background rounded-[2rem] overflow-hidden">
                        <Image
                          src={feature.imageUrl}
                          alt={feature.title}
                          width={400}
                          height={820}
                          sizes="(max-width: 768px) 80vw, 40vw"
                          className="w-full h-auto object-cover"
                          loading="lazy"
                        />
                      </div>
                      <h4 className="font-headline text-2xl font-bold mt-6">{feature.title}</h4>
                      <p className="mt-2 text-neutral-600 max-w-xs whitespace-pre-line">
                        {feature.description}
                      </p>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <div className={cn("mt-4 flex justify-end gap-2 transition-opacity", !receiptsApi && "opacity-0")}>
                <CarouselPrevious className="static" />
                <CarouselNext className="static" />
              </div>
            </Carousel>
          </div>
          <div className="mt-8 text-center text-xs text-neutral-500 space-y-2 max-w-3xl mx-auto">
              <p>*Always check the barcode number for accuracy.</p>
              <p>**Currently in active development; please always double-check the scanned results.</p>
              <p>***Automatic import currently supports Tesco, Aldi, and Sainsbury’s.</p>
          </div>
        </div>
      </section>

      <section id="budget" className="bg-white text-black w-full max-w-6xl py-24 sm:py-32 mt-16 rounded-[2rem] scroll-mt-24">
        <div className="px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xl font-semibold text-neutral-600">Budget</h2>
            <h3 className="font-serif text-4xl md:text-6xl font-bold tracking-tight mt-2">
              A Budget Builder tailored for Britain, without the scary bits.
            </h3>
            <p className="mt-6 text-lg md:text-xl text-neutral-700 max-w-2xl mx-auto">
              No more staring into the void blankly when your partner asks “Sorry, how much do we pay for water?” at the dinner table. Cuppi will help you build and manage your monthly budget.
            </p>
          </div>

          <div className="mt-16">
            <Carousel
              opts={{
                align: "start",
              }}
              className="w-full"
              setApi={setBudgetApi}
            >
              <CarouselContent className="-ml-8">
                {budgetFeatures.map((feature, index) => (
                  <CarouselItem key={index} className="pl-8 basis-4/5 md:basis-2/3 lg:basis-2/5">
                    <div className="flex flex-col text-left">
                       <div className="bg-background rounded-[2rem] overflow-hidden">
                        <Image
                          src={feature.imageUrl}
                          alt={feature.title}
                          width={400}
                          height={820}
                          sizes="(max-width: 768px) 80vw, 40vw"
                          className="w-full h-auto object-cover"
                          loading="eager"
                        />
                      </div>
                      <h4 className="font-headline text-2xl font-bold mt-6">{feature.title}</h4>
                      <p className="mt-2 text-neutral-600 max-w-xs whitespace-pre-line">
                        {feature.description}
                      </p>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <div className={cn("mt-4 flex justify-end gap-2 transition-opacity", !budgetApi && "opacity-0")}>
                <CarouselPrevious className="static" />
                <CarouselNext className="static" />
              </div>
            </Carousel>
          </div>
        </div>
      </section>

      <section id="security" className="bg-white text-black w-full max-w-6xl py-24 sm:py-32 mt-16 rounded-[2rem] scroll-mt-24">
        <div className="px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="relative aspect-[4/3]">
              <Image
                src={securityImageUrl}
                alt="Cuppi security and privacy illustration"
                fill
                sizes="(max-width: 768px) 90vw, 45vw"
                className="object-contain"
              />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-semibold text-neutral-600">Security</h2>
              <h3 className="font-serif text-4xl md:text-6xl font-bold tracking-tight mt-2">
                Your Home life isn't big tech’s business
              </h3>
              <p className="mt-6 text-lg md:text-xl text-neutral-700 max-w-md mx-auto">
                We believe that home life is private and personal. Unlike the tech giants, we aren't interested in following your movements or selling your habits. We don’t track you, we never push ads, and we give you the tools to keep your information exactly where it belongs: with you. It’s your Home and your Data. Simple as that.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      <section id="values" className="bg-white text-black w-full max-w-6xl py-24 sm:py-32 mt-16 rounded-[2rem] scroll-mt-24">
        <div className="px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="relative aspect-[4/3]">
              <Image
                src={valuesImageUrl}
                alt="Cuppi values illustration"
                fill
                sizes="(max-width: 768px) 90vw, 45vw"
                className="object-contain"
              />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-semibold text-neutral-600">Values</h2>
              <h3 className="font-serif text-4xl md:text-6xl font-bold tracking-tight mt-2">
                Security by design
              </h3>
              <p className="mt-6 text-lg md:text-xl text-neutral-700 max-w-md mx-auto">
                We’ve built Cuppi with a different set of values. From biometric logins that stay on your device to encrypted backups that keep your household records safe, we prioritise your peace of mind. We only collect the absolute minimum amount of information required to keep your account running smoothly - nothing more.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="py-16">
        {/* <BetaSignup /> */}
      </div>
    </>
  );
}
