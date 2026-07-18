import type { OrbitSourceLink } from "../lib/orbitNodes";

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

export const homeSocialLinks: OrbitSourceLink[] = [
  { id: "github", title: "GitHub", href: "https://github.com/AloftVox", description: "代码、实验仓库和开源足迹。", accent: "blue" },
  { id: "gitee", title: "Gitee", href: "https://gitee.com/bushishangu520", description: "国内仓库镜像与项目记录。", accent: "warm" },
  { id: "csdn", title: "CSDN", href: "https://blog.csdn.net/2301_81834742?type=blog", description: "文章、专栏和实训记录。", accent: "rose" },
];

export const homeIntroLines = [
  "记录思考，探索技术的边界。",
];

export const homeHeroRoles = [
  "One year later, you will stand at the height you once loked up to.",
  "Live in the way you like.",
  "Mapping code into constellations.",
  "把每次实践，写成下一次出发的坐标。",
  "Stay curious. Keep shipping.",
];
