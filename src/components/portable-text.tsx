import { PortableText as PortableTextComponent, PortableTextComponents } from '@portabletext/react'
import Link from 'next/link';
import Image from 'next/image';
import { urlFor } from '@/lib/sanity-client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { YouTubeEmbed } from '@/components/youtube-embed';

const SimpleTableComponent = ({ value }: { value: { rows: { cells: string[] }[] } }) => {
  if (!value?.rows || value.rows.length === 0) {
    return null;
  }

  const headers = value.rows[0]?.cells || [];
  const bodyRows = value.rows.slice(1);

  return (
    <div className="my-6 overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((header, index) => (
              <TableHead key={index}>{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {bodyRows.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {row.cells.map((cell, cellIndex) => (
                <TableCell key={cellIndex}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};


const components: PortableTextComponents = {
  // Defines how to render different block types from Sanity.
  block: {
    h1: ({ children }) => <h1 className="font-headline text-4xl font-bold mt-12 mb-4">{children}</h1>,
    h2: ({ children }) => <h2 className="font-headline text-3xl font-bold mt-12 mb-4">{children}</h2>,
    h3: ({ children }) => <h3 className="font-headline text-2xl font-bold mt-8 mb-3">{children}</h3>,
    blockquote: ({ children }) => <blockquote className="border-l-4 border-primary pl-4 italic my-4">{children}</blockquote>,
    normal: ({ children }) => <p className="mb-4">{children}</p>,
  },
  
  // Defines how to render list structures.
  list: {
    bullet: ({ children }) => <ul className="list-disc list-inside mb-4 pl-4 space-y-2">{children}</ul>,
    number: ({ children }) => <ol className="list-decimal list-inside mb-4 pl-4 space-y-2">{children}</ol>,
  },

  // Defines how to render list items within the above lists.
  listItem: {
    bullet: ({ children }) => <li>{children}</li>,
    number: ({ children }) => <li>{children}</li>,
  },

  // Defines how to render annotations within text, such as links.
  marks: {
    link: ({ children, value }) => {
      const href = value?.href || '';
      const isInternal = href.startsWith('/');
      
      const target = isInternal ? undefined : '_blank';
      const rel = isInternal ? undefined : 'noopener noreferrer';

      if (isInternal) {
        return <Link href={href} className="text-primary underline hover:no-underline">{children}</Link>;
      }
      
      return (
        <a href={href} target={target} rel={rel} className="text-primary underline hover:no-underline">
          {children}
        </a>
      );
    },
  },

  // Defines how to render custom block types, like images.
  types: {
    image: ({ value }) => {
      if (!value?.asset) {
        return null;
      }
      
      const { width, height } = value.asset?.metadata?.dimensions || { width: 1200, height: 630 };
      
      return (
        <figure className="my-8">
          <Image
            src={urlFor(value).url()}
            alt={value.alt || 'Cuppi App Image'}
            loading="lazy"
            width={width}
            height={height}
            className="rounded-lg shadow-md mx-auto"
            quality={100}
          />
          {value.caption && (
            <figcaption className="text-center text-sm text-muted-foreground mt-2">
              {value.caption}
            </figcaption>
          )}
        </figure>
      );
    },
    simpleTable: SimpleTableComponent,
    youtube: ({ value }) => <YouTubeEmbed url={value?.url} />,
  }
};

// Answers sit under a question that is already an <h3>, so headings inside them
// become <h4>, and lists hang outside the text like they do in the app.
const answerComponents: PortableTextComponents = {
  ...components,
  block: {
    h1: ({ children }) => <h4 className="font-headline text-lg font-bold mt-5 mb-2">{children}</h4>,
    h2: ({ children }) => <h4 className="font-headline text-lg font-bold mt-5 mb-2">{children}</h4>,
    h3: ({ children }) => <h4 className="font-headline text-lg font-bold mt-5 mb-2">{children}</h4>,
    blockquote: ({ children }) => <blockquote className="border-l-4 border-primary pl-4 italic my-3">{children}</blockquote>,
    normal: ({ children }) => <p className="mb-3">{children}</p>,
  },
  list: {
    bullet: ({ children }) => <ul className="list-disc pl-6 mb-3 space-y-1.5">{children}</ul>,
    number: ({ children }) => <ol className="list-decimal pl-6 mb-3 space-y-1.5">{children}</ol>,
  },
};

/**
 * A wrapper around Sanity's PortableText component that applies
 * project-specific rendering rules.
 * @param value - The Portable Text data to render.
 * @param variant - "answer" for FAQ answers (compact, headings become h4).
 */
export function PortableText({ value, variant = 'default' }: { value: any; variant?: 'default' | 'answer' }) {
  if (!value) return null;
  return <PortableTextComponent value={value} components={variant === 'answer' ? answerComponents : components} />;
}
