import type { HomePage } from './home-page-types';

// What the home page shows when there is no published "Home page" document in
// Sanity, or Sanity cannot be reached. It is the page as it was before it moved
// into Sanity, so the site never goes blank. Once the Sanity document exists,
// edit the page there, not here.
export const homePageFallback: HomePage = {
  hero: {
    line1: "Reminders that care as much",
    line2: "as you do",
    image: {
      url: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fheader_landing%2FHomeOS_M001_banner-medium_001.webp?alt=media&token=86e6c60f-d971-4bc5-a699-a1ea147daaba",
      alt: "A calming image showing a preview of the Cuppi app interface on a phone.",
    },
  },
  sections: [
    {
      kind: "carousel",
      id: "welcome-home",
      eyebrow: "Welcome Home",
      heading: "Your digital life, packed beautifully.",
      intro: "Cuppi is your calm and private household app where you save information once and get reminded gently forever.",
      cards: [
        {
          title: "A New Kind of Feed",
          description: "Your Home's social media. The focus is on you and your household. No advertisements, no tracking, just bringing calm into the everyday chaos.",
          image: {
            url: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Fwelcome_home%2Fhomeos-sheet-2.webp?alt=media&token=d5c474e4-adce-44c7-9514-018fd06891ba",
            alt: "A New Kind of Feed",
          },
        },
        {
          title: "Memories, secured",
          description: "Your posts and messages are private and no one else can have a peek at your baking and hiking moments outside your Household. Keeping your precious home life truly special.",
          image: {
            url: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Fwelcome_home%2Fhomeos-sheet-13.webp?alt=media&token=5751bbf8-6ce8-4bae-abc8-d7dd8d05bdd3",
            alt: "Memories, secured",
          },
        },
        {
          title: "Smart Posts",
          description: "Smart posts for maximum help. We are introducing new ways to interact on your Home Feed. From Month Ahead overviews to your Pet's medication, you will find everything important here.",
          image: {
            url: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Fwelcome_home%2Fhomeos-sheet-7.webp?alt=media&token=bafb10fe-b592-466d-ad41-766a66467042",
            alt: "Smart Posts",
          },
        },
        {
          title: "Expanding Features",
          description: "We are adding new features weekly to expand our tools and refine their usability. Have everything in one place from tracking your Pet's annual vaccinations to organising the next Birthday party.",
          image: {
            url: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Fwelcome_home%2Fhomeos-sheet-9.webp?alt=media&token=7f52540a-acc1-4d49-b5ee-a473735dff67",
            alt: "Expanding Features",
          },
        },
      ],
      footnotes: [],
    },
    {
      kind: "carousel",
      id: "birthdays",
      eyebrow: "Birthdays",
      heading: "Celebrate every milestone, stress-free.",
      intro: "From gentle reminders to grand celebrations, Cuppi helps you stay on top of all the important dates.",
      cards: [
        {
          title: "From a ping to a grand celebration",
          description: "Trade the last-minute panic for a bit of home baking. With proactive notifications, you’ll have plenty of time to find the perfect gift or prep a birthday surprise without the usual rush of a frantic shopping spree.",
          image: {
            url: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Fbirthday_section%2Fhomeos-sheet-20.webp?alt=media&token=da10a8c0-51c3-4b2d-a258-6fa95d9014a6",
            alt: "From a ping to a grand celebration",
          },
        },
        {
          title: "Save once, remember forever",
          description: "Keep all your loved ones’ birthdays neatly organised in one secure place. At a glance, you can see exactly when the big day is arriving, what age they’ll be turning, and the milestone year you are celebrating together.",
          image: {
            url: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Fbirthday_section%2Fhomeos-sheet-21.webp?alt=media&token=d68b7241-7fb2-4df9-bebf-64456c20e34a",
            alt: "Save once, remember forever",
          },
        },
        {
          title: "Gift ideas that actually bring joy",
          description: "We all know the struggle of trying to think of the perfect present on the spot. Our simple gift lists allow you to jot down those special ideas the moment they are mentioned, so you can surprise them with exactly what they wanted months ago.",
          image: {
            url: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Fbirthday_section%2Fhomeos-sheet-19.webp?alt=media&token=08d6272b-03b8-4bc7-8ba1-75b3b7950a34",
            alt: "Gift ideas that actually bring joy",
          },
        },
      ],
      footnotes: [],
    },
    {
      kind: "carousel",
      id: "bin-day",
      eyebrow: "Bin Day",
      heading: "“Is it plastic or paper collection tomorrow??”",
      intro: "We’ve all been there - standing at the window and trying to see which bin the neighbours have put out. With Cuppi, those moments are a thing of the past. We’ll keep track of the schedule so you don’t have to.",
      cards: [
        {
          title: "Confusing? Not anymore.",
          description: "Create your Bin Day profiles, select which materials are being collected, and tell us how frequently the truck visits. Once it's set, you can relax; we’ll send you a gentle notification at 6.00 pm the evening before, giving you plenty of time to get the right bin to the kerb.",
          image: {
            url: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Fbinday_section%2Fhomeos-sheet-22.webp?alt=media&token=024329ee-8039-4668-9e25-07675afdb9a9",
            alt: "Confusing? Not anymore.",
          },
        },
        {
          title: "Council database (Preview)",
          description: "We are on a mission to map out every council website in the UK and put them into one simple search bar for you. Find your local council and get the latest, most accurate information on your collections. We’ll even notify you if we think your schedule might need a quick check for updates.",
          image: {
            url: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Fbinday_section%2Fhomeos-sheet-23.webp?alt=media&token=ffc040bf-195a-404d-bbd8-21f5cbe91806",
            alt: "Council database (Preview)",
          },
        },
      ],
      footnotes: [],
    },
    {
      kind: "image",
      id: "personalisation",
      eyebrow: "Personalisation",
      heading: "Colours. Full of life.",
      intro: "Either August slipped away with Amber Skies, or you just want to stay in a Lavender Haze - your Home should reflect your personality.",
      image: {
        url: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Fwelcome_home%2Fhomeos-sheet-12.webp?alt=media&token=9cf0d557-76fa-4a90-bed0-de3551604e57",
        alt: "Various color themes of the Cuppi app",
      },
    },
    {
      kind: "carousel",
      id: "pets",
      eyebrow: "Pets",
      heading: "Taking care of your pets, just like we care for ours.",
      intro: "We know that pets are family and keeping them healthy and happy can be a full-time job. And we are changing that.",
      cards: [
        {
          title: "A Vet-grade app in your hand",
          description: "Create Pet profiles and be up-to-date with all their needs. Save your vet and insurance information, track healing, weight and be vaccination-ready with reminders.",
          image: {
            url: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Fpets_section%2Fhomeos-sheet-5.webp?alt=media&token=9dee748b-3590-4358-b0a9-ab5e7ecf0b60",
            alt: "A Vet-grade app in your hand",
          },
        },
        {
          title: "Pet health, simplified",
          description: "If your Pet is senior and you need to be on top of their Medications or you just want to track your little one’s Weight and growth, we have all kinds of tools for you.",
          image: {
            url: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Fpets_section%2Fhomeos-sheet-6.webp?alt=media&token=f45a3d6b-c66c-43e9-ab93-85824f181416",
            alt: "Pet health, simplified",
          },
        },
        {
          title: "Appointments, never missed",
          description: "Just like in a calendar, quickly record your next visit, select how early you want to get reminded and we will do the rest.",
          image: {
            url: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Fpets_section%2Fhomeos-sheet-14.webp?alt=media&token=5efa8a03-eaad-43b9-866d-f166c3d61c05",
            alt: "Appointments, never missed",
          },
        },
        {
          title: "Medications, never missed either",
          description: "We know how important it is to keep track of our Pet’s medications. Set up daily, weekly, monthly or annual reminders and have a history of administered meds.",
          image: {
            url: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Fpets_section%2Fhomeos-sheet-15.webp?alt=media&token=fcf03c7c-d7c9-4448-b93d-50d4ea74d097",
            alt: "Medications, never missed either",
          },
        },
      ],
      footnotes: [],
    },
    {
      kind: "carousel",
      id: "receipts",
      eyebrow: "Receipts",
      heading: "See your monthly shopping, right down to the last apple.",
      intro: "Cuppi helps you stay firmly within your food budget, giving you the power to dive deep into your spending habits whenever you choose.",
      cards: [
        {
          title: "Simple shopping tracking",
          description: "Set your monthly Food & Household budget and see exactly how much is left at a glance. You can save your stores, track receipt totals, and even store barcodes to make those occasional returns much less of a headache.",
          image: {
            url: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Freceipts_section%2Fhomeos-sheet-26.webp?alt=media&token=56a3a33e-817d-42be-b9f2-1e43b82ee138",
            alt: "Simple shopping tracking",
          },
        },
        {
          title: "For the detail-oriented",
          description: "If you love a deep dive into your data, Cuppi allows you to log every individual item from your receipt. This gives you a complete category overview, so you can see exactly where your money is going - whether it's the weekly essentials or those cheeky weekend treats.",
          image: {
            url: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Freceipts_section%2Fhomeos-sheet-25.webp?alt=media&token=92114231-7800-4a72-8e86-04904c8e6171",
            alt: "For the detail-oriented",
          },
        },
        {
          title: "Effortless scanning (Early Access)",
          description: "Try our experimental receipt scanner and take the sting out of manual typing. We are actively teaching our software to recognise a wide variety of UK formats, so you can digitise your paper trail in seconds.",
          image: {
            url: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Freceipts_section%2Fhomeos-sheet-24.webp?alt=media&token=0ea80b49-079a-4cfa-b106-011a75d5b771",
            alt: "Effortless scanning (Early Access)",
          },
        },
      ],
      footnotes: [
        "*Always check the barcode number for accuracy.",
        "**Currently in active development; please always double-check the scanned results.",
        "***Automatic import currently supports Tesco, Aldi, and Sainsbury’s.",
      ],
    },
    {
      kind: "carousel",
      id: "budget",
      eyebrow: "Budget",
      heading: "A Budget Builder tailored for Britain, without the scary bits.",
      intro: "No more staring into the void blankly when your partner asks “Sorry, how much do we pay for water?” at the dinner table. Cuppi will help you build and manage your monthly budget.",
      cards: [
        {
          title: "See the whole picture",
          description: "Gain a clear view of your financial home. Track your income and paydays alongside every household expense—from utilities and subscriptions to the weekly grocery run. You can even split bills with family members, ensuring everyone knows their fair share without the awkward conversations.",
          image: {
            url: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Fbudget_section%2Fhomeos-sheet-18.webp?alt=media&token=1e05341f-936e-4954-8d5d-75bdcca03fe7",
            alt: "See the whole picture",
          },
        },
        {
          title: "Clear, helpful insights",
          description: "Understand your spending at a glance. Our clean graphs and simple category breakdowns help you see exactly where your money is going, giving you the confidence to make better financial decisions for your home.",
          image: {
            url: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Fbudget_section%2Fhomeos-sheet-17.webp?alt=media&token=206e0a06-1c92-44a2-bd9e-8dee9d2e2336",
            alt: "Clear, helpful insights",
          },
        },
        {
          title: "The 15-Minute Budget Builder",
          description: "Getting started is the hardest part, so we’ve done the heavy lifting for you. Our Budget Builder gets you up and running in less than 15 minutes. We’ll suggest essential categories (like Housing, Utilities, and Pets) and common items (such as Council Tax, Rent, or your TV Licence), so you only need to tinker with the numbers to make it yours.",
          image: {
            url: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Fbudget_section%2Fhomeos-sheet-16.webp?alt=media&token=269ef8fa-f642-4ca6-9c45-6fe3c06b14b1",
            alt: "The 15-Minute Budget Builder",
          },
        },
      ],
      footnotes: [],
    },
    {
      kind: "image",
      id: "security",
      eyebrow: "Security",
      heading: "Your Home life isn't big tech’s business",
      intro: "We believe that home life is private and personal. Unlike the tech giants, we aren't interested in following your movements or selling your habits. We don’t track you, we never push ads, and we give you the tools to keep your information exactly where it belongs: with you. It’s your Home and your Data. Simple as that.",
      image: {
        url: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Fsecurity_section%2Fhomeos-sheet-3.webp?alt=media&token=a3f16bcb-63f5-4ff4-b0e9-ffcdce741ba6",
        alt: "Cuppi security and privacy illustration",
      },
    },
    {
      kind: "image",
      id: "values",
      eyebrow: "Values",
      heading: "Security by design",
      intro: "We’ve built Cuppi with a different set of values. From biometric logins that stay on your device to encrypted backups that keep your household records safe, we prioritise your peace of mind. We only collect the absolute minimum amount of information required to keep your account running smoothly - nothing more.",
      image: {
        url: "https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fapp_section%2Fsecurity_section%2FHomeOS-v2-security.webp?alt=media&token=d92f8071-731c-4db4-8763-a2c7ac3d15d0",
        alt: "Cuppi values illustration",
      },
    },
  ],
};
