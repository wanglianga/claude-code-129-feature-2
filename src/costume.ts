import type { CostumeRecord, CostumeSize, CostumeStock, DepositStatus, Program } from './types'
import { SIZES } from './types'

/** 押金状态 → 是否算“已交押金”（用于旧逻辑兼容） */
export function depositPaidOf(c: CostumeRecord): boolean {
  return c.depositStatus !== 'unpaid'
}

/** 当前生效押金（启用备用服后以备用服押金为准） */
export function activeDeposit(c: CostumeRecord): { amount: number; status: DepositStatus } {
  if (c.backupEnabled) return { amount: c.backupDeposit, status: c.backupDepositStatus }
  return { amount: c.deposit, status: c.depositStatus }
}

/** 某尺码当前可换库存（未维护记 0） */
export function stockOf(stocks: CostumeStock[], programId: string, size: CostumeSize): number {
  const st = stocks.find((x) => x.programId === programId)
  return st?.stock[size] ?? 0
}

/** 服装负责人是否已确认某节目库存 */
export function stockConfirmed(stocks: CostumeStock[], programId: string): boolean {
  return stocks.some((x) => x.programId === programId && x.confirmed)
}

export interface SizeShortage {
  size: CostumeSize
  /** 正在返换 / 长期换不到该尺码的人次 */
  demand: number
  /** 历史上报原尺码偏小的累计人次（含已换到） */
  reports: number
  stock: number
  /** 需求 - 库存 > 0 视为紧缺 */
  gap: number
}

/**
 * 哪些尺码长期紧缺：
 * 统计所有非归档节目中，因“原尺码偏小”而发起返换、期望换到某尺码的需求，
 * 减去该尺码当前可换库存；gap>0 即紧缺，按缺口降序。
 */
export function sizeShortages(
  programs: Program[],
  costumes: CostumeRecord[],
  stocks: CostumeStock[],
): SizeShortage[] {
  const active = new Set(programs.filter((p) => p.stage !== 'archived').map((p) => p.id))
  const demand = new Map<CostumeSize, number>()
  const reports = new Map<CostumeSize, number>()
  costumes.forEach((c) => {
    if (!active.has(c.programId)) return
    // 凡是发起过返换的，都计入其“期望尺码”的历史需求
    if (c.exchangeStatus && c.wantedSize) {
      reports.set(c.wantedSize, (reports.get(c.wantedSize) ?? 0) + 1)
      // 只要没真正换到合适尺码（待报/待换/无货/调站位/备用顶替），该尺码都算仍然紧缺；
      // 调站位与启用备用服只是绕过，并未补上该尺码库存。
      if (c.exchangeStatus !== 'exchanged') {
        demand.set(c.wantedSize, (demand.get(c.wantedSize) ?? 0) + 1)
      }
    }
  })
  const stockBySize = new Map<CostumeSize, number>()
  stocks.forEach((st) => {
    if (!active.has(st.programId)) return
    SIZES.forEach((sz) => stockBySize.set(sz, (stockBySize.get(sz) ?? 0) + (st.stock[sz] ?? 0)))
  })
  return SIZES
    .map((size) => {
      const d = demand.get(size) ?? 0
      const r = reports.get(size) ?? 0
      const stock = stockBySize.get(size) ?? 0
      return { size, demand: d, reports: r, stock, gap: Math.max(0, d - stock) }
    })
    .filter((x) => x.reports > 0 || x.demand > 0)
    .sort((a, b) => b.gap - a.gap || b.demand - a.demand)
}

/** 是否存在演出前仍换不到、等待队长处置的返换单 */
export function pendingFallback(c: CostumeRecord): boolean {
  return c.exchangeStatus === 'unresolved'
}

/** 返换单是否仍未闭环（待报/待换/待处置算未闭环；换到、调站位、备用顶替算闭环） */
export function exchangeOpen(c: CostumeRecord): boolean {
  return c.exchangeStatus !== ''
    && c.exchangeStatus !== 'exchanged'
    && c.exchangeStatus !== 'backup'
    && c.exchangeStatus !== 'repositioned'
}

/** 备用服是否尚未完成“归还 + 清洗”闭环 */
export function backupOpen(c: CostumeRecord): boolean {
  return c.backupEnabled && (!c.backupReturned || !c.cleaningDone)
}
