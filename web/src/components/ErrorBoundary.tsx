import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from './ui/button'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * 顶层错误边界。
 *
 * 没有它的话,任何组件渲染抛错都会变成整页白屏 —— 用户看不出发生了什么,
 * 只能刷新。知乎接口偶尔返回 90001,加上浏览器扩展干扰,渲染期抛错并非
 * 纯理论问题。
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('渲染出错', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-lg font-semibold tracking-tight">页面出错了</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            渲染过程中发生异常。可以先重试,如果反复出现,请检查网络或重新连接知乎开放平台。
          </p>
          <pre className="bg-muted text-muted-foreground mt-4 overflow-x-auto rounded-md p-3 text-left text-xs">
            {error.message}
          </pre>
          <div className="mt-5 flex justify-center gap-2">
            {/* 走 Button 原语,否则这两颗按钮不会跟着主题走 —— 错误页恰恰是最需要看得清的时候 */}
            <Button type="button" onClick={() => this.setState({ error: null })}>
              重试
            </Button>
            <Button type="button" variant="outline" onClick={() => window.location.reload()}>
              刷新页面
            </Button>
          </div>
        </div>
      </div>
    )
  }
}
