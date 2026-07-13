import type { OrbitNode, OrbitSourceLink } from "../lib/orbitNodes";

export interface HomeOrbitCategory {
  id: string;
  name: string;
  count: number;
  color: string;
  description: string;
  href: string;
  orbit: number;
  angleSeed: number;
}

export interface HomeArticle {
  id: string;
  title: string;
  category: string;
  categoryId: string;
  date: string;
  readingTime: string;
  tags: string[];
  href: string;
  color: string;
  description?: string;
}

export const orbitCategories: HomeOrbitCategory[] = [
  { id: "web-development", name: "Web Development", count: 28, color: "#64a8ff", description: "工程化、框架、性能优化与 Web 技术积累", href: "/blog/category/development/", orbit: 1, angleSeed: 0.16 },
  { id: "frontend", name: "Frontend", count: 42, color: "#a986ff", description: "前端视角、组件化、状态管理与 UI 实践", href: "/blog/category/development/", orbit: 2, angleSeed: 0.34 },
  { id: "deep-dives", name: "Deep Dives", count: 36, color: "#e6b85c", description: "技术原理、底层机制与深入研究", href: "/blog/category/research/", orbit: 3, angleSeed: 0.72 },
  { id: "design-ux", name: "Design & UX", count: 18, color: "#ec8fa0", description: "设计系统、用户体验与视觉思考", href: "/blog/category/notes/", orbit: 2, angleSeed: 0.71 },
  { id: "tools-workflow", name: "Tools & Workflow", count: 24, color: "#6dcde8", description: "VS Code、效率工具与开发工作流", href: "/blog/category/development/", orbit: 2, angleSeed: 0.46 },
  { id: "life-thinking", name: "Life & Thinking", count: 14, color: "#e2bb66", description: "成长记录、方法论与个人思考", href: "/blog/category/notes/", orbit: 3, angleSeed: 0.93 },
  { id: "projects", name: "Projects", count: 12, color: "#df8098", description: "项目展示、实验记录与作品沉淀", href: "/projects/", orbit: 2, angleSeed: 0.68 },
];

export const demoArticles: HomeArticle[] = [
  { id: "astro-content-collections", title: "用 Astro 构建高性能博客：内容集合与类型安全实践", category: "Web Development", categoryId: "web-development", date: "2026-06-18", readingTime: "8 min read", tags: ["astro", "content-collections", "typescript"], href: "/blog/", color: "#64a8ff", description: "内容集合、类型推断与静态博客工程实践。" },
  { id: "astro-islands", title: "浅谈 Islands 架构：以 Astro 为例", category: "Frontend", categoryId: "frontend", date: "2026-06-10", readingTime: "6 min read", tags: ["astro", "islands-architecture"], href: "/blog/", color: "#a986ff", description: "从交互边界理解 Islands 架构与局部水合。" },
  { id: "maintainable-design-system", title: "我如何设计一个可长期维护的设计系统", category: "Design & UX", categoryId: "design-ux", date: "2026-06-02", readingTime: "10 min read", tags: ["design-system", "figma", "tokens"], href: "/blog/", color: "#ec8fa0", description: "从设计变量到组件约束的系统化实践。" },
  { id: "vscode-workflow", title: "在 VS Code 中打造高效的前端开发工作流", category: "Tools & Workflow", categoryId: "tools-workflow", date: "2026-05-26", readingTime: "7 min read", tags: ["vscode", "productivity", "extensions"], href: "/blog/", color: "#6dcde8", description: "让编辑器、任务与扩展形成可复用的工作流。" },
  { id: "state-management", title: "状态管理的取舍：从本地状态到全局状态", category: "Deep Dives", categoryId: "deep-dives", date: "2026-05-19", readingTime: "9 min read", tags: ["state-management", "react"], href: "/blog/", color: "#e6b85c", description: "从边界、成本与一致性分析状态管理方案。" },
  { id: "focus-growth", title: "写给未来的自己：关于专注与成长", category: "Life & Thinking", categoryId: "life-thinking", date: "2026-05-12", readingTime: "5 min read", tags: ["growth", "habits"], href: "/blog/", color: "#e2bb66", description: "关于长期主义、专注和个人成长的阶段记录。" },
];

export const featuredProject = {
  name: "AloftVox Starter",
  description: "为内容创作而生的 Astro 博客模板",
  detail: "一个专注于性能、可维护内容结构与沉浸式首页体验的博客起点。",
  tags: ["Astro", "TypeScript", "Tailwind CSS", "MDX"],
  href: "/projects/",
  github: "https://github.com/AloftVox",
};

export const homeSocialLinks: OrbitSourceLink[] = [
  { id: "github", title: "GitHub", href: "https://github.com/AloftVox", description: "代码、实验仓库和开源足迹。", accent: "blue" },
  { id: "gitee", title: "Gitee", href: "https://gitee.com/bushishangu520", description: "国内仓库镜像与项目记录。", accent: "warm" },
  { id: "csdn", title: "CSDN", href: "https://blog.csdn.net/2301_81834742?type=blog", description: "文章、专栏和实训记录。", accent: "rose" },
];

export const homeIntroLines = [
  "记录思考，探索技术的边界。",
  "把文章、项目和实验连接成一张可探索的星图。",
];

export const homeHeroRoles = ["Follow one node into the next idea."];

export function buildHomeOrbitNodes(): OrbitNode[] {
  return orbitCategories.map((category, index) => ({
    id: `category-${category.id}`,
    type: "category",
    title: category.name,
    href: category.href,
    description: category.description,
    meta: `${category.count} posts`,
    color: category.color,
    orbit: category.orbit,
    size: index === 0 || index === 2 ? 2.12 : 1.88,
    angleSeed: category.angleSeed,
  }));
}

export const previewByNode = Object.fromEntries(
  orbitCategories.map((category) => [
    `category-${category.id}`,
    demoArticles.find((article) => article.categoryId === category.id) ?? demoArticles[0],
  ]),
) as Record<string, HomeArticle>;
