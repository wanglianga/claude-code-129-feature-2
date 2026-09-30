import { useStore, stageDone, absentSet, costumeReadiness } from '../store'
import { PIPELINE, STAGE_LABEL } from '../types'
import { useHelpers } from '../helpers'

export default function Dashboard() {
  const programs = useStore((s) => s.programs)
  const rehearsals = useStore((s) => s.rehearsals)
  const costumes = useStore((s) => s.costumes)
  const stocks = useStore((s) => s.costumeStocks)
  const onsite = useStore((s) => s.onsite)
  const notices = useStore((s) => s.notices)
  const members = useStore((s) => s.members)
  const { teamOf, nameOf } = useHelpers()

  const urgent = notices.filter((n) => n.level === 'urgent')
  const activePrograms = programs.filter((p) => p.stage !== 'archived')
  const activeIds = new Set(activePrograms.map((p) => p.id))
  const activeCostumes = costumes.filter((c) => activeIds.has(c.programId))
  const sizeIssues = activeCostumes.filter((c) => c.exchangeStatus && c.exchangeStatus !== 'exchanged')
  const pendingFallback = activeCostumes.filter((c) => c.exchangeStatus === 'unresolved')
  const backupOpen = activeCostumes.filter((c) => c.backupEnabled && (!c.backupReturned || !c.cleaningDone))
  const unpaid = activeCostumes.filter((c) => c.depositStatus === 'unpaid')
  const costumeTodo = sizeIssues.length + unpaid.length + backupOpen.length

  return (
    <div>
      {/* 预警区 */}
      {urgent.length > 0 && urgent.map((n) => (
        <div key={n.id} className="alert red">⚠ {n.text}</div>
      ))}

      <div className="grid3">
        <div className="card">
          <h3>在办节目</h3>
          <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--brand)' }}>
            {programs.filter((p) => p.stage !== 'archived').length}
          </div>
          <div className="muted">含 {programs.filter((p) => p.isAudition).length} 个文艺汇演海选节目</div>
        </div>
        <div className="card">
          <h3>服装待处理</h3>
          <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--gold)' }}>{costumeTodo}</div>
          <div className="muted">{sizeIssues.length} 件尺码返换中{ pendingFallback.length > 0 ? `（${pendingFallback.length} 件无货待处置）` : ''} · {unpaid.length} 人未交押金{ backupOpen.length > 0 ? ` · ${backupOpen.length} 件备用服未闭环` : ''}</div>
        </div>
        <div className="card">
          <h3>健康关注</h3>
          <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--green)' }}>
            {members.filter((m) => m.age >= 65 || m.healthNotes).length}
          </div>
          <div className="muted">65岁以上或登记身体注意事项的队员</div>
        </div>
      </div>

      {/* 节目连续性链条 */}
      {programs.map((p) => {
        const done = stageDone(p, rehearsals, costumes, onsite, stocks)
        const absent = absentSet(rehearsals, p.id)
        const frontAbsent = [...absent.keys()].filter((id) => members.find((m) => m.id === id)?.frontRow)
        const curIdx = PIPELINE.indexOf(p.stage)
        const broken = p.stage !== 'archived' && PIPELINE.slice(0, curIdx).some((st) => !done[st])
        const cr = costumeReadiness(p.id, costumes)
        return (
          <div className="card" key={p.id}>
            <div className="spread">
              <h3>
                《{p.title}》
                <span className="sub">{teamOf(p)} · {p.type} · {p.theme} · {p.durationMin}分钟 · 演出 {p.showDate}</span>
              </h3>
              <span className={`badge ${p.stage === 'archived' ? 'gray' : 'brand'}`}>{STAGE_LABEL[p.stage]}</span>
            </div>

            {/* 文化站关心的连续链条 */}
            <div className="chain">
              {PIPELINE.map((st, i) => {
                const ok = done[st]
                const isCurrent = p.stage === st
                const cls = isCurrent ? 'node current' : ok ? 'node done' : 'node'
                return (
                  <span key={st} style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <span className={cls} title={ok ? '已完成' : '待完成'}>
                      {ok ? '✓ ' : ''}{STAGE_LABEL[st]}
                    </span>
                    {i < PIPELINE.length - 1 && <span className="arrow">→</span>}
                  </span>
                )
              })}
            </div>
            {!broken && <div className="muted">链条连续，各环节记录完整。</div>}
            {broken && <div className="alert gold mt8">链条存在断档：当前阶段之前有环节未完成，请补齐记录后继续推进。</div>}

            <div className="row mt8">
              <span className="muted">场地：{p.venue}</span>
              <span className={`badge ${p.venueApproval === 'approved' ? 'green' : p.venueApproval === 'pending' ? 'gold' : 'red'}`}>
                场地{ p.venueApproval === 'approved' ? '已审批' : p.venueApproval === 'pending' ? '待审批' : '未通过'}
              </span>
              {p.isAudition && <span className="badge blue">文艺汇演海选</span>}
              {p.musicVersions.some((v) => v.current) && (
                <span className="muted">曲目：{p.musicVersions.find((v) => v.current)?.label}</span>
              )}
            </div>

            {/* 队长快速发现缺席影响的站位 */}
            {frontAbsent.length > 0 && p.stage !== 'archived' && (
              <div className="alert red mt8">
                前排缺席影响站位：{frontAbsent.map((id) => nameOf(id)).join('、')}
                （最近排练{absent.get(frontAbsent[0]) === 'leave' ? '请假' : '未到'}），请尽快安排替补或调整队形。
              </div>
            )}

            {/* 服装尺码返换 / 备用服状态 */}
            {p.stage !== 'archived' && !cr.ready && (
              <div className="alert gold mt8">
                服装未就绪：{cr.unpaid > 0 && `${cr.unpaid} 人押金未收、`}{cr.unpicked > 0 && `${cr.unpicked} 人未领取、`}
                {cr.openExchange > 0 && `${cr.openExchange} 件尺码返换进行中`}
                {cr.pendingFallback > 0 && `（${cr.pendingFallback} 件演出前无货，待队长调站位/启用备用服）`}。
              </div>
            )}
            {cr.pendingFallback > 0 && p.stage !== 'archived' && (
              <div className="alert red" style={{ marginTop: -4 }}>
                {costumes.filter((c) => c.programId === p.id && c.exchangeStatus === 'unresolved')
                  .map((c) => nameOf(c.memberId)).join('、')} 的尺码演出前换不到，请队长尽快调整站位或启用备用服装（押金状态同步更新）。
              </div>
            )}
            {cr.backupOpen > 0 && p.stage !== 'archived' && (
              <div className="alert blue mt8">
                {costumes.filter((c) => c.programId === p.id && c.backupEnabled && (!c.backupReturned || !c.cleaningDone))
                  .map((c) => nameOf(c.memberId)).join('、')} 已启用备用服装，演出后需重新登记归还时间、押金退还与清洗责任。
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
