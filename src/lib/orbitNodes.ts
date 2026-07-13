import type { CollectionEntry } from "astro:content";
import type { ProjectEntry } from "../data/projects";
import { formatDate, getPostSlug, getPostUrl } from "./posts";

export type OrbitNodeType = "post" | "category" | "project" | "link";

export interface OrbitSourceCategory {
  key: string;
  title: string;
  href: string;
  count: number;
  description: string;
}

export interface OrbitSourceLink {
  id: string;
  title: string;
  href: string;
  description: string;
  accent: "blue" | "lilac" | "rose" | "warm";
}

export interface OrbitNode {
  id: string;
  type: OrbitNodeType;
  title: string;
  href: string;
  description: string;
  meta: string;
  color: string;
  orbit: number;
  size: number;
  angleSeed: number;
}

const categoryLabels: Record<string, string> = {
  development: "开发",
  research: "科研",
  notes: "笔记",
};

const accentColors = {
  blue: "#6ba9ef",
  lilac: "#aaa0f2",
  rose: "#d88ba4",
  warm: "#d79a5a",
} as const;

const categoryColors: Record<string, string> = {
  all: accentColors.blue,
  development: accentColors.lilac,
  research: accentColors.rose,
  notes: accentColors.warm,
};

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function seedFromId(id: string) {
  return (hashString(id) % 1000) / 1000;
}

export function getPostOrbitNodeId(post: { id: string }) {
  return `post-${getPostSlug(post)}`;
}

export function getCategoryOrbitNodeId(categoryKey: string) {
  return `category-${categoryKey}`;
}

export function getProjectOrbitNodeId(projectId: string) {
  return `project-${projectId}`;
}

export function getLinkOrbitNodeId(linkId: string) {
  return `link-${linkId}`;
}

export function buildOrbitNodes({
  posts,
  categories,
  projects,
  links,
}: {
  posts: CollectionEntry<"blog">[];
  categories: OrbitSourceCategory[];
  projects: ProjectEntry[];
  links: OrbitSourceLink[];
}) {
  const categoryNodes: OrbitNode[] = categories.map((category, index) => {
    const id = getCategoryOrbitNodeId(category.key);
    return {
      id,
      type: "category",
      title: category.title,
      href: category.href,
      description: category.description,
      meta: `${category.count} 个节点`,
      color: categoryColors[category.key] ?? accentColors.blue,
      orbit: 1 + (index % 2),
      size: category.key === "all" ? 1.65 : 1.3,
      angleSeed: seedFromId(id),
    };
  });

  const postNodes: OrbitNode[] = posts.map((post, index) => {
    const id = getPostOrbitNodeId(post);
    const categoryLabel = categoryLabels[post.data.category] ?? post.data.category;
    return {
      id,
      type: "post",
      title: post.data.title,
      href: getPostUrl(post),
      description: post.data.description,
      meta: `${categoryLabel} / ${formatDate(post.data.pubDate)}`,
      color: categoryColors[post.data.category] ?? accentColors.blue,
      orbit: 2 + (index % 3),
      size: post.data.featured ? 1.45 : 1.08,
      angleSeed: seedFromId(id),
    };
  });

  const projectNodes: OrbitNode[] = projects.map((project, index) => {
    const id = getProjectOrbitNodeId(project.id);
    return {
      id,
      type: "project",
      title: project.title,
      href: project.href,
      description: project.description,
      meta: project.tags.join(" / "),
      color: accentColors[project.accent],
      orbit: 3 + (index % 2),
      size: 1.5,
      angleSeed: seedFromId(id),
    };
  });

  const linkNodes: OrbitNode[] = links.map((link, index) => {
    const id = getLinkOrbitNodeId(link.id);
    return {
      id,
      type: "link",
      title: link.title,
      href: link.href,
      description: link.description,
      meta: "外部坐标",
      color: accentColors[link.accent],
      orbit: 4 + (index % 2),
      size: 1.05,
      angleSeed: seedFromId(id),
    };
  });

  return [...categoryNodes, ...postNodes, ...projectNodes, ...linkNodes];
}
