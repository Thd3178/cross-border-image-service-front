import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { Components } from "react-markdown"

const sharedComponents: Components = {
  h1: ({ node, ...props }) => (
    <h1 className="mt-4 mb-2 text-xl font-semibold" {...props} />
  ),
  h2: ({ node, ...props }) => (
    <h2 className="mt-3 mb-2 text-base font-semibold" {...props} />
  ),
  h3: ({ node, ...props }) => (
    <h3 className="mt-2 mb-1 text-sm font-semibold" {...props} />
  ),
  p: ({ node, ...props }) => <p className="my-2" {...props} />,
  ul: ({ node, ...props }) => (
    <ul className="my-2 list-disc pl-5" {...props} />
  ),
  ol: ({ node, ...props }) => (
    <ol className="my-2 list-decimal pl-5" {...props} />
  ),
  blockquote: ({ node, ...props }) => (
    <blockquote
      className="my-2 border-l-2 border-border pl-3 italic text-muted-foreground"
      {...props}
    />
  ),
  code: ({ node, className, ...props }) => {
    const isInline = !className
    if (isInline) {
      return (
        <code
          className="rounded bg-muted px-1 py-0.5 text-xs"
          {...props}
        />
      )
    }
    return (
      <code
        className="block overflow-x-auto rounded bg-muted p-2 text-xs"
        {...props}
      />
    )
  },
  a: ({ node, ...props }) => (
    <a
      className="text-primary underline underline-offset-4"
      target="_blank"
      rel="noreferrer"
      {...props}
    />
  ),
}

/**
 * 公用 Markdown 渲染器。复用 2+ 次（AnnouncementsPopup + AnnouncementDetailPage
 * + 后续 admin 公告编辑预览），按 DESIGN.md Section 5 在此登记为复用组件。
 *
 * 不依赖 `@tailwindcss/typography` 的 `prose` 类——本项目当前未装该插件，
 * 避免因样式空挂留坑。基础排版样式从 `sharedComponents` 给出即可。
 */
export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={sharedComponents}>
      {content}
    </ReactMarkdown>
  )
}
