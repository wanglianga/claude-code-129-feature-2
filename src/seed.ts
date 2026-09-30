import type {
  CostumeRecord, CostumeStock, Enrollment, Member, MusicVersion, Notice, Photo,
  Program, Rehearsal, Room, RoomBooking, Segment, Team, FormationLog,
} from './types'

// ============ 队伍 ============
export const teams: Team[] = [
  { id: 't1', name: '朝霞舞蹈队', leader: '王秀兰' },
  { id: 't2', name: '夕阳红艺术团', leader: '李建国' },
]

// ============ 队员 ============
export const members: Member[] = [
  { id: 'm1',  name: '王秀兰', age: 58, phone: '138-0201-1101', teamId: 't1', availableSlots: ['周一晚', '周三晚', '周五晚'], joinFormal: true,  healthNotes: '', frontRow: true },
  { id: 'm2',  name: '张桂芳', age: 62, phone: '139-0201-1102', teamId: 't1', availableSlots: ['周一晚', '周三晚'], joinFormal: true,  healthNotes: '膝关节滑膜炎，避免久蹲', frontRow: true },
  { id: 'm3',  name: '刘玉梅', age: 55, phone: '137-0201-1103', teamId: 't1', availableSlots: ['周一晚', '周五晚'], joinFormal: true,  healthNotes: '', frontRow: true },
  { id: 'm4',  name: '陈秀英', age: 66, phone: '136-0201-1104', teamId: 't1', availableSlots: ['周三晚', '周五晚'], joinFormal: true,  healthNotes: '高血压，随身带药', frontRow: false },
  { id: 'm5',  name: '杨丽华', age: 60, phone: '135-0201-1105', teamId: 't1', availableSlots: ['周一晚', '周三晚'], joinFormal: true,  healthNotes: '', frontRow: false },
  { id: 'm6',  name: '赵淑珍', age: 68, phone: '134-0201-1106', teamId: 't1', availableSlots: ['周一晚'], joinFormal: true,  healthNotes: '膝盖退行性病变', frontRow: false },
  { id: 'm7',  name: '孙凤霞', age: 57, phone: '133-0201-1107', teamId: 't1', availableSlots: ['周三晚', '周五晚'], joinFormal: true,  healthNotes: '', frontRow: false },
  { id: 'm8',  name: '周玉琴', age: 63, phone: '132-0201-1108', teamId: 't1', availableSlots: ['周一晚', '周三晚'], joinFormal: true,  healthNotes: '腰椎间盘突出', frontRow: false },
  { id: 'm9',  name: '吴桂英', age: 70, phone: '131-0201-1109', teamId: 't1', availableSlots: ['周三晚'], joinFormal: true,  healthNotes: '高血压、心脏支架术后，避免剧烈转身', frontRow: false },
  { id: 'm10', name: '郑爱华', age: 54, phone: '130-0201-1110', teamId: 't1', availableSlots: ['周一晚', '周五晚'], joinFormal: true,  healthNotes: '', frontRow: false },
  { id: 'm11', name: '马丽娟', age: 59, phone: '159-0201-1111', teamId: 't1', availableSlots: ['周三晚', '周五晚'], joinFormal: true,  healthNotes: '低血糖，需备糖果', frontRow: false },
  { id: 'm12', name: '许凤仙', age: 65, phone: '158-0201-1112', teamId: 't1', availableSlots: ['周一晚', '周三晚'], joinFormal: false, healthNotes: '', frontRow: false },
  { id: 'm13', name: '李建国', age: 61, phone: '157-0201-1113', teamId: 't2', availableSlots: ['周二晚', '周四晚'], joinFormal: true,  healthNotes: '', frontRow: true },
  { id: 'm14', name: '高玉华', age: 64, phone: '156-0201-1114', teamId: 't2', availableSlots: ['周二晚', '周四晚'], joinFormal: true,  healthNotes: '肩周炎', frontRow: false },
  { id: 'm15', name: '林淑华', age: 58, phone: '155-0201-1115', teamId: 't2', availableSlots: ['周二晚'], joinFormal: true,  healthNotes: '', frontRow: false },
  { id: 'm16', name: '黄德海', age: 67, phone: '154-0201-1116', teamId: 't2', availableSlots: ['周四晚'], joinFormal: true,  healthNotes: '冠心病史，随身携带速效救心丸', frontRow: false },
]

