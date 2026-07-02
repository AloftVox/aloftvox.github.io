export const categoryMap = {
  development: {
    key: "development",
    label: "开发",
    href: "/blog/category/development/",
    description: "工程实践、工具开发、代码安全与项目复盘。",
  },
  research: {
    key: "research",
    label: "科研",
    href: "/blog/category/research/",
    description: "实验记录、问题观察、方法反思与研究进展。",
  },
  notes: {
    key: "notes",
    label: "学习笔记",
    href: "/blog/category/notes/",
    description: "课程、实训、阅读和技术学习中的阶段性笔记。",
  },
} as const;

export type BlogCategoryKey = keyof typeof categoryMap;

export const blogCategories = Object.values(categoryMap);

export function getCategoryMeta(category: string) {
  return categoryMap[category as BlogCategoryKey] ?? {
    key: category,
    label: category,
    href: "/blog/",
    description: "技术文章",
  };
}
