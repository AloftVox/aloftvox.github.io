import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { getPostUrl, sortPosts } from "../lib/posts";

export async function GET(context) {
  const posts = sortPosts(await getCollection("blog"));

  return rss({
    title: "AloftVox 文章",
    description: "技术博客、项目复盘与学习笔记。",
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: getPostUrl(post),
      categories: [post.data.category, ...post.data.tags],
    })),
    customData: "<language>zh-CN</language>",
  });
}
