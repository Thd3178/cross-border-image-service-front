import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function GuidePage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">使用指南</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          跨境商品图片处理系统的完整流程、两种处理模式与价格查询
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
              <Badge variant="outline" className="bg-blue-100 text-blue-700">搜索中</Badge> →{" "}
              <Badge variant="outline" className="bg-cyan-100 text-cyan-700">搜索完成</Badge>
            </li>
            <li>
              在「任务详情」页面勾选需要处理的商品，每张商品卡支持两种处理模式：
              <ul className="list-disc pl-6 mt-1 space-y-0.5">
                <li><b>原流程</b>：分割 → 豆包质检 → (失败) 回填 → 合成主图</li>
                <li><b>Qwen 视觉接管</b>：直接调 Qwen 出含背景主图，跳过分割/质检/合成</li>
              </ul>
            </li>
            <li>
              点击「开始处理选中商品」或「Qwen 视觉模型全权接管」，任务状态变为{" "}
              <Badge variant="outline" className="bg-purple-100 text-purple-700">处理中</Badge>，顶部流水线步骤图每 5 秒轮询刷新
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
          <CardTitle>价格计算</CardTitle>
          <CardDescription>所有单价均按实际消耗计费，未使用不计费</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-4 font-medium">计费项</th>
                  <th className="py-2 pr-4 font-medium">单价</th>
                  <th className="py-2 font-medium">触发场景</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="py-2 pr-4">阿里云图像分割</td>
                  <td className="py-2 pr-4 tabular-nums">¥0.002 / 次</td>
                  <td className="py-2">原流程每个商品 1 次</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">豆包 Doubao 输入 Token</td>
                  <td className="py-2 pr-4 tabular-nums">¥0.20 / 百万 tokens</td>
                  <td className="py-2">原流程质检阶段</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">豆包 Doubao 输出 Token</td>
                  <td className="py-2 pr-4 tabular-nums">¥2.00 / 百万 tokens</td>
                  <td className="py-2">原流程质检阶段</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Qwen-image-2.0 视觉接管</td>
                  <td className="py-2 pr-4 tabular-nums">¥0.20 / 张</td>
                  <td className="py-2">Qwen 接管模式每个商品 1 张</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">OSS 存储 / 转存</td>
                  <td className="py-2 pr-4 text-muted-foreground">按实际账单另计</td>
                  <td className="py-2">分割图、合成图、Qwen 编辑图转存</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            示例：N 个商品走原流程全部一次通过 = (0.002 × N) + (0.20 × P_in + 2.00 × P_out) ；
            N 个商品走 Qwen 视觉接管 = 0.20 × N。每张图的费用由后端在「总支出」中累计，仪表盘「总支出」按从使用系统起 all-time 累计。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Qwen 视觉接管说明</CardTitle>
          <CardDescription>何时用、与原流程的区别</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm leading-relaxed">
          <p>
            Qwen 接管模式由 Qwen 直接生成含背景的最终主图，跳过分割、质检、合成三个阶段。
          </p>
          <p>
            调用入口：任务详情页勾选商品后点击「Qwen 视觉模型全权接管」按钮，后端会对勾选的商品改用 Qwen 出图 → 转存到本服务 → 标记为已完成。
          </p>
          <p>
            适合：原流程因质检频繁失败的品类、对画面有较强整体控制需求的电商主图、希望跳过质检/合成换更稳定主图的场景。
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
