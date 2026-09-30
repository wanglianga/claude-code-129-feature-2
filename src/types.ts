// ============ 角色与基础类型 ============

export type Role = 'leader' | 'member' | 'costume' | 'culture' | 'sound' | 'volunteer'

export const ROLE_LABEL: Record<Role, string> = {
  leader: '队长',
  member: '队员',
  costume: '服装负责人',
  culture: '文化站',
  sound: '音响师',
  volunteer: '志愿者',
}

export type ProgramType = '广场舞' | '民族舞' | '合唱伴舞' | '节庆演出'

/** 节目从报名到归档的流转阶段 */
export type Stage =
  | 'signup'       // 报名中
  | 'rehearsing'   // 排练中
  | 'positioning'  // 走位编排
  | 'costume'      // 服装准备
  | 'review'       // 节目审查
  | 'ready'        // 审核通过待演出
  | 'showday'      // 演出当天
  | 'archived'     // 已归档

export const STAGE_LABEL: Record<Stage, string> = {
  signup: '报名',
  rehearsing: '排练',
  positioning: '走位',
  costume: '服装',
  review: '节目审核',
  ready: '待演出',
  showday: '现场签到',
  archived: '已归档',
}

/** 文化站查看的连续性链条（顺序固定） */
export const PIPELINE: Stage[] = ['signup', 'rehearsing', 'positioning', 'costume', 'review', 'showday']

export type CostumeSize = 'S' | 'M' | 'L' | 'XL' | 'XXL'
export const SIZES: CostumeSize[] = ['S', 'M', 'L', 'XL', 'XXL']

// ============ 队员 ============

export interface Member {
  id: string
  name: string
  age: number
  phone: string
  teamId: string
  /** 可排练时间段，如 ['周一晚','周三晚'] */
  availableSlots: string[]
  /** 是否参加正式演出 */
  joinFormal: boolean
  /** 身体注意事项 */
  healthNotes: string
  /** 是否前排成员 */
  frontRow: boolean
}

/** 某队员在某节目里的报名记录 */
export interface Enrollment {
  memberId: string
  programId: string
  costumeSize: CostumeSize
  joinFormal: boolean
  healthNotes: string
  availableSlots: string[]
  enrolledAt: string
}

// ============ 节目（演出记录，所有角色在同一记录上协作） ============

export interface MusicVersion {
  id: string
  label: string          // 如 "V3 删减版 4'30"
  fileName: string
  note: string
  uploadedBy: string
  uploadedAt: string
  current: boolean
}

export interface Segment {
  id: string
  name: string           // 动作分段名，如 "开场造型"
  range: string          // 如 "0:00-0:45"
  focusMemberIds: string[] // 需要重点练习的成员
}

export interface FormationChange {
  id: string
  atSegment: string      // 在哪个分段发生队形变化
  desc: string
}

export interface Formation {
  rows: number
  cols: number
  /** cells[r][c] = memberId | null；row 0 为前排 */
  cells: (string | null)[][]
  changes: FormationChange[]
}

export interface ReviewRecord {
  id: string
  by: string             // 文化站经办人
  result: 'approved' | 'changes_requested' | 'rejected'
  comment: string
  at: string
}

export interface Program {
  id: string
  teamId: string
  title: string
  type: ProgramType
  theme: string
  stage: Stage
  durationMin: number
  soundNeeds: string          // 音响需求（音响师可见）
  venue: string
  venueApproval: 'pending' | 'approved' | 'rejected'
  venueNote: string
  isAudition: boolean         // 是否为社区文艺汇演海选节目
  memberIds: string[]
  musicVersions: MusicVersion[]
  segments: Segment[]
  formation: Formation
  reviews: ReviewRecord[]
  waitingOrder: number        // 候场顺序号（演出当天）
  createdAt: string
  showDate: string
}

// ============ 排练与签到 ============

export type CheckinStatus = 'present' | 'leave' | 'absent'

export interface Rehearsal {
  id: string
  programId: string
  roomId: string
  date: string
  timeSlot: string
  checkins: Record<string, CheckinStatus>
  note: string
}

