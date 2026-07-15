export interface BreadcrumbItem {
  name: string;
  path: string;
}

function escapeHTML(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderBreadcrumbs(
  items: BreadcrumbItem[],
  origin: string,
): { navigation: string; structuredData: string; canonical: string } {
  const navigation = `<nav class="breadcrumbs" aria-label="Breadcrumb">
    <ol>
      ${
    items.map((item, index) => {
      const current = index === items.length - 1;
      return current
        ? `<li aria-current="page"><span>${escapeHTML(item.name)}</span></li>`
        : `<li><a href="${escapeHTML(item.path)}">${escapeHTML(item.name)}</a></li>`;
    }).join("\n      ")
  }
    </ol>
  </nav>`;

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: new URL(item.path, origin).href,
    })),
  };
  const json = JSON.stringify(schema).replace(/</g, "\\u003c");

  const canonicalURL = new URL(items.at(-1)?.path ?? "/", origin).href;

  return {
    navigation,
    structuredData: `<script type="application/ld+json">${json}</script>`,
    canonical: `<link rel="canonical" href="${escapeHTML(canonicalURL)}">`,
  };
}
