import { useEffect } from "react";

interface JsonLdProps {
  /** A structured-data object (will be serialized to JSON) or an array of them. */
  data: Record<string, unknown> | Record<string, unknown>[];
  /** Optional key to dedupe the script tag by, defaults to "page". */
  id?: string;
}

/**
 * Injects a <script type="application/ld+json"> tag into <head> for the
 * lifetime of the component, then removes it on unmount. Lets individual
 * pages ship schema.org structured data (Product, BreadcrumbList, etc.)
 * for richer search results.
 */
export default function JsonLd({ data, id = "page" }: JsonLdProps) {
  useEffect(() => {
    const scriptId = `jsonld-${id}`;
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;

    const script: HTMLScriptElement = existing || document.createElement("script");
    script.id = scriptId;
    script.type = "application/ld+json";
    script.text = JSON.stringify(data);
    if (!existing) {
      document.head.appendChild(script);
    }

    return () => {
      const el = document.getElementById(scriptId);
      if (el) el.remove();
    };
  }, [data, id]);

  return null;
}