// ============ 报名记录（含服装尺码等） ============
const enroll = (memberId: string, programId: string, costumeSize: Enrollment['costumeSize'], joinFormal = true): Enrollment => {
  const m = members.find((x) => x.id === memberId)!
  return {
    memberId, programId, costumeSize, joinFormal,
    healthNotes: m.healthNotes, availableSlots: m.availableSlots,
    enrolledAt: '2026-09-10 10:00',
  }
}

export const enrollments: Enrollment[] = [
  enroll('m1', 'p1', 'M'), enroll('m2', 'p1', 'L'), enroll('m3', 'p1', 'M'),
  enroll('m4', 'p1', 'XL'), enroll('m5', 'p1', 'S'), enroll('m6', 'p1', 'L'),
  enroll('m7', 'p1', 'M'), enroll('m8', 'p1', 'XL'), enroll('m9', 'p1', 'XXL'),
  enroll('m10', 'p1', 'S'), enroll('m11', 'p1', 'M'), enroll('m12', 'p1', 'L', false),
  enroll('m1', 'p2', 'M'), enroll('m3', 'p2', 'M'), enroll('m5', 'p2', 'S'), enroll('m10', 'p2', 'S'),
  enroll('m13', 'p3', 'L'), enroll('m14', 'p3', 'M'), enroll('m15', 'p3', 'M'), enroll('m16', 'p3', 'XL'),
  enroll('m13', 'p4', 'L'), enroll('m14', 'p4', 'M'), enroll('m15', 'p4', 'M'), enroll('m16', 'p4', 'XL'),
]

// ============ 节目 ============
const p1Music: MusicVersion[] = [
  { id: 'v1', label: 'V1 完整版 5′12″', fileName: '丰收锣鼓_完整版.mp3', note: '初始版本，偏长', uploadedBy: '王秀兰', uploadedAt: '2026-09-12 20:10', current: false },
  { id: 'v2', label: 'V2 排练版 4′50″', fileName: '丰收锣鼓_排练版.mp3', note: '去掉前奏重复段', uploadedBy: '王秀兰', uploadedAt: '2026-09-15 21:02', current: false },
  { id: 'v3', label: 'V3 演出版 4′00″', fileName: '丰收锣鼓_演出版.mp3', note: '文化站要求控制在4分钟内，已重新剪辑', uploadedBy: '音响师·小杜', uploadedAt: '2026-09-22 15:40', current: true },
]

const p1Segments: Segment[] = [
  { id: 's1', name: '开场造型', range: '0:00–0:30', focusMemberIds: ['m9'] },
  { id: 's2', name: '第一段·十字步', range: '0:30–1:40', focusMemberIds: ['m6', 'm8'] },
  { id: 's3', name: '队形变化·双龙出海', range: '1:40–2:20', focusMemberIds: ['m2'] },
  { id: 's4', name: '高潮·丰收鼓舞', range: '2:20–3:30', focusMemberIds: ['m9', 'm12'] },
  { id: 's5', name: '收尾造型', range: '3:30–4:00', focusMemberIds: [] },
]

