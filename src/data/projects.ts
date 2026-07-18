export interface ProjectEntry {
  id: string;
  title: string;
  description: string;
  detail: string;
  href: string;
  sourceHref?: string;
  sourceLabel?: string;
  status: string;
  role: string;
  form: string;
  tags: string[];
  accent: "blue" | "lilac" | "rose" | "warm";
}

export const projects: ProjectEntry[] = [
  {
    id: "codeguard-tutor",
    title: "CodeGuard Tutor",
    description: "面向初学开发者的 VS Code 代码安全学习插件。",
    detail: "结合静态分析与 AI 辅助解释，记录已实现能力和仍待完善的方向。",
    href: "/projects/codeguard-tutor/",
    sourceHref: "https://gitee.com/celinaN/code-guard-tutor",
    sourceLabel: "Gitee",
    status: "阶段性告一段落",
    role: "Python / JS 静态逻辑分析",
    form: "VS Code 插件",
    tags: ["VS Code", "Security", "AI"],
    accent: "rose",
  },
];
