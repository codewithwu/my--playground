import {
  CircleDivide,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Search,
  Sun,
  X,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { clearSecret } from '../../lib/session'
import { useTheme, type Theme } from '../../lib/theme'
import { cn } from '../../lib/utils'
import { BrandMark } from '../Brand'
import { Button } from '../ui/button'

const NAV = [
  { to: '/', label: '总览', icon: LayoutDashboard, end: true },
  { to: '/creator', label: '我的创作', icon: FileText, end: false },
  { to: '/discover', label: '发现', icon: Search, end: false },
]

const THEME_ICON: Record<Theme, typeof Sun> = {
  system: CircleDivide,
  light: Sun,
  dark: Moon,
}

const THEME_LABEL: Record<Theme, string> = {
  system: '跟随系统',
  light: '浅色',
  dark: '深色',
}

function Brand() {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <BrandMark />
      {/* 原来这里有一行「内容诊断 · 选题雷达」。删掉了:它不解释任何东西,
          用户点进来两秒内就看懂了,而且正是那种用间隔号拼起来的装饰性副标题。 */}
      <p className="truncate text-sm font-semibold tracking-tight">知乎创作者工作台</p>
    </div>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { theme, cycle } = useTheme()
  const ThemeIcon = THEME_ICON[theme]

  return (
    <div className="min-h-screen">
      {/* 窄屏顶栏 —— 只为把抽屉打开,不承载导航本身 */}
      <header className="bg-background/95 sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 backdrop-blur lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDrawerOpen(true)}
          aria-label="打开导航"
        >
          <Menu />
        </Button>
        <Brand />
      </header>

      <div className="flex">
        {drawerOpen ? (
          <button
            className="bg-foreground/40 fixed inset-0 z-40 lg:hidden"
            onClick={() => setDrawerOpen(false)}
            aria-label="关闭导航"
          />
        ) : null}

        {/* 侧边栏底色与页面底色相同,不单独填充,靠 border-r 分隔。
            lg 以上常驻,lg 以下是抽屉。 */}
        <aside
          className={cn(
            'bg-background fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col border-r transition-transform lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0',
            drawerOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex items-center justify-between gap-2 border-b px-4 py-4">
            <Brand />
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setDrawerOpen(false)}
              aria-label="关闭导航"
            >
              <X />
            </Button>
          </div>

          <nav className="flex-1 space-y-0.5 p-3">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setDrawerOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )
                }
              >
                <Icon className="size-4" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="space-y-0.5 border-t p-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground w-full justify-start"
              onClick={cycle}
            >
              <ThemeIcon />
              {THEME_LABEL[theme]}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground w-full justify-start"
              onClick={clearSecret}
            >
              <LogOut />
              退出并清除
            </Button>
          </div>
        </aside>

        {/* 内容定宽。单人工作台不需要通栏:1200px 是一屏能舒服扫完的宽度,
            再宽的话分布条会被拉得过长,左右两端的数字离得太远。 */}
        <main className="mx-auto w-full min-w-0 max-w-6xl flex-1">{children}</main>
      </div>
    </div>
  )
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-border pb-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-muted-foreground mt-1.5 text-sm">{description}</p>
        ) : null}
      </div>
      {action}
    </header>
  )
}