export const programs: Program[] = [
  {
    id: 'p1', teamId: 't1', title: '丰收锣鼓', type: '广场舞', theme: '庆丰收·迎国庆',
    stage: 'positioning', durationMin: 4,
    soundNeeds: '需无线麦2支（队长口令）、低音炮、U盘播放+备用手机蓝牙',
    venue: '社区文化广场主舞台', venueApproval: 'approved',
    venueNote: '2026-09-18 审批通过；09-24 通知舞台由12米调整为9米宽',
    isAudition: false,
    memberIds: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11', 'm12'],
    musicVersions: p1Music,
    segments: p1Segments,
    formation: {
      rows: 3, cols: 8,
      cells: [
        ['m2', null, 'm1', null, 'm3', null, 'm5', null],
        [null, 'm4', null, 'm6', null, 'm7', null, 'm8'],
        ['m9', null, 'm10', null, 'm11', null, 'm12', null],
      ],
      changes: [
        { id: 'fc1', atSegment: '队形变化·双龙出海', desc: '由横排变为两列纵队，前排向两侧打开' },
        { id: 'fc2', atSegment: '高潮·丰收鼓舞', desc: '围成半圆，举鼓队员到中心' },
      ],
    },
    reviews: [
      { id: 'rv1', by: '文化站·陈老师', result: 'changes_requested', comment: '第3分钟鼓点过密建议精简；服装红色需与国庆主题一致，请调整后重新报审。', at: '2026-09-20 14:30' },
    ],
    waitingOrder: 3, createdAt: '2026-09-10 09:00', showDate: '2026-10-01 19:00',
  },
  {
    id: 'p2', teamId: 't1', title: '茉莉花·新编', type: '民族舞', theme: '江南韵',
    stage: 'signup', durationMin: 5,
    soundNeeds: '古筝伴奏音轨、领舞耳麦1支',
    venue: '待定（海选）', venueApproval: 'pending', venueNote: '海选节目，待文化站统一安排场地',
    isAudition: true,
    memberIds: ['m1', 'm3', 'm5', 'm10'],
    musicVersions: [
      { id: 'v4', label: 'V1 海选版 5′00″', fileName: '茉莉花_海选版.mp3', note: '海选初版', uploadedBy: '王秀兰', uploadedAt: '2026-09-23 10:00', current: true },
    ],
    segments: [],
    formation: { rows: 2, cols: 4, cells: [[null, null, null, null], [null, null, null, null]], changes: [] },
    reviews: [],
    waitingOrder: 0, createdAt: '2026-09-23 09:30', showDate: '2026-10-20 海选',
  },
  {
    id: 'p3', teamId: 't2', title: '歌唱祖国', type: '合唱伴舞', theme: '红色经典',
    stage: 'archived', durationMin: 6,
    soundNeeds: '合唱立麦4支、伴奏CD',
    venue: '社区文化广场主舞台', venueApproval: 'approved', venueNote: '中秋晚会已演出',
    isAudition: false,
    memberIds: ['m13', 'm14', 'm15', 'm16'],
    musicVersions: [
      { id: 'v5', label: 'V1 演出版 6′00″', fileName: '歌唱祖国_演出版.mp3', note: '定稿', uploadedBy: '李建国', uploadedAt: '2026-09-05 10:00', current: true },
    ],
    segments: [
      { id: 's6', name: '合唱进场', range: '0:00–1:00', focusMemberIds: [] },
      { id: 's7', name: '伴舞展开', range: '1:00–4:30', focusMemberIds: ['m16'] },
    ],
    formation: {
      rows: 2, cols: 4,
      cells: [['m13', null, 'm14', null], [null, 'm15', null, 'm16']],
      changes: [{ id: 'fc3', atSegment: '伴舞展开', desc: '伴舞从合唱队两侧展开成扇形' }],
    },
    reviews: [
      { id: 'rv2', by: '文化站·陈老师', result: 'approved', comment: '主题积极，准予演出。', at: '2026-09-08 11:00' },
    ],
    waitingOrder: 5, createdAt: '2026-09-01 09:00', showDate: '2026-09-17 19:30（已演出）',
  },
  {
    id: 'p4', teamId: 't2', title: '张灯结彩', type: '节庆演出', theme: '国庆灯会',
    stage: 'showday', durationMin: 5,
    soundNeeds: '手持麦1支、伴奏U盘',
    venue: '社区文化广场主舞台', venueApproval: 'approved', venueNote: '2026-09-19 审批通过',
    isAudition: false,
    memberIds: ['m13', 'm14', 'm15', 'm16'],
    musicVersions: [
      { id: 'v6', label: 'V2 演出版 5′00″', fileName: '张灯结彩_演出版.mp3', note: '定稿', uploadedBy: '李建国', uploadedAt: '2026-09-20 10:00', current: true },
    ],
    segments: [
      { id: 's8', name: '灯笼阵入场', range: '0:00–1:10', focusMemberIds: ['m16'] },
      { id: 's9', name: '中心造型', range: '1:10–4:00', focusMemberIds: [] },
    ],
    formation: {
      rows: 2, cols: 4,
      cells: [['m13', null, 'm14', null], [null, 'm15', null, 'm16']],
      changes: [{ id: 'fc4', atSegment: '中心造型', desc: '四人提灯笼围成圆形，缓慢旋转' }],
    },
    reviews: [
      { id: 'rv3', by: '文化站·陈老师', result: 'approved', comment: '节庆氛围好，准予演出。', at: '2026-09-21 10:00' },
    ],
    waitingOrder: 1, createdAt: '2026-09-12 09:00', showDate: '2026-10-01 19:00',
  },
]

