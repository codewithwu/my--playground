/**
 * 请求调度器。
 *
 * **两个桶都有未公开的限流,文档对两者都没给数字。** 实测阈值:
 *
 *   creator 桶(09/10/11/12)
 *     背靠背(≈300ms)   → 频繁 30001
 *     间隔 500ms        → 全过          → 取 700ms
 *
 *   normal 桶(02/03/04/07)
 *     间隔 200ms        → 会撞 30001
 *     间隔 300ms        → 全过          → 取 300ms
 *
 * ⚠️ 教训(踩了两次):**「限制并发数」和「限速」是两件事。**
 * 第一次只在 creator 桶加了 limit=1,结果三个串行请求紧挨着发出照样撞 30001;
 * 第二次以为搜索接口额度宽裕(5000/天)就不用限速,结果四个搜索请求同时发出
 * 也撞了。凡是走网络的接口,都要同时限制并发数**和**最小启动间隔。
 *
 * 关键设计:把限流解决在**调度源头**。如果改成「并发发出去、撞了 30001 再重试」,
 * 那是明知限流存在还主动制造失败,而且每次重试都会消耗真实的每日额度。
 */

const CREATOR_LIMIT = 1
const CREATOR_MIN_INTERVAL = 700 // 实测 500ms 可行,留 200ms 余量
const NORMAL_LIMIT = 4
// 搜索接口实测:200ms 间隔会撞 30001,300ms 全过。
// 一开始这里写的是 0(只靠并发 4),结果四个搜索请求同时飞出去就撞了限流
// —— 和 creator 桶是同一个教训:并发数限制不等于限速。
const NORMAL_MIN_INTERVAL = 300

class BucketQueue {
  private readonly queue: (() => void)[] = []
  private active = 0
  private lastStartedAt = 0
  private timer: ReturnType<typeof setTimeout> | null = null
  private readonly limit: number
  private readonly minInterval: number

  constructor(limit: number, minInterval: number) {
    this.limit = limit
    this.minInterval = minInterval
  }

  run<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const start = () => {
        this.active++
        this.lastStartedAt = Date.now()
        task()
          .then(resolve, reject)
          .finally(() => {
            this.active--
            this.pump()
          })
      }
      this.queue.push(start)
      this.pump()
    })
  }

  /** 当前排队数,用于界面提示「已加入队列」。 */
  get pending(): number {
    return this.queue.length
  }

  private pump() {
    if (this.active >= this.limit) return
    const item = this.queue[0]
    if (!item) return

    const wait = this.lastStartedAt + this.minInterval - Date.now()
    if (wait > 0) {
      // 只挂一个定时器,避免队列里每个任务都排一个
      if (this.timer) return
      this.timer = setTimeout(() => {
        this.timer = null
        this.pump()
      }, wait)
      return
    }

    this.queue.shift()
    item()
  }
}

export const creatorQueue = new BucketQueue(CREATOR_LIMIT, CREATOR_MIN_INTERVAL)
export const normalQueue = new BucketQueue(NORMAL_LIMIT, NORMAL_MIN_INTERVAL)
