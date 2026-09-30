import { create } from 'zustand'
import type {
  CheckinStatus, CostumeRecord, CostumeSize, CostumeStock, Enrollment, ExchangeResolution,
  FormationLog, Member, Notice, Photo, Program, Rehearsal, Role, Room, RoomBooking,
  SizeShortage, Stage, Team, TryOnPhoto,
} from './types'
import { SHORTAGE_LONGTERM_THRESHOLD } from './types'
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
  sizeShortages: SizeShortage[]
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
  reportSizeIssue: (memberId: string, programId: string, issue: string) => void
  resolveSizeIssue: (memberId: string, programId: string, newSize: CostumeSize) => void

  // 服装尺码返换（补充）
  /** 领取后记录试穿照片 + 原尺码 + 期望尺码（页面记录） */
  recordTryOn: (memberId: string, programId: string, emoji: string, caption: string, wantedSize: CostumeSize | '') => void
  removeTryOnPhoto: (memberId: string, programId: string, photoId: string) => void
  /** 设置/更新期望换尺码 */
  setWantedSize: (memberId: string, programId: string, wantedSize: CostumeSize | '') => void
  /** 服装负责人盘点某节目某尺码的可换库存 */
  setStock: (programId: string, size: CostumeSize, exchangeable: number, note: string) => void
  /** 服装负责人确认能否换到该队员期望尺码（同步押金状态提示） */
  confirmStock: (memberId: string, programId: string, available: boolean, note: string) => void
  /** 确认可换 → 完成换货，更新尺码并扣减可换库存 */
  exchangeCostume: (memberId: string, programId: string, newSize: CostumeSize) => void
  /** 演出前换不到合适尺码：队长调整站位将就 */
  resolveByReposition: (memberId: string, programId: string, note: string) => void
  /** 演出前换不到：启用备用服装（押金、清洗责任、归还时间重新记录） */
  activateBackup: (memberId: string, programId: string, backup: { size: CostumeSize; deposit: number; cleaningDuty: string; returnBy: string; note: string }) => void
  payBackupDeposit: (memberId: string, programId: string) => void
  returnBackup: (memberId: string, programId: string) => void

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
  sizeShortages: seed.sizeShortages,
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
        memberId, programId, size, deposit: 100, depositPaid: false,
        pickedUp: false, pickedUpBy: '', returned: false, sizeIssue: '',
        originalSize: size, tryOnPhotos: [], wantedSize: '',
        stockChecked: false, stockAvailable: false, stockNote: '',
        resolution: '', resolvedAt: '', backup: null,
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
    costumes: s.costumes.map((c) => c.memberId === memberId && c.programId === programId ? { ...c, depositPaid: true } : c),
  })),

  pickupCostume: (memberId, programId, byWho) => set((s) => ({
    costumes: s.costumes.map((c) => c.memberId === memberId && c.programId === programId
      ? { ...c, pickedUp: true, pickedUpBy: byWho, originalSize: c.originalSize || c.size } : c),
  })),

  returnCostume: (memberId, programId) => set((s) => ({
    // 押金状态同步：普通服装归还后可退押金；若启用了备用服装，则以备用服装的归还为准
    costumes: s.costumes.map((c) => c.memberId === memberId && c.programId === programId
      ? c.backup
        ? { ...c, returned: true, backup: { ...c.backup, returned: true, returnedAt: now() } }
        : { ...c, returned: true }
      : c),
  })),

  reportSizeIssue: (memberId, programId, issue) => set((s) => ({
    costumes: s.costumes.map((c) => c.memberId === memberId && c.programId === programId
      ? { ...c, sizeIssue: issue, stockChecked: false, stockAvailable: false, stockNote: '', resolution: '', resolvedAt: '' } : c),
    notices: [...s.notices, {
      id: nid('n'), programId, level: 'info' as const, kind: 'costume' as const, at: now(),
      targets: ['costume', 'leader'] as Role[],
      text: `尺码问题：${s.members.find((m) => m.id === memberId)?.name} — ${issue}`,
    }],
  })),

  recordTryOn: (memberId, programId, emoji, caption, wantedSize) => set((s) => ({
    costumes: s.costumes.map((c) => {
      if (c.memberId !== memberId || c.programId !== programId) return c
      const photo: TryOnPhoto = { id: nid('tp'), emoji, caption, at: now() }
      return {
        ...c,
        originalSize: c.originalSize || c.size,
        tryOnPhotos: [...c.tryOnPhotos, photo],
        wantedSize: wantedSize || c.wantedSize,
        // 仅在尚未走完处置时才需要重新确认库存；已完成的换货/备用/调站位结论保留
        ...(c.resolution ? {} : { stockChecked: false, stockAvailable: false, stockNote: '', resolution: '', resolvedAt: '' }),
      }
    }),
  })),

  removeTryOnPhoto: (memberId, programId, photoId) => set((s) => ({
    costumes: s.costumes.map((c) => c.memberId === memberId && c.programId === programId
      ? { ...c, tryOnPhotos: c.tryOnPhotos.filter((p) => p.id !== photoId) } : c),
  })),

  setWantedSize: (memberId, programId, wantedSize) => set((s) => ({
    costumes: s.costumes.map((c) => c.memberId === memberId && c.programId === programId
      ? { ...c, wantedSize, ...(c.resolution ? {} : { stockChecked: false, stockAvailable: false, stockNote: '' }) } : c),
  })),

  setStock: (programId, size, exchangeable, note) => set((s) => {
    const exists = s.costumeStocks.some((k) => k.programId === programId && k.size === size)
    const costumeStocks = exists
      ? s.costumeStocks.map((k) => k.programId === programId && k.size === size
        ? { ...k, exchangeable, note, checked: true, checkedAt: now() } : k)
      : [...s.costumeStocks, { programId, size, exchangeable, note, checked: true, checkedAt: now() }]
    return { costumeStocks }
  }),

  confirmStock: (memberId, programId, available, note) => {
    const s = get()
    const c = s.costumes.find((x) => x.memberId === memberId && x.programId === programId)
    if (!c) return
    const wanted = c.wantedSize || (c.size === 'S' ? 'M' : c.size)
    set({
      costumes: s.costumes.map((x) => x.memberId === memberId && x.programId === programId
        ? { ...x, stockChecked: true, stockAvailable: available, stockNote: note } : x),
      notices: [...s.notices, {
        id: nid('n'), programId, level: available ? 'info' as const : 'urgent' as const,
        kind: 'costume' as const, at: now(),
        targets: available ? (['costume', 'leader'] as Role[]) : (['costume', 'leader', 'member'] as Role[]),
        text: available
          ? `${s.members.find((m) => m.id === memberId)?.name} 的 ${wanted} 码有可换库存，可安排换货。`
          : `${s.members.find((m) => m.id === memberId)?.name} 需要的 ${wanted} 码无货可换，请队长调整站位或启用备用服装。`,
      }],
    })
    // 确认无货 → 记一条长期紧缺
    if (!available) {
      set((st) => ({
        sizeShortages: [...st.sizeShortages, {
          id: nid('ss'), programId, size: wanted, memberId, reason: 'oos_exchange', note, at: now(),
        }],
      }))
    }
  },

  exchangeCostume: (memberId, programId, newSize) => set((s) => {
    const stock = s.costumeStocks.find((k) => k.programId === programId && k.size === newSize)
    const costumeStocks = stock
      ? s.costumeStocks.map((k) => k === stock ? { ...k, exchangeable: Math.max(0, k.exchangeable - 1) } : k)
      : s.costumeStocks
    const mName = s.members.find((m) => m.id === memberId)?.name
    return {
      costumes: s.costumes.map((c) => c.memberId === memberId && c.programId === programId ? {
        ...c,
        size: newSize, sizeIssue: '', wantedSize: newSize,
        stockChecked: true, stockAvailable: true,
        resolution: 'exchanged' as ExchangeResolution, resolvedAt: now(),
        // 押金随原记录延续，无需重新缴纳，状态保持同步
        depositPaid: c.depositPaid,
      } : c),
      enrollments: s.enrollments.map((e) => e.memberId === memberId && e.programId === programId ? { ...e, costumeSize: newSize } : e),
      costumeStocks,
      notices: [...s.notices, {
        id: nid('n'), programId, level: 'info' as const, kind: 'costume' as const, at: now(),
        targets: ['costume', 'leader', 'member'] as Role[],
        text: `${mName} 已换到 ${newSize} 码演出服，原押金延续有效。`,
      }],
    }
  }),

  // 兼容旧入口：等价于「确认有货并换货」
  resolveSizeIssue: (memberId, programId, newSize) => get().exchangeCostume(memberId, programId, newSize),

  resolveByReposition: (memberId, programId, note) => set((s) => {
    const c = s.costumes.find((x) => x.memberId === memberId && x.programId === programId)
    const wanted = c?.wantedSize || c?.size || 'M'
    const mName = s.members.find((m) => m.id === memberId)?.name
    return {
      costumes: s.costumes.map((x) => x.memberId === memberId && x.programId === programId
        ? { ...x, resolution: 'reposition' as ExchangeResolution, resolvedAt: now(), stockChecked: true, stockAvailable: false, stockNote: note || x.stockNote } : x),
      formationLogs: [...s.formationLogs, {
        id: nid('fl'), programId, at: now(),
        text: `因服装尺码偏小且无货可换（${mName} 需 ${wanted} 码）：队长调整站位将就，${note || '安排至不显身形的位置'}。`,
      }],
      sizeShortages: [...s.sizeShortages, {
        id: nid('ss'), programId, size: wanted, memberId, reason: 'reposition', note, at: now(),
      }],
      notices: [...s.notices, {
        id: nid('n'), programId, level: 'urgent' as const, kind: 'costume' as const, at: now(),
        targets: ['leader', 'member', 'costume'] as Role[],
        text: `${mName} 的 ${wanted} 码无货，已调整站位将就；押金暂挂，演出后按归还情况结算。`,
      }],
    }
  }),

  activateBackup: (memberId, programId, b) => set((s) => {
    const c = s.costumes.find((x) => x.memberId === memberId && x.programId === programId)
    const wanted = c?.wantedSize || b.size
    const mName = s.members.find((m) => m.id === memberId)?.name
    const backup = {
      size: b.size, deposit: b.deposit, depositPaid: false,
      cleaningDuty: b.cleaningDuty, returnBy: b.returnBy,
      returned: false, returnedAt: '', note: b.note,
    }
    return {
      costumes: s.costumes.map((x) => x.memberId === memberId && x.programId === programId ? {
        ...x,
        resolution: 'backup' as ExchangeResolution, resolvedAt: now(),
        stockChecked: true, stockAvailable: false,
        backup,
        // 启用备用后：主服装押金状态同步标注（待退/转抵），此处主服装 returned 复位由归还流程处理
        size: x.size,
      } : x),
      sizeShortages: [...s.sizeShortages, {
        id: nid('ss'), programId, size: wanted, memberId, reason: 'backup_used',
        note: `启用${b.size}码备用服装；${b.note}`, at: now(),
      }],
      notices: [...s.notices, {
        id: nid('n'), programId, level: 'urgent' as const, kind: 'costume' as const, at: now(),
        targets: ['costume', 'leader', 'member'] as Role[],
        text: `${mName} 已启用 ${b.size} 码备用服装：需另收押金 ¥${b.deposit}，清洗责任「${b.cleaningDuty}」，归还时间 ${b.returnBy}。原服装押金待归还后结算。`,
      }],
    }
  }),

  payBackupDeposit: (memberId, programId) => set((s) => ({
    costumes: s.costumes.map((c) => c.memberId === memberId && c.programId === programId && c.backup
      ? { ...c, backup: { ...c.backup, depositPaid: true } } : c),
  })),

  returnBackup: (memberId, programId) => set((s) => ({
    costumes: s.costumes.map((c) => c.memberId === memberId && c.programId === programId && c.backup
      ? { ...c, returned: true, backup: { ...c.backup, returned: true, returnedAt: now() } } : c),
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
export function stageDone(p: Program, rehearsals: Rehearsal[], costumes: CostumeRecord[], onsite: Record<string, Record<string, boolean>>): Record<string, boolean> {
  const hasCheckin = rehearsals.some((r) => r.programId === p.id && Object.keys(r.checkins).length > 0)
  const placed = placedSet(p).size
  const myCostumes = costumes.filter((c) => c.programId === p.id)
  // 无尺码问题，或问题已经走完返换处置（换货 / 备用 / 调站位）即算服装环节完成
  const costumeOk = myCostumes.length > 0 && myCostumes.every((c) => !c.sizeIssue || !!c.resolution)
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

/** 老年/健康关注队员 */
export function healthWatch(members: Member[]): Member[] {
  return members.filter((m) => m.age >= 65 || m.healthNotes.length > 0)
}

// ============ 服装尺码返换派生选择器 ============

/** 待处理的返换记录：有尺码问题且尚未完成处置 */
export function pendingExchanges(costumes: CostumeRecord[], programId?: string): CostumeRecord[] {
  return costumes.filter((c) =>
    (programId ? c.programId === programId : true) &&
    !!c.sizeIssue && !c.resolution)
}

/** 已确认无货、等待队长决策（调站位 / 启用备用）的记录 */
export function awaitingDecision(costumes: CostumeRecord[], programId?: string): CostumeRecord[] {
  return pendingExchanges(costumes, programId).filter((c) => c.stockChecked && !c.stockAvailable)
}

export interface SizeShortageStat {
  size: CostumeSize
  count: number                 // 累计紧缺次数（无货/备用/调站位）
  oos: number                   // 其中确认无货次数
  backup: number                // 启用备用次数
  reposition: number            // 调站位次数
  longTerm: boolean             // 是否长期紧缺（≥阈值）
}

/**
 * 服装负责人视角：哪些尺码长期紧缺。
 * 按尺码累计「确认无货 / 启用备用 / 调整站位」次数，达到阈值即标记长期紧缺。
 */
export function shortageStats(shortages: SizeShortage[]): SizeShortageStat[] {
  const map = new Map<CostumeSize, SizeShortageStat>()
  shortages.forEach((s) => {
    const cur = map.get(s.size) ?? { size: s.size, count: 0, oos: 0, backup: 0, reposition: 0, longTerm: false }
    cur.count += 1
    if (s.reason === 'oos_exchange') cur.oos += 1
    if (s.reason === 'backup_used') cur.backup += 1
    if (s.reason === 'reposition') cur.reposition += 1
    map.set(s.size, cur)
  })
  return [...map.values()]
    .map((s) => ({ ...s, longTerm: s.count >= SHORTAGE_LONGTERM_THRESHOLD }))
    .sort((a, b) => b.count - a.count)
}

/** 某节目某尺码当前可换库存（未盘点返回 undefined） */
export function stockOf(stocks: CostumeStock[], programId: string, size: CostumeSize): CostumeStock | undefined {
  return stocks.find((k) => k.programId === programId && k.size === size)
}