// ============ 排练场次与签到 ============
export const rehearsals: Rehearsal[] = [
  {
    id: 'r1', programId: 'p1', roomId: 'room1', date: '2026-09-21', timeSlot: '周一 19:00–20:30',
    checkins: { m1: 'present', m2: 'present', m3: 'present', m4: 'present', m5: 'present', m6: 'present', m7: 'present', m8: 'leave', m9: 'present', m10: 'present', m11: 'present', m12: 'absent' },
    note: '周玉琴家里临时有事请假；许凤仙未到（不参加正式演出，自行练习）',
  },
  {
    id: 'r2', programId: 'p1', roomId: 'room1', date: '2026-09-23', timeSlot: '周三 19:00–20:30',
    checkins: { m1: 'present', m2: 'absent', m3: 'present', m4: 'present', m5: 'present', m6: 'present', m7: 'present', m8: 'present', m9: 'leave', m10: 'present', m11: 'present', m12: 'present' },
    note: '张桂芳（前排）膝盖复查无法参加；吴桂英血压偏高提前离场，已提醒家属',
  },
  {
    id: 'r3', programId: 'p1', roomId: 'room1', date: '2026-09-28', timeSlot: '周一 19:00–20:30',
    checkins: {}, note: '（待进行）重点合练队形变化·双龙出海',
  },
  {
    id: 'r4', programId: 'p3', roomId: 'room2', date: '2026-09-15', timeSlot: '周二 19:00–20:30',
    checkins: { m13: 'present', m14: 'present', m15: 'present', m16: 'present' },
    note: '演出前最后一次合练，全员到齐',
  },
  {
    id: 'r5', programId: 'p4', roomId: 'room2', date: '2026-09-24', timeSlot: '周四 19:00–20:30',
    checkins: { m13: 'present', m14: 'present', m15: 'present', m16: 'leave' },
    note: '黄德海彩排后心口不适提前休息，已联系家属，演出当天视情况安排',
  },
]

// ============ 服装（押金/代领/尺码返换/备用服/归还） ============
const cos = (
  memberId: string, programId: string, size: CostumeRecord['size'],
  extra: Partial<CostumeRecord> = {},
): CostumeRecord => ({
  memberId, programId, size,
  deposit: 100, depositStatus: 'held', depositPaid: true,
  pickedUp: false, pickedUpBy: '', pickedUpAt: '',
  returned: false, returnedAt: '', sizeIssue: '',
  originalSize: size, tryOnPhoto: '', tryOnNote: '',
  exchangeStatus: '', wantedSize: '', exchangeAt: '', exchangedAt: '',
  fallback: '', fallbackNote: '',
  backupEnabled: false, backupEnabledAt: '', backupSize: '',
  backupDeposit: 0, backupDepositStatus: 'unpaid',
  cleaningOwner: '', cleaningDone: false, backupReturned: false, backupReturnedAt: '',
  ...extra,
})

