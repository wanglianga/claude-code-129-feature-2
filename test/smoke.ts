import { useStore, absentSet, placedSet, stageDone } from '../src/store'
import { activeDeposit, sizeShortages } from '../src/costume'

let pass = 0, fail = 0
const assert = (cond: boolean, msg: string) => {
  if (cond) { pass++; console.log('  ✓', msg) }
  else { fail++; console.log('  ✗', msg) }
}

const s = useStore.getState()

console.log('1. 报名 → 自动生成服装押金记录')
s.enroll('p2', 'm2', 'L', true, '膝关节滑膜炎，避免久蹲', ['周一晚', '周三晚'])
assert(useStore.getState().programs.find((p) => p.id === 'p2')!.memberIds.includes('m2'), '队员进入节目名单')
const c = useStore.getState().costumes.find((x) => x.memberId === 'm2' && x.programId === 'p2')
assert(!!c && c.deposit === 100 && !c.depositPaid, '服装记录生成、押金100未交')

console.log('2. 排练签到：请假/缺席 → 缺席集合')
const r3 = useStore.getState().rehearsals.find((r) => r.id === 'r3')!
s.checkin('r3', 'm2', 'leave')
s.checkin('r3', 'm9', 'absent')
const absent = absentSet(useStore.getState().rehearsals, 'p1')
assert(absent.get('m2') === 'leave' && absent.get('m9') === 'absent', '请假与缺席被识别')

console.log('3. 走位：放置队员 + 每人唯一站位')
s.assignCell('p2', 0, 0, 'm2')
s.assignCell('p2', 0, 1, 'm2') // 再放一次到别处
const p2 = useStore.getState().programs.find((p) => p.id === 'p2')!
assert(p2.formation.cells[0][0] === null && p2.formation.cells[0][1] === 'm2', '同一队员只占一个格子')
assert(placedSet(p2).has('m2'), '已就位集合包含该队员')

console.log('4. 场地缩小：裁列 → 队员待安置 + 调整日志 + 通知')
const before = placedSet(useStore.getState().programs.find((p) => p.id === 'p1')!).size
s.shrinkVenue('p1', '6')
const p1 = useStore.getState().programs.find((p) => p.id === 'p1')!
assert(p1.formation.cols === 6, '列数压缩为6')
assert(p1.formation.cells[0].length === 6, '网格宽度为6列')
assert(placedSet(p1).size <= before, '被裁列队员离开站位（待安置）')
assert(useStore.getState().formationLogs.some((l) => l.programId === 'p1' && l.text.includes('场地缩小')), '生成走位调整记录')
assert(useStore.getState().notices.some((n) => n.kind === 'venue'), '生成场地通知')

console.log('5. 曲目版本更新：新版本置当前并通知音响师')
s.uploadMusicVersion('p2', 'V2 精简版', '茉莉花_V2.mp3', '时长缩短', '队长')
const pv2 = useStore.getState().programs.find((p) => p.id === 'p2')!
const cur = pv2.musicVersions.find((v) => v.current)!
assert(cur.label === 'V2 精简版' && pv2.musicVersions.filter((v) => v.current).length === 1, '只有一个当前版本')
assert(useStore.getState().notices.some((n) => n.targets.includes('sound') && n.text.includes('曲目版本更新')), '通知音响师')

console.log('6. 节目审查：要求调整 → 退回排练阶段；通过 → 待演出')
s.reviewProgram('p1', 'changes_requested', '内容需调整', '文化站·陈老师')
assert(useStore.getState().programs.find((p) => p.id === 'p1')!.stage === 'rehearsing', '退回排练阶段')
s.reviewProgram('p1', 'approved', '通过', '文化站·陈老师')
assert(useStore.getState().programs.find((p) => p.id === 'p1')!.stage === 'ready', '审查通过后待演出')

console.log('7. 服装流程：收押金 → 家属代领 → 试穿偏小上报(照片/原尺码) → 库存换货 → 归还退押金')
s.payDeposit('m2', 'p2')
s.pickupCostume('m2', 'p2', '吴强（儿子）代领')
let cc = useStore.getState().costumes.find((x) => x.memberId === 'm2' && x.programId === 'p2')!
assert(cc.depositPaid && cc.pickedUp && cc.pickedUpBy.includes('儿子'), '押金收取、家属代领登记')
s.reportSizeIssue('m2', 'p2', 'L码偏紧下蹲勒', 'XL', '👖')
cc = useStore.getState().costumes.find((x) => x.memberId === 'm2' && x.programId === 'p2')!
assert(cc.exchangeStatus === 'reported' && cc.originalSize === 'L' && cc.wantedSize === 'XL' && cc.tryOnPhoto === '👖', '记录试穿照片、原尺码 L、期望 XL')
// 无库存时换领被拦截
s.initStock('p2')
assert(s.exchangeCostume('m2', 'p2', 'XL') !== null, '可换库存为 0 时禁止换领')
s.setStock('p2', 'XL', 1)
assert(useStore.getState().costumeStocks.find((x) => x.programId === 'p2')!.confirmed === false, '改动库存后需重新确认')
s.markExchangeStock('m2', 'p2', true)
cc = useStore.getState().costumes.find((x) => x.memberId === 'm2' && x.programId === 'p2')!
assert(cc.exchangeStatus === 'exchanging', '服装负责人核对有货 → 待换领')
assert(s.exchangeCostume('m2', 'p2', 'XL') === null, '有货时换领成功')
cc = useStore.getState().costumes.find((x) => x.memberId === 'm2' && x.programId === 'p2')!
const st2 = useStore.getState().costumeStocks.find((x) => x.programId === 'p2')!
assert(cc.size === 'XL' && cc.originalSize === 'L' && cc.exchangeStatus === 'exchanged' && cc.sizeIssue === '', '换到 XL，原尺码 L 保留，问题清除')
assert(st2.stock.XL === 0, '换领扣减可换库存')
assert(cc.depositStatus === 'held', '换货后原押金继续保管')
s.confirmStock('p2', '服装负责人·周敏')
assert(useStore.getState().costumeStocks.find((x) => x.programId === 'p2')!.confirmed, '服装负责人确认库存')
s.returnCostume('m2', 'p2')
cc = useStore.getState().costumes.find((x) => x.memberId === 'm2' && x.programId === 'p2')!
assert(cc.returned && !!cc.returnedAt && cc.depositStatus === 'refunded', '原服归还登记时间并退押金')

