import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { fetchQuota } from '../../lib/api/client'
import { describeError } from '../../lib/api/errors'
import { clearSecret, setSecret, useSecret } from '../../lib/session'
import { Alert } from '../../components/ui/alert'
import { BrandMark } from '../../components/Brand'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'

export function ConnectPage() {
  const existing = useSecret()
  const navigate = useNavigate()

  const [value, setValue] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (existing) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const secret = value.trim()
    if (!secret || pending) return

    setPending(true)
    setError(null)

    // 先写入才能通过 client 发请求;验证失败立即清除,
    // 这样「无效的 Key」不会残留在 sessionStorage 里。
    setSecret(secret)
    try {
      // 02 额度查询不消耗额度,用零成本的方式验证凭据有效性
      await fetchQuota()
      navigate('/', { replace: true })
    } catch (cause) {
      clearSecret()
      setError(describeError(cause))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark className="size-11 rounded-lg" />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">知乎创作者工作台</h1>
          <p className="text-muted-foreground mt-2 text-sm">内容诊断仪表盘与选题搜索雷达</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">连接你的知乎开放平台</CardTitle>
            <CardDescription>
              请填入你自己的 Access Secret。没有它,本应用无法获取任何数据 ——
              知乎开放平台不提供跨账号访问,所有数据只属于凭据所属的账号。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="secret" className="text-sm font-medium">
                  Access Secret
                </label>
                <Input
                  id="secret"
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="粘贴你的 Access Secret"
                  /* 等宽是整页唯一正当的用法:密钥要能一个字符一个字符地核对 */
                  className="font-mono text-sm"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  disabled={pending}
                />
                <p className="text-muted-foreground text-xs">
                  在
                  <a
                    href="https://developer.zhihu.com/profile"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {' '}
                    开放平台个人中心{' '}
                  </a>
                  获取
                </p>
              </div>

              {error ? <Alert tone="destructive">{error}</Alert> : null}

              <Button type="submit" className="w-full" disabled={pending || !value.trim()}>
                {pending ? '正在验证' : '验证并进入'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 border-t border-border pt-5">
          <p className="text-foreground text-sm font-medium">关于你的凭据</p>
          <ul className="text-muted-foreground mt-2 space-y-1.5 text-sm">
            <li>本应用不存储、不代理、不转发任何 Access Secret。</li>
            <li>凭据只保存在浏览器 sessionStorage,关闭标签页即清除。</li>
            <li>请求由你的浏览器直接发往知乎开放平台。</li>
          </ul>
        </div>
      </div>
    </div>
  )
}