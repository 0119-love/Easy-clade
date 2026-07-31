const LANGUAGE_EXTENSIONS: Record<string, string> = {
  typescript: "ts",
  ts: "ts",
  tsx: "tsx",
  javascript: "js",
  js: "js",
  jsx: "jsx",
  python: "py",
  py: "py",
  json: "json",
  css: "css",
  html: "html",
  sql: "sql",
  bash: "sh",
  sh: "sh",
  shell: "sh",
  markdown: "md",
  md: "md",
  yaml: "yaml",
  yml: "yaml",
  go: "go",
  rust: "rs",
  rs: "rs",
  java: "java",
  c: "c",
  cpp: "cpp",
  "c++": "cpp",
  ruby: "rb",
  rb: "rb",
  php: "php",
};

const CODE_FENCE = /```(\w+)?\r?\n([\s\S]*?)```/;

export interface ExtractedCodeFile {
  content: string;
  extension: string;
}

/**
 * Pulls the first fenced code block out of a model response. Falls back to
 * treating the entire response as markdown if no fence is found, so a run
 * never silently produces an empty/lost file.
 */
export function extractCodeFile(responseText: string): ExtractedCodeFile {
  const match = CODE_FENCE.exec(responseText);
  if (!match) {
    return { content: responseText, extension: "md" };
  }
  const [, lang, code] = match;
  const extension = (lang && LANGUAGE_EXTENSIONS[lang.toLowerCase()]) || "txt";
  return { content: code, extension };
}

const EXTENSION_MIME_TYPES: Record<string, string> = {
  ts: "text/typescript",
  tsx: "text/typescript",
  js: "text/javascript",
  jsx: "text/javascript",
  py: "text/x-python",
  json: "application/json",
  css: "text/css",
  html: "text/html",
  sql: "application/sql",
  sh: "text/x-shellscript",
  md: "text/markdown",
  yaml: "text/yaml",
  go: "text/x-go",
  rs: "text/rust",
  java: "text/x-java-source",
  c: "text/x-c",
  cpp: "text/x-c++",
  rb: "text/x-ruby",
  php: "text/x-php",
};

export function mimeTypeForExtension(extension: string): string {
  return EXTENSION_MIME_TYPES[extension] ?? "text/plain";
}

function slugify(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, "-")
      .replace(/^-+|-+$/g, "") || "automation"
  );
}

/** Resolves the final filename for a code-output automation run: user-specified name wins as-is, else auto-generated. */
export function resolveFilename(automationName: string, userFilename: string | null, extension: string): string {
  if (userFilename?.trim()) return userFilename.trim();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${slugify(automationName)}-${timestamp}.${extension}`;
}
