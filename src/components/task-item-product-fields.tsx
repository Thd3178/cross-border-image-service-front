import {
  formatTaskItemFieldValue,
  getTaskItemAdditionalProductFields,
  type TaskItem,
} from "@/lib/api"
import { Button } from "@/components/ui/button"
import { RiExternalLinkLine } from "@remixicon/react"

interface TaskItemProductFieldsProps {
  item: TaskItem
  compact?: boolean
}

export function TaskItemProductFields({
  item,
  compact = false,
}: TaskItemProductFieldsProps) {
  const fields = getTaskItemAdditionalProductFields(item)
  if (fields.length === 0) return null

  return (
    <div
      className={
        compact
          ? "space-y-1 border-t border-border/60 pt-2 text-[11px]"
          : "grid gap-x-6 gap-y-3 border-t border-border/60 pt-4 sm:grid-cols-2"
      }
    >
      {fields.map(([key, value]) => {
        const text = formatTaskItemFieldValue(value)
        const isUrl = typeof value === "string" && /^https?:\/\//i.test(value)

        return (
          <div key={key} className="min-w-0">
            <p className="text-xs text-muted-foreground">{key}</p>
            {isUrl ? (
              <Button
                asChild
                variant="outline"
                size={compact ? "xs" : "sm"}
                className="mt-0.5"
              >
                <a
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gap-1"
                >
                  <RiExternalLinkLine className="size-3.5" />
                  点击前往 1688 查看
                </a>
              </Button>
            ) : (
              <p className="whitespace-pre-wrap break-words text-sm text-foreground">
                {text}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
