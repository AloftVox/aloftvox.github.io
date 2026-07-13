export interface ProjectEntry {
  id: string;
  title: string;
  description: string;
  href: string;
  tags: string[];
  accent: "blue" | "lilac" | "rose" | "warm";
}

export const projects: ProjectEntry[] = [
  {
    id: "codeguard-tutor",
    title: "CodeGuard Tutor",
    description: "面向初学开发者的 VS Code 代码安全学习插件。",
    href: "/projects/codeguard-tutor/",
    tags: ["VS Code", "Security", "AI"],
    accent: "lilac",
  },
];
