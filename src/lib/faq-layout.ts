import type { LayoutGroup } from './faq-model';

// Reading order and sub-topics for the answers that existed when the FAQ was
// redesigned. Entries are keyed by Sanity document _id, so rewording a question
// never breaks its place here. The comment after each id is only a reminder.
//
// An editor can override an answer's sub-topic with the optional `topic` field
// in the Studio. Answers added later that are not listed here appear after the
// listed ones, ordered by the Studio's `order` field.
export const FAQ_LAYOUT: Record<string, LayoutGroup[]> = {
  basics: [
    {
      topic: null,
      ids: [
        '03f8d068-b666-4937-915d-d3b2660ec2d1', // The Home Feed
        'cf32d007-5f3c-46eb-afc8-c5fa74b1186e', // Notifications
        '81bc61b4-bbf7-4a2b-ad3f-a4a8abe393e6', // I’ve forgotten my PIN
        '6c47d62c-8596-4e37-8d6a-2d5f13ed6039', // Security Logs
        '616ca65b-1b69-49eb-98ee-edc9b85f94bb', // Managing Blocked Users & Unblock someone
      ],
    },
  ],
  account: [
    {
      topic: null,
      ids: [
        '074264d1-5c46-4a63-b8d0-9070e5e112e1', // Updating profile
        '3493a340-06c1-4249-bc21-690f08332d28', // Signing out of Cuppi
        'c2b322b8-ac8e-4ffa-990b-823fe24d2b8d', // Child accounts
        '4f03cc94-7325-45c6-b9a0-394328f7784c', // How to set up 2-step verification?
        'b615686e-8c5b-49e9-ad90-074f48dbd673', // Security Centre
        'ebcb00cb-12a7-4e67-9257-eaf339f92ac8', // What happens to my personal data after deleting my account?
      ],
    },
  ],
  household: [
    {
      topic: null,
      ids: [
        '9bbe21a7-0f3f-4fe0-a8ec-5d584c0dee4a', // Adding household members
        '050bd4a0-f7c2-40b2-bad6-a77e6b37dfa2', // Household customisation
        '0959249e-6e17-4db0-b47e-d3851da84165', // Transfer household ownership
        'e86a6697-64bb-4deb-b020-2e3ef2405139', // Suspending a Household Member
        'dbdac809-9945-47bb-9597-efcbd2858fc4', // Deleting a household
      ],
    },
  ],
  pro: [
    {
      topic: 'Plans & billing',
      ids: [
        '6f3c924c-1273-4ea7-b52d-f9a28285aa9a', // Cuppi Pro and Free tiers
        'd1a4c73b-f516-49d9-98de-818c3929554a', // Cancelling Pro subscription
      ],
    },
    {
      topic: 'Earning points',
      ids: [
        '13d6362f-a9db-4546-927a-cb5140d9aec0', // How can I sign up for the Cuppi Referral Programme?
        '5839ac93-68cc-4d79-9a7a-604bb90f979a', // Where do I find and how can I share my referral code?
        'd1e45f90-9da7-4605-af9c-861c87a113f0', // Does my referral code expire?
        'aa376a46-3058-495d-9b14-9cff07107401', // Can I change or regenerate my referral code?
        '14c4096f-611c-497a-9aca-9a500c13fbdc', // Can I use a referral code when joining an existing household, or only when creating one?
        '4e63073d-e16b-460b-8bf8-9f7fdeb0eac8', // Does my friend get anything extra for using my referral code?
        'b3761b43-48bd-40f9-bc68-255b09189f10', // My friend used the code during registration. Why didn't I get a Pro point?
      ],
    },
    {
      topic: 'Redeeming a free month',
      ids: [
        'ada9d25b-cfee-4aa4-b7d9-790b5f973e9d', // How can I redeem a Pro point for a free Pro month?
        '0624989f-889c-4755-8286-856c7b443db2', // I tapped on Redeem but it says it was rejected. Why?
        '274fc26f-22d0-47eb-8366-ca514da39ea1', // I accidentally tapped on "Mark as used" on a redeemed promo code. How can I bring it back?
        '8de6658a-023e-4b40-bb81-f214b43b2a9e', // Which Apple ID should I use to redeem my free month code?
        '3f619cfd-475a-4c93-b3ea-f9c585e82378', // Can I request more months than I have points for?
        '53a3860a-f1df-494f-b0e7-f1d309e761ad', // Can I have more than one redemption request in progress at once?
        '5ca9e5d5-f202-4add-998f-bdb22ad82e95', // I'm part of a household but I can't see the earned free Pro "Redeem" button. Why?
      ],
    },
    {
      topic: 'Lifetime Pro',
      ids: [
        'edb182df-c77f-4083-8f37-03a539ff2187', // How can I earn free Cuppi Lifetime Pro?
        'f04ec4a2-f90f-4036-896d-a0d2a1577124', // What's the difference between the earned Pro points and Lifetime Pro?
        'c0e7c254-d37b-4263-a2f3-79420cc67320', // I finally have enough Pro points to request Lifetime Pro. How can I redeem the offer?
        'c69b57d3-ad32-4a93-99f8-043fda131eda', // Do I need to keep accumulating Pro points and not redeem them to earn Lifetime Pro?
        '96cac7e7-98b2-42f7-a245-88e65c47e398', // Can Cuppi take back Lifetime Pro once it's been granted?
      ],
    },
    {
      topic: 'Refunds, transfers & deletion',
      ids: [
        '5cb31064-0542-492e-aed4-f3f43ce7dd24', // If my friend refunds their subscription, do I lose points I've already redeemed?
        '88bb0f6f-f0ad-48bc-9025-460a25a0f39b', // What happens to my referral points and code if I transfer household ownership?
        'dfbd1da7-51c9-45aa-a43f-a5bbc93bdb55', // What happens to my unredeemed points if I delete my account?
      ],
    },
  ],
  shopping: [
    {
      topic: 'Lists',
      ids: [
        '2a02174d-d978-481e-92dd-1e6c7c33c0a0', // How do I create a new shopping list?
        '12293107-ba3b-40c0-ae6d-3a5d8f2c86ca', // How do I edit a list's name or emoji?
        'd11c5ffd-53f0-4b45-b2bd-320d59e90cca', // How do I delete a shopping list?
        '11a23c21-978f-4b8a-a729-cc579bf46f4b', // What is the difference between Shared and Private lists?
        '75ed5173-699e-42a5-b6d9-92b84a4b371f', // What can list owners do versus household members?
        '83d4f3f2-53b9-45e9-bb6f-677fafd41b68', // How do I transfer ownership or change privacy?
      ],
    },
    {
      topic: 'Shopping Mode',
      ids: [
        '0bd3249d-961d-4130-acf2-9d8e5e2e4936', // What is Shopping Mode?
        '38090c78-f762-4453-af28-dbc6d432c3e0', // Customising your shopping layout
        '134c03a0-fdff-496d-b417-1e54939bfe6a', // Automatic Aisle Sorting
        'd824f8f3-fe8b-40e3-b74c-aaa27a6aee10', // Splitting Items (The "Divide & Conquer" Pro Feature)
      ],
    },
    {
      topic: 'Free tier & children',
      ids: [
        '449f9861-5c63-40be-aced-faa39c817321', // What are the limits on the Free Tier for Shopping?
        '0daea4bd-2c1d-4039-8ec1-24c2aa17c418', // How do Child accounts interact with Shopping?
      ],
    },
  ],
  'bin-day': [
    {
      topic: 'Setting up',
      ids: [
        '34928042-5d49-43e3-99c3-5ed95caad2dd', // Everything about Bin Day
        'f03ddad1-eb8b-40b1-b9f5-2482081d60b2', // How do I search for my Council to check the latest bin day information?
        'c81d6946-8f08-497a-bf4b-809f62045313', // How do I set up a Bin Day notification?
        'e356500e-52f3-4b2c-9bfd-1e87305319d4', // The Council link provided was not working. What can I do?
      ],
    },
    {
      topic: 'Changing collections',
      ids: [
        'eca6f797-3035-4b8e-8c1a-a90d34403b67', // How to edit bin day collections?
        '706bc1e8-f6f7-4453-bcb0-f9d7d9e1405c', // A special Bin Day collection is coming up and the scheduled notification does not match reality. Can I skip or add a temporary day?
        'd76bef90-193f-4fd0-be1a-e6f392e0f21c', // How do I delete a Bin Day schedule?
      ],
    },
    {
      topic: 'Notifications',
      ids: [
        '45b58e20-c22a-4e91-8905-58fb6a7a81a0', // How can I change the notification timing for Bin Days?
        'a4c13030-b427-49b6-8d25-d12526282fb7', // I haven’t received any Bin Day notifications. What can I do?
      ],
    },
    {
      topic: 'Sharing',
      ids: [
        '320671c2-d993-4120-b7a4-071656604f24', // Who can edit Bin Days?
        '6946dceb-7138-4a7c-9147-8367d547026f', // Will other household members see the changes I make in Bin Day?
      ],
    },
  ],
  budget: [
    {
      topic: 'Approving a budget',
      ids: [
        '10536d90-3d77-4aeb-9116-05b7c42069ae', // How do I approve a Budget?
        '9effaed7-93e2-4718-b5d2-7de61541ed4e', // Who can approve a Budget?
        '1aec1f97-186a-48ea-89be-6412d320a88d', // When can I approve next month’s budget?
        '09dda3c0-8f45-4941-b7c2-b8a9fe826aa9', // Who can see the Budget draft?
        '871d7ae6-3cb3-4ec3-a250-219f457383e5', // Can I edit the Budget draft before the new month starts?
        'ce675230-f3b3-4209-b6ea-40481ea58fad', // What if I delete a Budget draft?
        'cb3541c5-15fc-4e67-9651-ae2abad0962d', // What if nobody approves a Budget?
        '27aa0bca-7d94-47e8-a9e7-ae78aec9a7b5', // What if two adults open the app at the same time? How does that affect Budget?
        '9479d4a1-f0bb-4f76-943b-17a48ec052f7', // What if I haven’t opened Cuppi Home for a while? Does that affect Budget?
      ],
    },
    {
      topic: 'Reviewing changes',
      ids: [
        '7745ceff-934f-4d7a-8264-fbabd1cdb439', // What does the review screen show in Budget?
        '366b6111-abe8-4ef2-bda6-a152727637fc', // What is “Check these” in Budget Review?
        '443d3955-b822-4e00-b7a1-9a67096c9df8', // What does “What changed” show in Budget Review?
        '446660c4-11eb-442a-bbc8-527d85b86bfa', // What happens when I change an item’s amount?
      ],
    },
    {
      topic: 'Items & renewal',
      ids: [
        '34fd2902-2de7-4cdd-9f87-6b97b957e1a9', // Who can change budget items?
        'b06a9a28-7a87-49c3-a2c4-83aba7c927db', // What is a usage-based budget item?
        '6d44ec91-8a53-4f0b-a56d-c6210afb36b7', // How do I mark a budget item as usage-based?
        '6b7f36e8-b3d9-4de7-a122-fab06b344386', // What if I’m adding a brand-new budget item that won’t repeat?
        'ad290005-24ab-4fe2-af58-14cae8b38cdb', // Where can I see the One-off budget items?
        '1c1e6600-45a2-4bbd-aa97-faca1a4bc476', // What is automatic Budget renewal?
        '72affab7-f3cc-4da6-93bf-fef954849a20', // How do I turn automatic Budget renewal off?
      ],
    },
    {
      topic: 'Reminders & notifications',
      ids: [
        '38df2f2a-d3d4-4ce2-9c86-809efb57157d', // What Budget reminders will I get?
        '597cf794-a717-4522-8e5e-5747fb51ee2d', // Who gets Budget notifications?
        '949d4599-bba0-4d46-a37e-bc49bfc9382d', // What happens to the notifications if my partner approves a Budget?
        '7c2ff792-dff7-490a-93aa-be4aa205e774', // I’m not getting Budget reminders. What should I check?
        'a2fedea4-378c-4898-9b8f-26d224a0ab9b', // How do I turn Budget reminders off?
      ],
    },
    {
      topic: 'Companion posts',
      ids: [
        '6f251dc0-0d72-4b60-b041-c5c1df8a6282', // Is there a Companion budget post in my feed too?
        '8d4602f0-6ef4-4c24-bc38-a58def083cf1', // How do I change how price changes look on a Companion budget post?
        'ec59dfdd-cc77-4290-ab6b-edfff96e34af', // Do Companion budget posts appear in my in-app notification list?
      ],
    },
  ],
  receipts: [
    {
      topic: 'Scanning & saving',
      ids: [
        '0b777478-ddb5-47f7-af10-60ad3d5cf984', // What does the scanner do for me?
        '4bcc11f5-64ba-4a17-9b75-7241de5d811e', // How do I get the best scan?
        '1b239018-0a28-45b4-81d5-23d0154cebe0', // What's the difference between Scan receipt and Quick save?
        '33d8db8d-1a8c-45ad-8548-c4cb390d3dd4', // I scanned 3 pages but only some were kept.
        'b4dfb0d6-36b0-4933-8de2-8bf785c7eb85', // My receipt is really long. What should I do?
        'f3504486-f78f-4d18-bc8f-2acc1bbc668a', // My receipt has faded. Can I still save it?
        'da649f52-814c-4666-a3a5-384b44ddda65', // Why was my photo rejected?
        'c7b2d1fb-1776-4d1d-aa06-3c554e60d626', // Can I upload a photo from my camera roll instead?
        '006ac3ad-56dc-4328-94dd-cbf3e52f17ff', // Can I add a photo to a receipt after saving it?
        'db92a62e-b25e-4c00-b43f-4e105303e71e', // Can I add a receipt from a previous month?
        '92836590-cce2-434a-ac94-1181792c89e9', // Do I need to be in a home to use Receipts?
        '9794fc50-36a6-4b21-b61b-08d58f712148', // Can Cuppi read receipts from outside the UK?
      ],
    },
    {
      topic: 'PDFs',
      ids: [
        '6ec69bf9-778a-461c-9ae3-7845d95d6fcc', // Can I attach a PDF?
        '5ce9cf4c-8a81-49f1-813c-4118efcba971', // What works best as a PDF?
        '7b098119-dbcf-4a3b-8f54-ea414702af45', // Why won't my PDF upload?
        '0ceadd31-c33b-4fff-8342-882ec41b5687', // Can I mix photos and a PDF on one receipt?
      ],
    },
    {
      topic: 'Enhanced processing',
      ids: [
        'a3d1da5c-2614-42e5-acb8-2745a1568d34', // What is enhanced receipt processing?
        '9767ad4c-9581-47c6-b40f-480ca65873a0', // Why is the Enhance button locked or missing?
        '30b36cc3-ea0b-4aa9-8475-821d55011a8d', // I was asked for permission to run Enhanced Processing. What happens if I tap Not now?
        '8751deb6-16bd-49b9-acc5-cad4fad886c2', // I enhanced a receipt and it's still not quite right.
        '8fc8c51c-ce6d-4d6b-8ed9-5bfb1d6c6590', // Can I enhance a receipt I've already saved?
        'b8345b05-f9dd-421e-854c-f0dc2ba4db11', // What does "Enhanced by Cuppi" at the bottom of a receipt mean?
      ],
    },
    {
      topic: 'Free and Pro limits',
      ids: [
        '0ae8ddbd-a20a-4269-8c2e-4f510272256b', // What are the Receipts limits on Free and Pro?
        '0d94c5f3-4c8e-4ae0-a5c5-7c6c555b3039', // How many receipts enhancements do I get?
      ],
    },
    {
      topic: 'Editing & details',
      ids: [
        '0ef418fb-1976-489f-8d9d-80b8e5c5f68e', // Can I add or change Receipts items?
        '114d4d87-6db6-462c-a07f-49675c7c70c7', // What happens when I delete a receipt?
        '091958f5-9a3a-41be-af84-71f60aac55fd', // What are categories for?
        'ce9d8c5d-2625-4e3e-9e44-d1b4cddc9cd8', // What's the barcode for?
        'f0cea06f-87a6-4f41-82e5-c2f615e01b5c', // How do guarantees work on a receipt?
        '6ad83d9b-d491-4829-b0be-ef4d979a12b9', // What kinds of discount can I record?
        '5894ecfe-14b7-4424-a990-8b4b37946053', // Is there a maximum receipt total?
      ],
    },
    {
      topic: 'Search & sharing',
      ids: [
        'd6cac6cb-9abc-4c74-8e66-01f542e7e5fd', // How do I search my receipts?
        '5d883b79-c88c-499c-ba54-feb2771f7f4d', // Why can't I find an old receipt in search?
        'a6baa7dc-fcce-49af-842e-1326d83e72e6', // Who in my home can see our receipts?
      ],
    },
    {
      topic: 'Budget link',
      ids: [
        '5ff104e5-e999-4a4b-8ef9-ae1dff84bd7d', // What does "Spent from budget" mean?
        'f232e01b-9943-4529-8593-11b9f0677934', // Where does my budget amount come from?
        '7b8f8b74-ecad-4303-82f6-97aee27e8e00', // My budget doesn't reset on the 1st. Can I change it?
      ],
    },
  ],
  pets: [
    {
      topic: 'Getting started',
      ids: [
        '2e804367-6b4b-404a-96c4-53d9005d5f37', // Important information regarding the Pets features
        'e9e78ba0-52f8-4a82-a28f-39cb7c472092', // Creating and Managing Pet Profiles
      ],
    },
    {
      topic: 'Health records',
      ids: [
        '1e3e8cac-3c31-4b2a-a8d7-83820c825335', // Vaccination
        '45c23b1c-c991-43d5-a2bd-9627bccb74a9', // Medications
        '26b55150-ac07-4690-bb65-b0935a501e53', // Healing Tracker
        'cc7dc882-e8f1-4daf-9187-25e2bea37dc6', // Weight history
      ],
    },
    {
      topic: 'Vets, appointments & insurance',
      ids: [
        'b40cd8f0-74d5-425c-ad7b-e28303928e77', // Vet
        'e4bcc4e5-d635-401d-bfc7-60cc3d8e51f7', // Appointments
        'ebdbcbae-94d6-4531-84b7-adff261e776e', // Pet insurance
      ],
    },
    {
      topic: 'Emergency vet',
      ids: [
        '1f384440-10db-4c59-b5c0-b0432b5dcbde', // What is the Emergency Veterinary slider?
        '3d5df55a-0af8-4f63-9f1d-dcfb7576bd15', // How do I set up the Emergency Veterinary phone number?
        '8f7e9905-91ba-4595-9ba6-97234529e101', // What format can the Emergency Vet phone number be in?
        '317d9c24-43db-4a11-8bcf-b57714e58f7e', // How do I call the Emergency Vet?
        'b7423bbd-2772-4237-b173-36894425f5a1', // Why don’t I see the Pet Emergency slider?
        '16de106a-d0f5-4c0b-bd31-2f0603d10f1a', // Why can’t my child set the Emergency Veterinary phone number?
      ],
    },
  ],
  'birthdays-celebrations': [
    {
      topic: 'Birthdays',
      ids: [
        'df01227b-d611-4df3-88de-9bc3e4ad6b84', // Creating Birthday profiles
        '74a9404d-be11-4051-8bde-0e2a5ddb8396', // Gifts list
        'a9e80734-0293-468c-8748-fcd46092c3e4', // Removing a birthday profile
      ],
    },
    {
      topic: 'In Memoriam',
      ids: [
        '256e9222-3ab3-4953-ad9a-5715eed80139', // How to transition a Profile to "In Memoriam"?
        '8b1c0b2e-36bf-4c1d-a7c5-cc6cd7b1b0b8', // What to expect during the In Memoriam transition process for Birthday profiles?
        '459554bc-0e6f-4079-9b81-a1a6febc441b', // How an "In Memoriam" profile differs from Birthday profiles?
        '6dc333f5-fd43-4090-a7e2-e8f4fe02530c', // How to edit In Memoriam profiles?
        '06b152ad-bc5c-4c47-b7d9-14f74c5f74f9', // How do notifications work for In Memoriam profiles?
      ],
    },
    {
      topic: 'Celebrations',
      ids: [
        '480e252a-c03f-4635-9ecf-6cc6339045a4', // What is Celebrations?
        'a6167c04-1b5a-444a-8aee-90e001fc8f71', // How many celebrations can I add?
        'f4307b53-16cd-49ae-bddf-f9a9bb28c5ee', // What notifications will I get with Celebrations?
        'a9ab5526-9de9-40ff-a853-c65c4abd662a', // I’m not getting a notification. What should I check?
      ],
    },
    {
      topic: 'Anniversaries & bank holidays',
      ids: [
        '78620add-9561-4f3c-b243-47a2c962cacd', // How do I add an Anniversary?
        '81f793aa-2fb1-4ed7-b25c-58d8acb40246', // How do Bank Holidays work?
      ],
    },
  ],
};

// "Popular questions" on /faq until some answers are marked `featured` in the Studio.
export const FAQ_POPULAR_IDS: string[] = [
  'c81d6946-8f08-497a-bf4b-809f62045313', // How do I set up a Bin Day notification?
  '6f3c924c-1273-4ea7-b52d-f9a28285aa9a', // Cuppi Pro and Free tiers
  'edb182df-c77f-4083-8f37-03a539ff2187', // How can I earn free Cuppi Lifetime Pro?
  '10536d90-3d77-4aeb-9116-05b7c42069ae', // How do I approve a Budget?
  '9bbe21a7-0f3f-4fe0-a8ec-5d584c0dee4a', // Adding household members
  'd1a4c73b-f516-49d9-98de-818c3929554a', // Cancelling Pro subscription
];
