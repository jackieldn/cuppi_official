import type { Metadata } from 'next';
import { LegalDocumentLayout } from '@/components/legal/legal-document-layout';
import { SECURITY_CONTACT } from '@/lib/security-txt';

// The vulnerability disclosure policy that /.well-known/security.txt points
// to. Kept in code rather than Sanity: security.txt names this URL, and the
// page must not disappear because a CMS document was unpublished.

export const metadata: Metadata = {
  title: 'Reporting a security problem | Cuppi',
  description: 'How to report a security vulnerability in Cuppi, and what we promise in return.',
};

export default function SecurityPolicyPage() {
  const mail = `mailto:${SECURITY_CONTACT}?subject=${encodeURIComponent('Security report')}`;

  return (
    <LegalDocumentLayout title="Reporting a security problem">
      <p>
        Cuppi holds information about people&apos;s homes and families, so we take its security seriously.
        If you think you have found a vulnerability, we want to hear about it, and we will work with you
        to fix it.
      </p>

      <h2>How to report</h2>
      <p>
        Email <a href={mail}>{SECURITY_CONTACT}</a> with &ldquo;Security report&rdquo; in the subject.
        Please include:
      </p>
      <ul>
        <li>what you found, and where (app screen, web page, or API)</li>
        <li>the steps to reproduce it</li>
        <li>what you think someone could do with it</li>
        <li>how you would like to be credited, if at all</li>
      </ul>
      <p>Please do not report security problems through app reviews, social media or public forums.</p>

      <h2>What we promise</h2>
      <ul>
        <li>We will acknowledge your report within 5 working days.</li>
        <li>We will keep you updated while we investigate and fix it.</li>
        <li>We will tell you when it is fixed, and credit you if you want us to.</li>
        <li>
          If you follow this policy in good faith, we will not take legal action against you or report you
          to the authorities for your research.
        </li>
      </ul>

      <h2>The rules</h2>
      <ul>
        <li>
          Only test with accounts and households you own. Never access, change or delete anyone else&apos;s
          data. If you come across other people&apos;s data by accident, stop, do not keep it, and tell us.
        </li>
        <li>No denial-of-service, spam, or automated scanning at volume.</li>
        <li>No social engineering or phishing of Cuppi users or staff, and no physical attacks.</li>
        <li>
          Give us a reasonable time to fix the problem before you tell anyone else. We aim to fix serious
          issues within 90 days, and will agree a disclosure date with you.
        </li>
      </ul>

      <h2>In scope</h2>
      <ul>
        <li>The Cuppi app for iPhone and iPad</li>
        <li>cuppi.co.uk</li>
        <li>The services the app uses to store and share household data</li>
      </ul>
      <p>
        Out of scope: problems that need a jailbroken or physically compromised device, reports from
        automated tools without a working example, missing best-practice settings with no demonstrated
        impact, and third-party services we use (please report those to the provider).
      </p>

      <h2>Rewards</h2>
      <p>
        Cuppi is a small, independent app and we do not run a paid bug bounty. We are genuinely grateful
        for every report, and with your permission we will thank you publicly.
      </p>
    </LegalDocumentLayout>
  );
}
