import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { blogCategories } from "../data/categories";
import { projects } from "../data/projects";
import { getPostUrl, sortPosts } from "../lib/posts";

const escapeXml = (value: string) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

export const GET: APIRoute = async ({ site }) => {
  const baseUrl = site ?? new URL("https://aloftvox.github.io");
  const posts = sortPosts(await getCollection("blog"));
  const populatedCategoryKeys = new Set(posts.map((post) => post.data.category));
  const categoryRoutes = populatedCategoryKeys.size >= 2
    ? blogCategories
        .filter((category) => populatedCategoryKeys.has(category.key))
        .map((category) => ({ path: category.href }))
    : [];

  const entries = [
    { path: "/" },
    { path: "/blog/" },
    { path: "/projects/" },
    { path: "/about/" },
    ...categoryRoutes,
    ...posts.map((post) => ({
      path: getPostUrl(post),
      lastmod: post.data.pubDate.toISOString(),
    })),
    ...projects.map((project) => ({ path: project.href })),
  ];

  const body = entries
    .map(({ path, lastmod }) => {
      const location = escapeXml(new URL(path, baseUrl).href);
      return `  <url>\n    <loc>${location}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}\n  </url>`;
    })
    .join("\n");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
};
