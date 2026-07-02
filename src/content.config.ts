// 自动读取 src/content/blog/ 下面所有 .md / .mdx 文件

import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({  //规定每篇文章必须有这些 frontmatter
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    category: z.enum(["development", "research", "notes"]),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
  }),
});

export const collections = { blog };
