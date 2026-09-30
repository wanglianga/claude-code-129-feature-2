import { useStore, absentSet, placedSet, stageDone, pendingExchanges, awaitingDecision, shortageStats, stockOf } from '../src/store'

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

console.log('7. 服装流程：收押金 → 家属代领 → 上报尺码问题 → 换货 → 归还')
s.payDeposit('m2', 'p2')
s.pickupCostume('m2', 'p2', '吴强（儿子）代领')
let cc = useStore.getState().costumes.find((x) => x.memberId === 'm2' && x.programId === 'p2')!
assert(cc.depositPaid && cc.pickedUp && cc.pickedUpBy.includes('儿子'), '押金收取、家属代领登记')
s.reportSizeIssue('m2', 'p2', 'L码偏紧')
s.resolveSizeIssue('m2', 'p2', 'XL')
cc = useStore.getState().costumes.find((x) => x.memberId === 'm2' && x.programId === 'p2')!
assert(cc.size === 'XL' && cc.sizeIssue === '', '换货更新尺码并清除问题')
s.returnCostume('m2', 'p2')
assert(useStore.getState().costumes.find((x) => x.memberId === 'm2' && x.programId === 'p2')!.returned, '归还登记')

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

console.log('11. 尺码返换：试穿照片/原尺码 → 确认有货 → 换货扣库存，押金延续')
s.reportSizeIssue('m10', 'p1', 'S码偏小，想换M')
s.recordTryOn('m10', 'p1', '🤏', '腋下紧绷', 'M')
let c10 = useStore.getState().costumes.find((x) => x.memberId === 'm10' && x.programId === 'p1')!
assert(c10.originalSize === 'S' && c10.wantedSize === 'M' && c10.tryOnPhotos.length === 1, '记录原尺码、期望尺码与试穿照片')
assert(pendingExchanges(useStore.getState().costumes, 'p1').some((c) => c.memberId === 'm10'), '进入待返换列表')
assert(stockOf(useStore.getState().costumeStocks, 'p1', 'M')!.exchangeable === 3, 'M码可换库存初始为3')
s.confirmStock('m10', 'p1', true, 'M码有货')
c10 = useStore.getState().costumes.find((x) => x.memberId === 'm10' && x.programId === 'p1')!
assert(c10.stockChecked && c10.stockAvailable, '服装负责人确认有货')
assert(!awaitingDecision(useStore.getState().costumes, 'p1').some((c) => c.memberId === 'm10'), '有货不进入缺货待决策')
s.exchangeCostume('m10', 'p1', 'M')
c10 = useStore.getState().costumes.find((x) => x.memberId === 'm10' && x.programId === 'p1')!
assert(c10.size === 'M' && c10.resolution === 'exchanged' && c10.sizeIssue === '', '换货更新尺码并标记已处置')
assert(c10.depositPaid, '原押金延续有效，无需重交')
assert(stockOf(useStore.getState().costumeStocks, 'p1', 'M')!.exchangeable === 2, '换货后可换库存 3→2')
assert(useStore.getState().enrollments.find((e) => e.memberId === 'm10' && e.programId === 'p1')!.costumeSize === 'M', '报名尺码同步更新')

console.log('12. 确认无货 → 队长调整站位：紧缺记录 + 走位日志 + 通知')
s.reportSizeIssue('m4', 'p1', 'XL仍偏小')
s.recordTryOn('m4', 'p1', '📏', '衣长偏短', 'XXL')
s.setStock('p1', 'XXL', 0, 'XXL无货')
s.confirmStock('m4', 'p1', false, 'XXL无货可换')
assert(awaitingDecision(useStore.getState().costumes, 'p1').some((c) => c.memberId === 'm4'), '无货进入待队长决策')
const logsBefore = useStore.getState().formationLogs.length
s.resolveByReposition('m4', 'p1', '调到后排中间，宽松外搭遮掩')
const c4 = useStore.getState().costumes.find((x) => x.memberId === 'm4' && x.programId === 'p1')!
assert(c4.resolution === 'reposition', '处置标记为调整站位')
assert(useStore.getState().formationLogs.length === logsBefore + 1, '生成走位调整记录')
assert(useStore.getState().formationLogs.some((l) => l.programId === 'p1' && l.text.includes('尺码偏小') && l.text.includes('调整站位')), '日志说明因尺码偏小调站位')
assert(useStore.getState().sizeShortages.some((x) => x.memberId === 'm4' && x.reason === 'reposition'), '记入尺码紧缺（调站位）')
assert(!awaitingDecision(useStore.getState().costumes, 'p1').some((c) => c.memberId === 'm4'), '处置后移出待决策')

console.log('13. 启用备用服装：押金/清洗责任/归还时间重录并同步，归还退押金')
s.reportSizeIssue('m11', 'p1', 'M偏小')
s.recordTryOn('m11', 'p1', '👕', '抬臂困难', 'L')
s.setStock('p1', 'L', 0, 'L无货')
s.confirmStock('m11', 'p1', false, 'L无货')
s.activateBackup('m11', 'p1', { size: 'L', deposit: 80, cleaningDuty: '家属代洗', returnBy: '2026-10-02 12:00前', note: '备用B-09' })
let c11 = useStore.getState().costumes.find((x) => x.memberId === 'm11' && x.programId === 'p1')!
assert(c11.resolution === 'backup' && !!c11.backup, '已启用备用服装')
assert(c11.backup!.size === 'L' && c11.backup!.deposit === 80 && !c11.backup!.depositPaid, '备用押金重录且初始未交')
assert(c11.backup!.cleaningDuty === '家属代洗' && c11.backup!.returnBy.includes('2026-10-02'), '清洗责任与归还时间重录')
assert(c11.depositPaid && !c11.returned, '原服装押金保留、状态同步（未归还）')
s.payBackupDeposit('m11', 'p1')
s.returnCostume('m11', 'p1')
c11 = useStore.getState().costumes.find((x) => x.memberId === 'm11' && x.programId === 'p1')!
assert(c11.returned && c11.backup!.returned && c11.backup!.returnedAt.length > 0, '备用服归还并记录实际归还时间，押金可退')
assert(useStore.getState().sizeShortages.some((x) => x.memberId === 'm11' && x.reason === 'backup_used'), '记入尺码紧缺（启用备用）')
assert(useStore.getState().notices.some((n) => n.kind === 'costume' && n.text.includes('备用服装') && n.text.includes('押金')), '生成备用服装押金/清洗/归还通知')

console.log('14. 长期紧缺尺码统计')
const stats = shortageStats(useStore.getState().sizeShortages)
const xl = stats.find((x) => x.size === 'XL')!
assert(xl.count >= 3 && xl.longTerm, `XL累计紧缺${xl.count}次并标记长期紧缺`)
assert(stats.find((x) => x.size === 'XXL')!.longTerm && stats.find((x) => x.size === 'L')!.longTerm, 'XXL、L 本轮各累计2次也标记长期紧缺')
assert(stats.every((x) => x.oos + x.backup + x.reposition === x.count), '紧缺分类计数与总数一致')

console.log(`\n结果：${pass} 通过，${fail} 失败`)
if (fail > 0) process.exit(1)