// ============ 服装 ============

/** 试穿照片（无后端环境，用 emoji 占位实拍图，附说明与时间） */
export interface TryOnPhoto {
  id: string
  emoji: string            // 如 📏👕🤏
  caption: string          // 如「腋下紧绷，抬臂困难」
  at: string
}

/** 尺码返换的最终处置方式 */
// exchanged：换到合适新码；backup：启用备用服装；reposition：无衣可换，队长调整站位
export type ExchangeResolution = 'exchanged' | 'backup' | 'reposition'

/** 启用备用服装后重新登记的押金 / 清洗 / 归还信息 */
export interface BackupCostume {
  size: CostumeSize
  deposit: number            // 备用服装押金
  depositPaid: boolean
  cleaningDuty: string       // 清洗责任人（本人 / 家属 / 队里统一送洗）
  returnBy: string           // 要求归还时间
  returned: boolean
  returnedAt: string         // 实际归还时间
  note: string
}

export interface CostumeRecord {
  memberId: string
  programId: string
  size: CostumeSize
  deposit: number          // 押金金额
  depositPaid: boolean
  pickedUp: boolean
  pickedUpBy: string       // 领取人；家属代领时写家属姓名+关系
  returned: boolean
  sizeIssue: string        // 尺码不合适说明，空串表示无问题

  // —— 尺码返换闭环 ——
  originalSize: CostumeSize          // 领取时的原尺码
  tryOnPhotos: TryOnPhoto[]          // 试穿照片
  wantedSize: CostumeSize | ''       // 希望换到的尺码
  stockChecked: boolean              // 服装负责人是否已确认可换库存
  stockAvailable: boolean            // 确认结果：目标尺码是否有可换库存
  stockNote: string                  // 库存确认说明
  resolution: '' | ExchangeResolution // 最终处置；空串表示尚未处置
  resolvedAt: string
  backup: BackupCostume | null       // 启用备用服装后的重录信息
}

/** 某节目各尺码的可换库存盘点（服装负责人维护、确认） */
export interface CostumeStock {
  programId: string
  size: CostumeSize
  exchangeable: number      // 可换库存件数
  checked: boolean          // 是否已盘点确认
  note: string
  checkedAt: string
}

/** 尺码紧缺记录：确认无货 / 启用备用 / 调站位各累计一条，供服装负责人看长期紧缺 */
export interface SizeShortage {
  id: string
  programId: string
  size: CostumeSize        // 紧缺的尺码
  memberId: string
  reason: 'oos_exchange' | 'backup_used' | 'reposition'
  note: string
  at: string
}

export const SHORTAGE_REASON_LABEL: Record<SizeShortage['reason'], string> = {
  oos_exchange: '确认无货可换',
  backup_used: '启用备用服装',
  reposition: '调整站位将就',
}

/** 累计达到该次数即视为“长期紧缺”尺码 */
export const SHORTAGE_LONGTERM_THRESHOLD = 2

// ============ 排练室（多支队伍共用） ============

export interface RoomBooking {
  id: string
  roomId: string
  teamId: string
  date: string
  timeSlot: string
  purpose: string
}

export interface Room {
  id: string
  name: string
}

// ============ 通知 ============

export interface Notice {
  id: string
  programId: string | null
  text: string
  level: 'info' | 'urgent'
  targets: Role[]          // 面向哪些角色
  at: string
  kind: 'general' | 'health' | 'venue' | 'costume' | 'live' | 'next'
}

// ============ 演出档案 ============

export interface Photo {
  id: string
  programId: string
  emoji: string            // 用 emoji 占位现场照片
  caption: string
  at: string
}

export interface FormationLog {
  id: string
  programId: string
  text: string
  at: string
}

// ============ 团队 ============

export interface Team {
  id: string
  name: string
  leader: string
}

// ============ 现场签到（演出当天） ============

export interface ShowdayState {
  programId: string
  onsiteCheckins: Record<string, boolean>  // memberId -> 已到
  started: boolean
}
