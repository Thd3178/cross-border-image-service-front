import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function GuidePage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">使用指南</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          跨境商品图片处理系统的处理流程与两种处理模式说明
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>整体流程</CardTitle>
          <CardDescription>从上传源图片到拿到最终主图的端到端路径</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm leading-relaxed">
          <ol className="list-decimal space-y-1.5 pl-6">
            <li>
              在「快速创建」页面粘贴 1688 商品搜索链接，后端搜索商品，状态变为{" "}
              <Badge variant="outline" className="bg-primary/15 text-primary">搜索中</Badge> →{" "}
              <Badge variant="outline" className="bg-primary/20 text-primary">搜索完成</Badge>
            </li>
            <li>
              在「任务详情」页面勾选需要处理的商品，每张商品卡可选用<b> Normal 模式</b> 或 <b>Zoom 模式</b> 处理（详见下节）
            </li>
            <li>
              点击「开始处理选中商品」或「Qwen 视觉模型全权接管」，任务状态变为{" "}
              <Badge variant="outline" className="bg-amber-100 text-amber-700">处理中</Badge>，顶部流程进度每 5 秒轮询刷新
            </li>
            <li>
              业务侧三态终态：
              <ul className="list-disc pl-6 mt-1 space-y-0.5">
                <li>全部成功 → <Badge variant="outline" className="bg-green-100 text-green-700">已完成</Badge></li>
                <li>部分成功 → <Badge variant="outline" className="bg-amber-100 text-amber-700">部分完成</Badge>，可继续勾选未处理商品并重新提交</li>
                <li>全部失败 → <Badge variant="outline" className="bg-red-100 text-red-700">失败</Badge>，支持点「重试」</li>
              </ul>
            </li>
            <li>已完成的卡片图片自动替换为最终主图（右下盖朱红「已完成」印章），不可再被勾选</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>两种处理模式</CardTitle>
          <CardDescription>依据商品图片中不合规元素的位置选择，请酌情选用</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge variant="default">Normal</Badge>
              <span className="font-medium">普通模式</span>
            </div>
            <p>
              适用于<b>不合规元素（如水印等）在图片边缘</b>，不在商品主体的情况。后端走
              "<b>分割 → 豆包质检 → 合成主图</b>" 三步管线，成本略低。
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Zoom</Badge>
              <span className="font-medium">加强模式</span>
            </div>
            <p>
              适用于<b>商品图片情况复杂</b>，例如<b>不合规元素在商品主体内</b>的情况。
              后端改由 <b>Qwen 视觉模型全权接管</b>，跳过分割、质检、合成三步，
              直接生成含背景的最终主图，相比 Normal 成本略高。
            </p>
          </div>

          <p className="text-xs text-muted-foreground border-l-2 pl-3">
            判断建议：若不合规元素仅在图片边缘且不覆盖商品，选 Normal 即可省成本；
            若不合规元素与商品主体重叠、或原图本身构图复杂，建议用 Zoom 提高成功率。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>成本单价</CardTitle>
          <CardDescription>按实际处理张数计费，未处理不计费</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-4 font-medium">模式</th>
                  <th className="py-2 pr-4 font-medium">单张价格</th>
                  <th className="py-2 font-medium">10 张总价</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="py-2 pr-4">
                    <Badge variant="default">Normal</Badge>
                    <span className="ml-2 text-muted-foreground">普通模式</span>
                  </td>
                  <td className="py-2 pr-4 tabular-nums">¥0.03 / 张</td>
                  <td className="py-2 tabular-nums">¥0.30</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">
                    <Badge variant="secondary">Zoom</Badge>
                    <span className="ml-2 text-muted-foreground">加强模式</span>
                  </td>
                  <td className="py-2 pr-4 tabular-nums">¥2.02 / 张</td>
                  <td className="py-2 tabular-nums">¥20.20</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            说明：Normal 模式按"分割 → 豆包质检 → 合成"管线计费，Zoom 模式由 Qwen 图编辑按张计费。
            实际消耗由后端按 token 数 / 调用次数精确累计，仪表盘「总支出」按使用本系统以来 all-time 累计。
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