export const costumes: CostumeRecord[] = [
  cos('m1', 'p1', 'M', { pickedUp: true, pickedUpBy: '本人', pickedUpAt: '2026-09-25 19:00' }),
  cos('m2', 'p1', 'L', { pickedUp: true, pickedUpBy: '本人', pickedUpAt: '2026-09-25 19:02' }),
  cos('m3', 'p1', 'M', { pickedUp: true, pickedUpBy: '本人', pickedUpAt: '2026-09-25 19:05' }),
  cos('m4', 'p1', 'XL'),
  cos('m5', 'p1', 'S', { pickedUp: true, pickedUpBy: '本人', pickedUpAt: '2026-09-25 19:08' }),
  // 演出前仍未换到合适尺码（L→XL，XL 无货），押金仍保管、等待队长处置
  cos('m6', 'p1', 'L', {
    pickedUp: true, pickedUpBy: '本人', pickedUpAt: '2026-09-26 18:30',
    originalSize: 'L', tryOnPhoto: '👖', tryOnNote: '试穿照：腰部紧绷、裤长偏短，下蹲受限',
    sizeIssue: 'L码偏紧，下蹲时腰部勒，申请换XL',
    exchangeStatus: 'unresolved', wantedSize: 'XL', exchangeAt: '2026-09-26 18:40',
  }),
  cos('m7', 'p1', 'M'),
  cos('m8', 'p1', 'XL', { pickedUp: true, pickedUpBy: '本人', pickedUpAt: '2026-09-25 19:12' }),
  cos('m9', 'p1', 'XXL', { pickedUp: true, pickedUpBy: '吴强（儿子）代领', pickedUpAt: '2026-09-26 09:20' }),
  // 已完成换货：原 S 偏小 → 换到 M（原尺码保留用于紧缺统计）
  cos('m10', 'p1', 'M', {
    pickedUp: true, pickedUpBy: '本人', pickedUpAt: '2026-09-25 19:15',
    originalSize: 'S', tryOnPhoto: '👕', tryOnNote: '试穿照：S 码肩部太紧、抬臂受限',
    exchangeStatus: 'exchanged', wantedSize: 'M', exchangeAt: '2026-09-25 19:20', exchangedAt: '2026-09-27 16:00',
  }),
  cos('m11', 'p1', 'M'),
  cos('m12', 'p1', 'L', { depositStatus: 'unpaid', depositPaid: false }),
  // 已归档节目：全部归还、押金已退
  cos('m13', 'p3', 'L', { pickedUp: true, pickedUpBy: '本人', pickedUpAt: '2026-09-12 19:00', returned: true, returnedAt: '2026-09-18 10:00', depositStatus: 'refunded' }),
  cos('m14', 'p3', 'M', { pickedUp: true, pickedUpBy: '本人', pickedUpAt: '2026-09-12 19:02', returned: true, returnedAt: '2026-09-18 10:02', depositStatus: 'refunded' }),
  cos('m15', 'p3', 'M', { pickedUp: true, pickedUpBy: '女儿代领', pickedUpAt: '2026-09-12 19:05', returned: true, returnedAt: '2026-09-18 10:05', depositStatus: 'refunded' }),
  // 已归档：演出前 XXL 无货 → 队长启用备用服；演出后备用服归还+清洗完成，原押金结转抵扣、备用服押金已退
  cos('m16', 'p3', 'XL', {
    pickedUp: true, pickedUpBy: '本人', pickedUpAt: '2026-09-12 19:08', returned: true, returnedAt: '2026-09-18 10:08',
    originalSize: 'XL', tryOnPhoto: '🧥', tryOnNote: '试穿照：XL 胸口偏紧、转身受限',
    sizeIssue: 'XL偏紧申请XXL，演出前XXL无货',
    exchangeStatus: 'backup', wantedSize: 'XXL', exchangeAt: '2026-09-13 20:00',
    fallback: 'backup', fallbackNote: '演出前XXL无货：队长启用备用服装顶替，黄德海同步调至后排居中位。',
    depositStatus: 'forfeited',
    backupEnabled: true, backupEnabledAt: '2026-09-14 18:00', backupSize: 'XXL',
    backupDeposit: 100, backupDepositStatus: 'refunded',
    cleaningOwner: '服装组·周阿姨', cleaningDone: true,
    backupReturned: true, backupReturnedAt: '2026-09-18 10:10',
  }),
  // 演出当天节目：服装已发
  cos('m13', 'p4', 'L', { pickedUp: true, pickedUpBy: '本人', pickedUpAt: '2026-09-30 17:30' }),
  cos('m14', 'p4', 'M', { pickedUp: true, pickedUpBy: '本人', pickedUpAt: '2026-09-30 17:32' }),
  cos('m15', 'p4', 'M', { pickedUp: true, pickedUpBy: '本人', pickedUpAt: '2026-09-30 17:35' }),
  cos('m16', 'p4', 'XL', { pickedUp: true, pickedUpBy: '黄丽（女儿）代领', pickedUpAt: '2026-09-30 17:40' }),
]

// ============ 各节目可换库存（服装负责人维护并确认） ============
export const costumeStocks: CostumeStock[] = [
  { programId: 'p1', stock: { S: 0, M: 1, L: 0, XL: 0, XXL: 1 }, confirmed: true, confirmedAt: '2026-09-27 17:00', confirmedBy: '服装负责人·周敏' },
  { programId: 'p3', stock: { S: 0, M: 0, L: 0, XL: 0, XXL: 0 }, confirmed: true, confirmedAt: '2026-09-18 10:30', confirmedBy: '服装负责人·周敏' },
  { programId: 'p4', stock: { S: 0, M: 0, L: 0, XL: 0, XXL: 0 }, confirmed: true, confirmedAt: '2026-09-30 17:00', confirmedBy: '服装负责人·周敏' },
]

