/* 
  放文章通用工具
  1.把日期格式化成中文日期
  2.把文章 id 转成 URL slug
  3.按发布时间从新到旧排序 
  */

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function getPostSlug(post: { id: string }) {
  return post.id.replace(/\.mdx?$/, "").replace(/\/index$/, "");
}

export function getPostUrl(post: { id: string }) {
  return `/blog/${getPostSlug(post)}/`;
}

export function getReadingMinutes(source: string) {
  const readableCharacters = source
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#_*`>\[\](){}-]/g, "")
    .replace(/\s+/g, "")
    .length;

  return Math.max(1, Math.ceil(readableCharacters / 400));
}

export function sortPosts<T extends { data: { pubDate: Date } }>(posts: T[]) {
  return [...posts].sort(
    (a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime(),
  );
}
