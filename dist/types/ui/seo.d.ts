export interface PageMeta {
    /** Canonical URL of the page; used for @id values. */
    url?: string;
    /** Adds an article node. Default type NewsArticle. */
    headline?: string;
    type?: 'NewsArticle' | 'Article' | 'BlogPosting';
    description?: string;
    image?: string;
    datePublished?: string;
    dateModified?: string;
    author?: string | {
        name: string;
        url?: string;
        type?: 'Person' | 'Organization';
    };
    publisher?: {
        name: string;
        logo?: string;
        url?: string;
    };
    inLanguage?: string;
    breadcrumbs?: {
        name: string;
        url: string;
    }[];
}
type Node = Record<string, unknown>;
/** A schema.org @graph for a document (and optionally the article it sits in). */
export declare function jsonLd(input: unknown, meta?: PageMeta): {
    '@context': string;
    '@graph': Node[];
};
/** The same, as a <script type="application/ld+json"> tag for the page head or body. */
export declare function jsonLdScript(input: unknown, meta?: PageMeta): string;
export {};