console.log('7b. 演出前无货 → 队长启用备用服：押金结转、清洗责任与归还时间重记')
s.enroll('p2', 'm7', 'S', true, '', [])
s.payDeposit('m7', 'p2'); s.pickupCostume('m7', 'p2', '本人')
s.reportSizeIssue('m7', 'p2', 'S码肩紧抬臂受限', 'M', '👕')
s.markExchangeStock('m7', 'p2', false)
let c5 = useStore.getState().costumes.find((x) => x.memberId === 'm7' && x.programId === 'p2')!
assert(c5.exchangeStatus === 'unresolved', '演出前 M 无货 → 待队长处置')
assert(useStore.getState().notices.some((n) => n.kind === 'size' && n.level === 'urgent'), '生成尺码紧缺紧急通知')
assert(s.enableBackup('m7', 'p2', 'M', 100, '服装组·周阿姨') === null, '启用备用服成功')
c5 = useStore.getState().costumes.find((x) => x.memberId === 'm7' && x.programId === 'p2')!
assert(c5.backupEnabled && c5.backupSize === 'M' && c5.exchangeStatus === 'backup', '备用服启用、尺码重记')
assert(c5.depositStatus === 'forfeited', '原 S 服押金结转抵扣')
assert(activeDeposit(c5).status === 'held' && activeDeposit(c5).amount === 100, '当前生效押金切换为备用服押金（保管中）')
assert(c5.cleaningOwner === '服装组·周阿姨' && !c5.backupReturned, '清洗责任人记录、备用服待归还')
assert(useStore.getState().notices.some((n) => n.kind === 'backup'), '生成备用服装通知')
s.setCleaningDone('m7', 'p2', true)
s.returnBackup('m7', 'p2')
c5 = useStore.getState().costumes.find((x) => x.memberId === 'm7' && x.programId === 'p2')!
assert(c5.cleaningDone && c5.backupReturned && !!c5.backupReturnedAt && c5.backupDepositStatus === 'refunded', '备用服清洗完成、归还时间与退押金重记')

console.log('7c. 演出前无货 → 队长调整站位（押金仍保管）')
s.enroll('p2', 'm8', 'M', true, '', [])
s.payDeposit('m8', 'p2'); s.pickupCostume('m8', 'p2', '本人')
s.reportSizeIssue('m8', 'p2', 'M码偏小', 'L', '🧥')
s.markExchangeStock('m8', 'p2', false)
s.resolveByFormation('m8', 'p2', '调至后排居中，减少下蹲动作')
const c3 = useStore.getState().costumes.find((x) => x.memberId === 'm8' && x.programId === 'p2')!
assert(c3.exchangeStatus === 'repositioned' && c3.fallback === 'formation' && c3.depositStatus === 'held', '调整站位处置闭环、押金仍保管')
assert(useStore.getState().formationLogs.some((l) => l.programId === 'p2' && l.text.includes('尺码偏小')), '生成走位调整记录')

console.log('7d. 长期紧缺尺码派生')
const short = sizeShortages(useStore.getState().programs, useStore.getState().costumes, useStore.getState().costumeStocks)
assert(short.some((x) => x.size === 'XL' && x.gap >= 1), 'XL 长期紧缺（赵淑珍等待换、库存 0）')
assert(short.some((x) => x.size === 'L' && x.gap >= 1), 'L 出现紧缺缺口（演出前无货改调站位）')
const mRow = short.find((x) => x.size === 'M')!
assert(mRow.reports >= 2 && mRow.gap === 0, 'M 累计上报含已换到(郑爱华)，库存可覆盖时缺口为 0')

console.log('8. 排练室冲突拦截')
assert(s.bookRoom('room1', 't2', '2026-09-28', '周一 19:00–20:30', '冲突测试') !== null, '同时段同室被拦截')
assert(s.bookRoom('room2', 't2', '2026-10-06', '周二 19:00–20:30', '不冲突') === null, '不同日期同室可预订')

console.log('9. 现场签到 + 候场顺序调整')
s.onsiteCheckin('p4', 'm15')
assert(useStore.getState().onsite['p4']['m15'] === true, '现场签到生效')
const orderBefore = useStore.getState().programs.filter((p) => p.stage === 'ready' || p.stage === 'showday').map((p) => p.waitingOrder)
s.moveWaiting('p4', 1)
assert(JSON.stringify(orderBefore) !== JSON.stringify(useStore.getState().programs.filter((p) => p.stage === 'ready' || p.stage === 'showday').map((p) => p.waitingOrder)), '候场顺序可调整')

console.log('10. 连续性链条：p4 各环节齐全')
const p4 = useStore.getState().programs.find((p) => p.id === 'p4')!
const done = stageDone(p4, useStore.getState().rehearsals, useStore.getState().costumes, useStore.getState().onsite)
assert(done.signup && done.rehearsing && done.positioning && done.costume && done.review, '报名→排练→走位→服装→审核 均完成')

console.log(`\n结果：${pass} 通过，${fail} 失败`)
if (fail > 0) process.exit(1)