// ============ 排练室（多支队伍共用） ============
export const rooms: Room[] = [
  { id: 'room1', name: '文化活动中心·排练室A' },
  { id: 'room2', name: '文化活动中心·排练室B' },
]

export const bookings: RoomBooking[] = [
  { id: 'b1', roomId: 'room1', teamId: 't1', date: '2026-09-28', timeSlot: '周一 19:00–20:30', purpose: '《丰收锣鼓》队形合练' },
  { id: 'b2', roomId: 'room2', teamId: 't2', date: '2026-09-28', timeSlot: '周一 19:00–20:30', purpose: '合唱团常规排练' },
  { id: 'b3', roomId: 'room1', teamId: 't2', date: '2026-09-29', timeSlot: '周二 19:00–20:30', purpose: '新节目编排' },
  { id: 'b4', roomId: 'room1', teamId: 't1', date: '2026-09-30', timeSlot: '周三 19:00–20:30', purpose: '《丰收锣鼓》带装彩排' },
]

// ============ 通知 ============
export const notices: Notice[] = [
  { id: 'n1', programId: null, text: '近期降温，请65岁以上队员排练前自测血压，量力而行；有心脏疾病史者避免连续高强度段落。', level: 'info', targets: ['leader', 'member'], at: '2026-09-24 09:00', kind: 'health' },
  { id: 'n2', programId: 'p1', text: '接文化站通知：国庆汇演舞台由12米调整为9米宽，请各队压缩队形横宽（8列→6列 列以内）。', level: 'urgent', targets: ['leader'], at: '2026-09-24 16:00', kind: 'venue' },
  { id: 'n3', programId: 'p1', text: '《丰收锣鼓》曲目已更新为 V3 演出版（4′00″），请音响师替换播放文件，队员按新版本合练。', level: 'info', targets: ['sound', 'leader', 'member'], at: '2026-09-22 15:45', kind: 'general' },
  { id: 'n4', programId: null, text: '下次活动预告：10月15日重阳节慰问演出开始报名，请各队队长统计参加人数。', level: 'info', targets: ['leader', 'member'], at: '2026-09-23 10:00', kind: 'next' },
  { id: 'n5', programId: 'p4', text: '请1号节目《张灯结彩》演员到东侧候场区集合，志愿者注意搀扶黄德海老师。', level: 'urgent', targets: ['leader', 'volunteer', 'member'], at: '2026-10-01 18:40', kind: 'live' },
  { id: 'n6', programId: 'p1', text: '尺码返换：赵淑珍领取的 L 码偏小、需换 XL，但 XL 可换库存为 0，演出前若仍无货请队长调整站位或启用备用服装（押金状态同步更新）。', level: 'urgent', targets: ['costume', 'leader'], at: '2026-09-26 18:42', kind: 'size' },
  { id: 'n7', programId: 'p3', text: '备用服装已为黄德海启用（XXL）：原 XL 押金结转抵扣，备用服押金另收 100 元；清洗责任人服装组·周阿姨，演出后已于 09-18 归还并退押金。', level: 'info', targets: ['costume', 'leader'], at: '2026-09-14 18:05', kind: 'backup' },
]

// ============ 现场照片（归档节目） ============
export const photos: Photo[] = [
  { id: 'ph1', programId: 'p3', emoji: '🥁', caption: '谢幕合影', at: '2026-09-17 21:10' },
  { id: 'ph2', programId: 'p3', emoji: '💃', caption: '伴舞展开瞬间', at: '2026-09-17 20:05' },
  { id: 'ph3', programId: 'p3', emoji: '👗', caption: '统一定制服装合影', at: '2026-09-17 19:00' },
]

// ============ 走位调整日志 ============
export const formationLogs: FormationLog[] = [
  { id: 'fl1', programId: 'p1', text: '张桂芳调至前排中心位（原刘玉梅位）', at: '2026-09-22 20:30' },
  { id: 'fl2', programId: 'p3', text: '黄德海由前排调至后排右侧（心脏原因）', at: '2026-09-14 20:00' },
]
