import { create } from 'zustand'
import type {
  CheckinStatus, CostumeRecord, CostumeSize, CostumeStock, DepositStatus, Enrollment, FormationLog,
  Member, Notice, Photo, Program, Rehearsal, Role, Room, RoomBooking, Stage, Team,
} from './types'
import { activeDeposit, exchangeOpen } from './costume'
import * as seed from './seed'

let seq = 100
const nid = (p: string) => `${p}${seq++}`
const now = () => {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const STAGE_ORDER: Stage[] = ['signup', 'rehearsing', 'positioning', 'costume', 'review', 'ready', 'showday', 'archived']

interface State {
  role: Role
  currentMemberId: string // 队员视角下“我是谁”
  teams: Team[]
  members: Member[]
  programs: Program[]
  enrollments: Enrollment[]
  rehearsals: Rehearsal[]
  costumes: CostumeRecord[]
  costumeStocks: CostumeStock[]
  rooms: Room[]
  bookings: RoomBooking[]
  notices: Notice[]
  photos: Photo[]
  formationLogs: FormationLog[]
  onsite: Record<string, Record<string, boolean>> // programId -> memberId -> 已到

  setRole: (r: Role) => void
  setCurrentMember: (id: string) => void

  // 报名
  publishProgram: (p: Pick<Program, 'title' | 'type' | 'theme' | 'durationMin' | 'soundNeeds' | 'isAudition' | 'showDate'>, teamId: string) => void
  enroll: (programId: string, memberId: string, size: CostumeSize, joinFormal: boolean, healthNotes: string, slots: string[]) => void
  advanceStage: (programId: string) => void

  // 排练签到
  checkin: (rehearsalId: string, memberId: string, status: CheckinStatus) => void
  setRehearsalNote: (rehearsalId: string, note: string) => void
  addRehearsal: (programId: string, roomId: string, date: string, timeSlot: string) => void

  // 曲目与分段
  uploadMusicVersion: (programId: string, label: string, fileName: string, note: string, by: string) => void
  toggleFocusMember: (programId: string, segmentId: string, memberId: string) => void

  // 走位
  assignCell: (programId: string, row: number, col: number, memberId: string | null) => void
  shrinkVenue: (programId: string, newCols: string) => void
  addFormationChange: (programId: string, atSegment: string, desc: string) => void

  // 服装
  payDeposit: (memberId: string, programId: string) => void
  pickupCostume: (memberId: string, programId: string, byWho: string) => void
  returnCostume: (memberId: string, programId: string) => void
  /** 领取后发现尺码偏小：记录试穿照片、原尺码、领取人与期望尺码，生成返换单 */
  reportSizeIssue: (memberId: string, programId: string, issue: string, wantedSize: CostumeSize, photo: string) => void
  /** 兼容旧接口的简化上报（无照片/期望尺码） */
  reportSizeIssueSimple: (memberId: string, programId: string, issue: string) => void
  /** 服装负责人核对可换库存后标记“可换/无货” */
  markExchangeStock: (memberId: string, programId: string, available: boolean) => void
  /** 换到合适尺码：扣减库存、更新尺码与押金状态 */
  exchangeCostume: (memberId: string, programId: string, newSize: CostumeSize) => string | null
  /** 演出前换不到：队长处置——调整站位（生成走位记录+通知） */
  resolveByFormation: (memberId: string, programId: string, note: string) => void
  /** 演出前换不到：队长处置——启用备用服装（押金/清洗/归还重新记录） */
  enableBackup: (memberId: string, programId: string, backupSize: CostumeSize, deposit: number, cleaningOwner: string) => string | null
  /** 备用服押金收取 / 归还退押金 */
  payBackupDeposit: (memberId: string, programId: string) => void
  returnBackup: (memberId: string, programId: string) => void
  setCleaningDone: (memberId: string, programId: string, done: boolean) => void

  // 服装库存（服装负责人确认）
  initStock: (programId: string) => void
  setStock: (programId: string, size: CostumeSize, qty: number) => void
  confirmStock: (programId: string, by: string) => void

  // 文化站
  reviewProgram: (programId: string, result: 'approved' | 'changes_requested' | 'rejected', comment: string, by: string) => void
  setVenueApproval: (programId: string, approved: boolean, note: string) => void

  // 演出日
  onsiteCheckin: (programId: string, memberId: string) => void
  moveWaiting: (programId: string, dir: -1 | 1) => void

  // 通知 / 档案
  addNotice: (text: string, level: Notice['level'], targets: Role[], kind: Notice['kind'], programId: string | null) => void
  addPhoto: (programId: string, emoji: string, caption: string) => void

  // 排练室
  bookRoom: (roomId: string, teamId: string, date: string, timeSlot: string, purpose: string) => string | null
  cancelBooking: (id: string) => void
}

export const useStore = create<State>((set, get) => ({
  role: 'leader',
  currentMemberId: 'm2',
  teams: seed.teams,
  members: seed.members,
  programs: seed.programs,
  enrollments: seed.enrollments,
  rehearsals: seed.rehearsals,
  costumes: seed.costumes,
  costumeStocks: seed.costumeStocks,
  rooms: seed.rooms,
  bookings: seed.bookings,
  notices: seed.notices,
  photos: seed.photos,
  formationLogs: seed.formationLogs,
  onsite: { p3: { m13: true, m14: true, m15: true, m16: true }, p4: { m13: true, m14: true } },

  setRole: (role) => set({ role }),
  setCurrentMember: (id) => set({ currentMemberId: id }),

  publishProgram: (p, teamId) => set((s) => ({
    programs: [...s.programs, {
      id: nid('p'), teamId, ...p, stage: 'signup' as Stage,
      venue: p.isAudition ? '待定（海选）' : '社区文化广场主舞台',
      venueApproval: 'pending' as const, venueNote: '待文化站审批',
      memberIds: [], musicVersions: [], segments: [],
      formation: { rows: 2, cols: 4, cells: [[null, null, null, null], [null, null, null, null]], changes: [] },
      reviews: [], waitingOrder: s.programs.filter((x) => x.stage === 'ready' || x.stage === 'showday').length + 1,
      createdAt: now(),
    }],
  })),

  enroll: (programId, memberId, size, joinFormal, healthNotes, slots) => set((s) => {
    if (s.enrollments.some((e) => e.programId === programId && e.memberId === memberId)) return s
    return {
      enrollments: [...s.enrollments, { memberId, programId, costumeSize: size, joinFormal, healthNotes, availableSlots: slots, enrolledAt: now() }],
      programs: s.programs.map((p) => p.id === programId ? { ...p, memberIds: [...p.memberIds, memberId] } : p),
      costumes: [...s.costumes, {
        memberId, programId, size, deposit: 100, depositStatus: 'unpaid', depositPaid: false,
        pickedUp: false, pickedUpBy: '', pickedUpAt: '',
        returned: false, returnedAt: '', sizeIssue: '',
        originalSize: size, tryOnPhoto: '', tryOnNote: '',
        exchangeStatus: '', wantedSize: '', exchangeAt: '', exchangedAt: '',
        fallback: '', fallbackNote: '',
        backupEnabled: false, backupEnabledAt: '', backupSize: '',
        backupDeposit: 0, backupDepositStatus: 'unpaid',
        cleaningOwner: '', cleaningDone: false, backupReturned: false, backupReturnedAt: '',
      }],
      members: s.members.map((x) => x.id === memberId ? { ...x, healthNotes: healthNotes || x.healthNotes, availableSlots: slots.length ? slots : x.availableSlots } : x),
    }
  }),

  advanceStage: (programId) => set((s) => ({
    programs: s.programs.map((p) => {
      if (p.id !== programId) return p
      const i = STAGE_ORDER.indexOf(p.stage)
      return { ...p, stage: STAGE_ORDER[Math.min(i + 1, STAGE_ORDER.length - 1)] }
    }),
  })),

  checkin: (rehearsalId, memberId, status) => set((s) => ({
    rehearsals: s.rehearsals.map((r) => r.id === rehearsalId
      ? { ...r, checkins: { ...r.checkins, [memberId]: status } } : r),
  })),

  setRehearsalNote: (rehearsalId, note) => set((s) => ({
    rehearsals: s.rehearsals.map((r) => r.id === rehearsalId ? { ...r, note } : r),
  })),

  addRehearsal: (programId, roomId, date, timeSlot) => set((s) => ({
    rehearsals: [...s.rehearsals, { id: nid('r'), programId, roomId, date, timeSlot, checkins: {}, note: '' }],
  })),

  uploadMusicVersion: (programId, label, fileName, note, by) => set((s) => ({
    programs: s.programs.map((p) => p.id === programId ? {
      ...p,
      musicVersions: [...p.musicVersions.map((v) => ({ ...v, current: false })),
        { id: nid('v'), label, fileName, note, uploadedBy: by, uploadedAt: now(), current: true }],
    } : p),
    notices: [...s.notices, {
      id: nid('n'), programId, level: 'info' as const, kind: 'general' as const, at: now(),
      targets: ['sound', 'leader', 'member'] as Role[],
      text: `曲目版本更新：${label}（${fileName}），请音响师替换播放文件。`,
    }],
  })),

  toggleFocusMember: (programId, segmentId, memberId) => set((s) => ({
    programs: s.programs.map((p) => p.id === programId ? {
      ...p,
      segments: p.segments.map((seg) => seg.id === segmentId ? {
        ...seg,
        focusMemberIds: seg.focusMemberIds.includes(memberId)
          ? seg.focusMemberIds.filter((x) => x !== memberId)
          : [...seg.focusMemberIds, memberId],
      } : seg),
    } : p),
  })),

  assignCell: (programId, row, col, memberId) => set((s) => ({
    programs: s.programs.map((p) => {
      if (p.id !== programId) return p
      const cells = p.formation.cells.map((r) => [...r])
      // 同一队员只能在一个格子
      if (memberId) cells.forEach((r, ri) => r.forEach((c, ci) => { if (c === memberId) cells[ri][ci] = null }))
      cells[row][col] = memberId
      return { ...p, formation: { ...p.formation, cells } }
    }),
  })),

  shrinkVenue: (programId, newColsStr) => set((s) => {
    const newCols = parseInt(newColsStr, 10)
    const p = s.programs.find((x) => x.id === programId)
    if (!p || isNaN(newCols) || newCols < 1 || newCols >= p.formation.cols) return s
    const oldCols = p.formation.cols
    const displaced: string[] = []
    const cells = p.formation.cells.map((row) => row.slice(0, newCols).map((c) => c))
    p.formation.cells.forEach((row) => row.forEach((c, ci) => { if (c && ci >= newCols) displaced.push(c) }))
    const names = displaced.map((id) => s.members.find((m) => m.id === id)?.name ?? id).join('、')
    return {
      programs: s.programs.map((x) => x.id === programId ? { ...x, formation: { ...x.formation, cols: newCols, cells } } : x),
      formationLogs: [...s.formationLogs, {
        id: nid('fl'), programId, at: now(),
        text: `演出场地缩小：队形由${oldCols}列压缩为${newCols}列${displaced.length ? `，${names} 待重新安置` : ''}`,
      }],
      notices: [...s.notices, {
        id: nid('n'), programId, level: 'urgent' as const, kind: 'venue' as const, at: now(),
        targets: ['leader', 'member'] as Role[],
        text: `场地缩小：队形已压缩为${newCols}列${displaced.length ? `，${names} 需重新安排站位` : ''}`,
      }],
    }
  }),

  addFormationChange: (programId, atSegment, desc) => set((s) => ({
    programs: s.programs.map((p) => p.id === programId
      ? { ...p, formation: { ...p.formation, changes: [...p.formation.changes, { id: nid('fc'), atSegment, desc }] } } : p),
  })),

  payDeposit: (memberId, programId) => set((s) => ({
    costumes: s.costumes.map((c) => c.memberId === memberId && c.programId === programId
      ? { ...c, depositPaid: true, depositStatus: 'held' as DepositStatus } : c),
  })),

  pickupCostume: (memberId, programId, byWho) => set((s) => ({
    costumes: s.costumes.map((c) => c.memberId === memberId && c.programId === programId
      ? { ...c, pickedUp: true, pickedUpBy: byWho, pickedUpAt: now() } : c),
  })),

  returnCostume: (memberId, programId) => set((s) => ({
    costumes: s.costumes.map((c) => {
      if (c.memberId !== memberId || c.programId !== programId) return c
      // 原服归还：仍在保管的押金予以退还；已结转抵扣（启用备用服）的不退
      const depositStatus: DepositStatus = c.depositStatus === 'held' ? 'refunded' : c.depositStatus
      return { ...c, returned: true, returnedAt: now(), depositStatus }
    }),
  })),

  reportSizeIssue: (memberId, programId, issue, wantedSize, photo) => set((s) => {
    const name = s.members.find((m) => m.id === memberId)?.name ?? memberId
    return {
      costumes: s.costumes.map((c) => c.memberId === memberId && c.programId === programId ? {
        ...c,
        sizeIssue: issue,
        originalSize: c.originalSize || c.size,
        tryOnPhoto: photo,
        wantedSize, exchangeStatus: 'reported' as const, exchangeAt: now(),
      } : c),
      notices: [...s.notices, {
        id: nid('n'), programId, level: 'info' as const, kind: 'size' as const, at: now(),
        targets: ['costume', 'leader'] as Role[],
        text: `尺码返换登记：${name} 领取的 ${s.costumes.find((x) => x.memberId === memberId && x.programId === programId)?.size} 码试穿偏小（${photo || '未附照片'}），期望换 ${wantedSize || '待核定'} 码；请服装负责人核对可换库存。`,
      }],
    }
  }),

  reportSizeIssueSimple: (memberId, programId, issue) =>
    get().reportSizeIssue(memberId, programId, issue, '' as CostumeSize, ''),

  markExchangeStock: (memberId, programId, available) => set((s) => {
    const c0 = s.costumes.find((x) => x.memberId === memberId && x.programId === programId)
    const name = s.members.find((m) => m.id === memberId)?.name ?? memberId
    if (!c0) return s
    if (available) {
      return {
        costumes: s.costumes.map((c) => c.memberId === memberId && c.programId === programId
          ? { ...c, exchangeStatus: 'exchanging' as const } : c),
        notices: [...s.notices, {
          id: nid('n'), programId, level: 'info' as const, kind: 'size' as const, at: now(),
          targets: ['costume', 'leader'] as Role[],
          text: `可换库存已核对：${name} 需要的 ${c0.wantedSize} 码有货，可安排换领（押金状态不变）。`,
        }],
      }
    }
    return {
      costumes: s.costumes.map((c) => c.memberId === memberId && c.programId === programId
        ? { ...c, exchangeStatus: 'unresolved' as const } : c),
      notices: [...s.notices, {
        id: nid('n'), programId, level: 'urgent' as const, kind: 'size' as const, at: now(),
        targets: ['costume', 'leader'] as Role[],
        text: `演出前 ${name} 需要的 ${c0.wantedSize} 码仍无货：请队长尽快调整站位，或启用备用服装（押金状态将同步更新）。`,
      }],
    }
  }),

  exchangeCostume: (memberId, programId, newSize) => {
    const s = get()
    const stock = s.costumeStocks.find((x) => x.programId === programId)
    const qty = stock?.stock[newSize] ?? 0
    if (qty <= 0) return `可换库存中没有 ${newSize} 码，请先由服装负责人补库存或改用备用服装`
    const name = s.members.find((m) => m.id === memberId)?.name ?? memberId
    const c0 = s.costumes.find((x) => x.memberId === memberId && x.programId === programId)
    set((st) => ({
      costumeStocks: st.costumeStocks.map((x) => x.programId === programId
        ? { ...x, stock: { ...x.stock, [newSize]: Math.max(0, (x.stock[newSize] ?? 0) - 1) }, confirmed: false } : x),
      costumes: st.costumes.map((c) => c.memberId === memberId && c.programId === programId ? {
        ...c, size: newSize, exchangeStatus: 'exchanged' as const, exchangedAt: now(),
        sizeIssue: '', fallback: '', fallbackNote: '',
        depositStatus: 'held' as DepositStatus, depositPaid: true,
      } : c),
      enrollments: st.enrollments.map((e) => e.memberId === memberId && e.programId === programId
        ? { ...e, costumeSize: newSize } : e),
      notices: [...st.notices, {
        id: nid('n'), programId, level: 'info' as const, kind: 'size' as const, at: now(),
        targets: ['costume', 'leader', 'member'] as Role[],
        text: `${name} 已由 ${c0?.originalSize ?? c0?.size} 码换到 ${newSize} 码，原押金继续保管（演出后归还退还）。`,
      }],
    }))
    return null
  },

  resolveByFormation: (memberId, programId, note) => set((s) => {
    const c0 = s.costumes.find((x) => x.memberId === memberId && x.programId === programId)
    const name = s.members.find((m) => m.id === memberId)?.name ?? memberId
    return {
      costumes: s.costumes.map((c) => c.memberId === memberId && c.programId === programId
        ? { ...c, exchangeStatus: 'repositioned' as const, fallback: 'formation' as const, fallbackNote: note } : c),
      formationLogs: [...s.formationLogs, {
        id: nid('fl'), programId, at: now(),
        text: `${name} 因服装尺码偏小（${c0?.originalSize ?? c0?.size}→${c0?.wantedSize || '?'} 演出前无货）调整站位：${note}`,
      }],
      notices: [...s.notices, {
        id: nid('n'), programId, level: 'urgent' as const, kind: 'size' as const, at: now(),
        targets: ['leader', 'member', 'costume'] as Role[],
        text: `队长已为 ${name} 调整站位以规避尺码问题（${note}）；其原服押金仍处保管状态，演出后归还再退。`,
      }],
    }
  }),

  enableBackup: (memberId, programId, backupSize, deposit, cleaningOwner) => {
    const s = get()
    const c0 = s.costumes.find((x) => x.memberId === memberId && x.programId === programId)
    if (!c0 || !c0.exchangeStatus || c0.exchangeStatus === 'exchanged') {
      return '该队员没有进行中的尺码返换，无需启用备用服'
    }
    const name = s.members.find((m) => m.id === memberId)?.name ?? memberId
    set((st) => ({
      costumes: st.costumes.map((c) => c.memberId === memberId && c.programId === programId ? {
        ...c,
        exchangeStatus: 'backup' as const, fallback: 'backup' as const,
        fallbackNote: `演出前${c.wantedSize}码无货，队长启用${backupSize}码备用服装顶替。`,
        backupEnabled: true, backupEnabledAt: now(), backupSize,
        backupDeposit: deposit, backupDepositStatus: (deposit > 0 ? 'held' : 'unpaid') as DepositStatus,
        cleaningOwner, cleaningDone: false, backupReturned: false, backupReturnedAt: '',
        // 原服押金结转抵扣，不再退原押金
        depositStatus: 'forfeited' as DepositStatus, depositPaid: true,
      } : c),
      notices: [...st.notices, {
        id: nid('n'), programId, level: 'urgent' as const, kind: 'backup' as const, at: now(),
        targets: ['costume', 'leader', 'member'] as Role[],
        text: `已为 ${name} 启用 ${backupSize} 码备用服装：原 ${c0.originalSize} 码押金 ¥${c0.deposit} 结转抵扣；备用服押金 ¥${deposit} 重新计收、清洗责任 ${cleaningOwner || '待指定'}，归还时间演出后登记。`,
      }],
    }))
    return null
  },

  payBackupDeposit: (memberId, programId) => set((s) => ({
    costumes: s.costumes.map((c) => c.memberId === memberId && c.programId === programId && c.backupEnabled
      ? { ...c, backupDepositStatus: 'held' as DepositStatus } : c),
  })),

  returnBackup: (memberId, programId) => set((s) => ({
    costumes: s.costumes.map((c) => {
      if (c.memberId !== memberId || c.programId !== programId || !c.backupEnabled) return c
      const backupDepositStatus: DepositStatus = c.backupDepositStatus === 'held' ? 'refunded' : c.backupDepositStatus
      return { ...c, backupReturned: true, backupReturnedAt: now(), backupDepositStatus }
    }),
  })),

  setCleaningDone: (memberId, programId, done) => set((s) => ({
    costumes: s.costumes.map((c) => c.memberId === memberId && c.programId === programId && c.backupEnabled
      ? { ...c, cleaningDone: done } : c),
  })),

  initStock: (programId) => set((s) => (s.costumeStocks.some((x) => x.programId === programId) ? s : {
    costumeStocks: [...s.costumeStocks, {
      programId, stock: { S: 0, M: 0, L: 0, XL: 0, XXL: 0 },
      confirmed: false, confirmedAt: '', confirmedBy: '',
    }],
  })),

  setStock: (programId, size, qty0) => set((s) => ({
    costumeStocks: s.costumeStocks.map((x) => {
      if (x.programId !== programId) return x
      const qty = Math.max(0, Math.floor(qty0) || 0)
      // 数字改动后需重新确认，保证“已确认”对应当前数字
      return { ...x, stock: { ...x.stock, [size]: qty }, confirmed: false, confirmedAt: '', confirmedBy: '' }
    }),
  })),

  confirmStock: (programId, by) => set((s) => ({
    costumeStocks: s.costumeStocks.map((x) => x.programId === programId
      ? { ...x, confirmed: true, confirmedAt: now(), confirmedBy: by || '服装负责人' } : x),
    notices: [...s.notices, {
      id: nid('n'), programId, level: 'info' as const, kind: 'costume' as const, at: now(),
      targets: ['costume', 'leader'] as Role[],
      text: `服装负责人已核对确认《${s.programs.find((p) => p.id === programId)?.title ?? ''}》各尺码可换库存。`,
    }],
  })),

  reviewProgram: (programId, result, comment, by) => set((s) => ({
    programs: s.programs.map((p) => {
      if (p.id !== programId) return p
      const reviews = [...p.reviews, { id: nid('rv'), by, result, comment, at: now() }]
      // 通过 → 待演出；要求修改 → 退回排练阶段，队长调整后重新报审
      const stage: Stage = result === 'approved' ? 'ready' : result === 'changes_requested' ? 'rehearsing' : p.stage
      return { ...p, reviews, stage }
    }),
    notices: [...s.notices, {
      id: nid('n'), programId, level: result === 'approved' ? 'info' as const : 'urgent' as const,
      kind: 'general' as const, at: now(), targets: ['leader'] as Role[],
      text: result === 'approved' ? '节目审查通过，进入待演出状态。' : `文化站要求调整节目内容：${comment}`,
    }],
  })),

  setVenueApproval: (programId, approved, note) => set((s) => ({
    programs: s.programs.map((p) => p.id === programId
      ? { ...p, venueApproval: approved ? 'approved' : 'rejected', venueNote: note } : p),
  })),

  onsiteCheckin: (programId, memberId) => set((s) => ({
    onsite: {
      ...s.onsite,
      [programId]: { ...(s.onsite[programId] ?? {}), [memberId]: !(s.onsite[programId]?.[memberId]) },
    },
  })),

  moveWaiting: (programId, dir) => set((s) => {
    const queue = s.programs
      .filter((p) => p.stage === 'ready' || p.stage === 'showday')
      .sort((a, b) => a.waitingOrder - b.waitingOrder)
    const idx = queue.findIndex((p) => p.id === programId)
    const swap = idx + dir
    if (idx < 0 || swap < 0 || swap >= queue.length) return s
    const a = queue[idx], b = queue[swap]
    return {
      programs: s.programs.map((p) => {
        if (p.id === a.id) return { ...p, waitingOrder: b.waitingOrder }
        if (p.id === b.id) return { ...p, waitingOrder: a.waitingOrder }
        return p
      }),
    }
  }),

  addNotice: (text, level, targets, kind, programId) => set((s) => ({
    notices: [...s.notices, { id: nid('n'), programId, text, level, targets, kind, at: now() }],
  })),

  addPhoto: (programId, emoji, caption) => set((s) => ({
    photos: [...s.photos, { id: nid('ph'), programId, emoji, caption, at: now() }],
  })),

  bookRoom: (roomId, teamId, date, timeSlot, purpose) => {
    const s = get()
    const conflict = s.bookings.some((b) => b.roomId === roomId && b.date === date && b.timeSlot === timeSlot)
    if (conflict) return '该时段已被其他队伍预订'
    set((st) => ({ bookings: [...st.bookings, { id: nid('b'), roomId, teamId, date, timeSlot, purpose }] }))
    return null
  },

  cancelBooking: (id) => set((s) => ({ bookings: s.bookings.filter((b) => b.id !== id) })),
}))

// ============ 派生选择器 ============

/** 最近一次有签到记录的排练 */
export function latestRehearsal(rehearsals: Rehearsal[], programId: string): Rehearsal | undefined {
  return [...rehearsals].reverse().find((r) => r.programId === programId && Object.keys(r.checkins).length > 0)
}

/** 最近一次排练中请假/缺席的队员 */
export function absentSet(rehearsals: Rehearsal[], programId: string): Map<string, CheckinStatus> {
  const r = latestRehearsal(rehearsals, programId)
  const m = new Map<string, CheckinStatus>()
  if (!r) return m
  Object.entries(r.checkins).forEach(([id, st]) => { if (st !== 'present') m.set(id, st) })
  return m
}

/** 已入队形的队员 */
export function placedSet(p: Program): Set<string> {
  const s = new Set<string>()
  p.formation.cells.forEach((row) => row.forEach((c) => { if (c) s.add(c) }))
  return s
}

/** 各阶段是否完成（文化站连续性视角） */
export function stageDone(p: Program, rehearsals: Rehearsal[], costumes: CostumeRecord[], onsite: Record<string, Record<string, boolean>>, stocks: CostumeStock[] = []): Record<string, boolean> {
  const hasCheckin = rehearsals.some((r) => r.programId === p.id && Object.keys(r.checkins).length > 0)
  const placed = placedSet(p).size
  const myCostumes = costumes.filter((c) => c.programId === p.id)
  // 服装环节：没有进行中的返换单（待报/待换/演出前无货均算未闭环；换到、调站位、备用顶替算闭环）
  const exchangeClosed = myCostumes.every((c) => c.exchangeStatus === '' || c.exchangeStatus === 'exchanged' || c.exchangeStatus === 'backup' || c.exchangeStatus === 'repositioned')
  // 已建立库存表的节目，要求服装负责人已确认；尚无库存表（如报名阶段）不拦截
  const stockRow = stocks.find((x) => x.programId === p.id)
  const stockOk = !stockRow || stockRow.confirmed
  const costumeOk = myCostumes.length > 0 && exchangeClosed && stockOk
  const lastReview = p.reviews[p.reviews.length - 1]
  return {
    signup: p.memberIds.length > 0,
    rehearsing: hasCheckin,
    positioning: placed > 0,
    costume: costumeOk,
    review: lastReview?.result === 'approved',
    showday: Object.keys(onsite[p.id] ?? {}).length > 0,
  }
}

export interface CostumeReadiness {
  total: number
  unpaid: number          // 押金未收
  unpicked: number        // 未领取
  openExchange: number    // 进行中的返换（待核库存/待换/无货）
  pendingFallback: number // 演出前换不到、待队长处置
  backupOpen: number      // 备用服已启用但未归还或未清洗
  unreturned: number      // 演出后仍未归还（原服）
  ready: boolean
}

/** 服装就绪情况（总览/队长用） */
export function costumeReadiness(programId: string, costumes: CostumeRecord[]): CostumeReadiness {
  const list = costumes.filter((c) => c.programId === programId)
  const unpaid = list.filter((c) => c.depositStatus === 'unpaid').length
  const unpicked = list.filter((c) => !c.pickedUp).length
  const openExchange = list.filter((c) => exchangeOpen(c)).length
  const pendingFallbackCount = list.filter((c) => c.exchangeStatus === 'unresolved').length
  const backupOpenCount = list.filter((c) => c.backupEnabled && (!c.backupReturned || !c.cleaningDone)).length
  const unreturned = list.filter((c) => c.pickedUp && !c.returned && !c.backupEnabled).length
  return {
    total: list.length, unpaid, unpicked, openExchange,
    pendingFallback: pendingFallbackCount, backupOpen: backupOpenCount, unreturned,
    ready: unpaid === 0 && unpicked === 0 && openExchange === 0,
  }
}

/** 当前生效押金（启用备用服后取备用服押金），供视图统一展示 */
export function depositView(c: CostumeRecord) {
  return activeDeposit(c)
}

/** 老年/健康关注队员 */
export function healthWatch(members: Member[]): Member[] {
  return members.filter((m) => m.age >= 65 || m.healthNotes.length > 0)
}
