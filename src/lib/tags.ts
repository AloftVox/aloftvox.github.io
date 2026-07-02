export type TagTone =
  | "code"
  | "security"
  | "ai"
  | "paper"
  | "research"
  | "hardware"
  | "algorithm"
  | "engineering"
  | "general";

const exactToneMap: Record<string, TagTone> = {
  "论文": "paper",
  "论文笔记": "paper",
  "论文讲解": "paper",
  "论文阅读": "paper",
  "paper explanation": "paper",
  "paper notes": "paper",
  "paper reading": "paper",
  algorithm: "algorithm",
  algorithms: "algorithm",
  ast: "code",
  "data structure": "algorithm",
  "deep learning": "ai",
  fpga: "hardware",
  hardware: "hardware",
  mcu: "hardware",
  "neural network": "ai",
  "neural networks": "ai",
  python: "code",
  software: "engineering",
  "static analysis": "code",
  security: "security",
  "vs code": "engineering",
  ai: "ai",
  "machine learning": "ai",
  bfm: "research",
  "wi-fi sensing": "research",
  "software engineering": "engineering",
  "嵌入式": "hardware",
  "深度学习": "ai",
  "神经网络": "ai",
  "软件": "engineering",
  "数据结构": "algorithm",
  "算法": "algorithm",
  "硬件": "hardware",
};

export function getTagTone(tag: string): TagTone {
  const normalized = tag.trim().toLowerCase();
  const exactTone = exactToneMap[normalized];

  if (exactTone) {
    return exactTone;
  }

  if (normalized.includes("paper") || normalized.includes("论文")) {
    return "paper";
  }

  if (normalized.includes("security") || normalized.includes("xss") || normalized.includes("sql")) {
    return "security";
  }

  if (
    normalized.includes("ai") ||
    normalized.includes("learning") ||
    normalized.includes("model") ||
    normalized.includes("neural") ||
    normalized.includes("深度学习") ||
    normalized.includes("神经网络") ||
    normalized.includes("机器学习") ||
    normalized.includes("模型")
  ) {
    return "ai";
  }

  if (normalized.includes("wi-fi") || normalized.includes("sensing") || normalized.includes("research")) {
    return "research";
  }

  if (
    normalized.includes("hardware") ||
    normalized.includes("embedded") ||
    normalized.includes("fpga") ||
    normalized.includes("mcu") ||
    normalized.includes("circuit") ||
    normalized.includes("硬件") ||
    normalized.includes("嵌入式") ||
    normalized.includes("芯片") ||
    normalized.includes("单片机")
  ) {
    return "hardware";
  }

  if (
    normalized.includes("algorithm") ||
    normalized.includes("data structure") ||
    normalized.includes("算法") ||
    normalized.includes("数据结构")
  ) {
    return "algorithm";
  }

  if (normalized.includes("code") || normalized.includes("python") || normalized.includes("ast")) {
    return "code";
  }

  if (
    normalized.includes("engineering") ||
    normalized.includes("development") ||
    normalized.includes("vscode") ||
    normalized.includes("software") ||
    normalized.includes("工程") ||
    normalized.includes("开发") ||
    normalized.includes("软件")
  ) {
    return "engineering";
  }

  return "general";
}
