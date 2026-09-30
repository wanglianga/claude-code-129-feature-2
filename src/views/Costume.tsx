import { useState } from 'react'
import { useStore, costumeReadiness } from '../store'
import { sizeShortages, stockOf } from '../costume'
import {
  DEPOSIT_LABEL, SIZES, STAGE_LABEL,
  type CostumeRecord, type CostumeSize, type DepositStatus, type ExchangeStatus,
} from '../types'

const PHOTO_EMOJIS = ['👕', '👖', '🧥', '👗', '📸']
const CONFIRMER = '服装负责人·周敏'

const EXCHANGE_LABEL: Record<ExchangeStatus, string> = {
  reported: '已试穿上报·待核库存',
  exchanging: '库存有货·待换领',
  exchanged: '已换到合适尺码',
  unresolved: '演出前无货·待队长处置',
  repositioned: '已调整站位处置',
  backup: '已启用备用服装',
}

function DepositBadge({ status, amount }: { status: DepositStatus; amount: number }) {
  const cls: Record<DepositStatus, string> = {
    unpaid: 'red', held: 'gold', forfeited: 'blue', refunded: 'green',
  }
  const text = status === 'unpaid'
    ? DEPOSIT_LABEL.unpaid
    : status === 'held'
      ? `${DEPOSIT_LABEL.held} ¥${amount}`
      : status === 'forfeited'
        ? `${DEPOSIT_LABEL.forfeited} ¥${amount}`
        : `${DEPOSIT_LABEL.refunded} ¥${amount}`
  return <span className={`badge ${cls[status]}`}>{text}</span>
}

export default function Costume() {
  const role = useStore((s) => s.role)
  const programs = useStore((s) => s.programs)
  const costumes = useStore((s) => s.costumes)
  const stocks = useStore((s) => s.costumeStocks)
  const members = useStore((s) => s.members)
  const currentMemberId = useStore((s) => s.currentMemberId)

  const payDeposit = useStore((s) => s.payDeposit)
  const pickup = useStore((s) => s.pickupCostume)
  const ret = useStore((s) => s.returnCostume)
  const reportIssue = useStore((s) => s.reportSizeIssue)
  const markStock = useStore((s) => s.markExchangeStock)
  const exchange = useStore((s) => s.exchangeCostume)
  const byFormation = useStore((s) => s.resolveByFormation)
  const enableBackup = useStore((s) => s.enableBackup)
  const payBackup = useStore((s) => s.payBackupDeposit)
  const returnBackup = useStore((s) => s.returnBackup)
  const setCleaning = useStore((s) => s.setCleaningDone)
  const initStock = useStore((s) => s.initStock)
  const setStockQty = useStore((s) => s.setStock)
  const confirmStock = useStore((s) => s.confirmStock)

  const [pid, setPid] = useState(programs[0]?.id ?? '')
  const program = programs.find((p) => p.id === pid) ?? programs[0]

  // 各成员行的本地表单
  const [pickupWho, setPickupWho] = useState<Record<string, string>>({})
  const [wanted, setWanted] = useState<Record<string, CostumeSize>>({})
  const [photo, setPhoto] = useState<Record<string, string>>({})
  const [issueText, setIssueText] = useState<Record<string, string>>({})
  const [target, setTarget] = useState<Record<string, CostumeSize>>({})
  const [fbNote, setFbNote] = useState<Record<string, string>>({})
  const [bkSize, setBkSize] = useState<Record<string, CostumeSize>>({})
  const [bkDeposit, setBkDeposit] = useState<Record<string, string>>({})
  const [bkOwner, setBkOwner] = useState<Record<string, string>>({})

  if (!program) return null
  const isCostume = role === 'costume'
  const isLeader = role === 'leader'
  const manage = isCostume || isLeader
  const archived = program.stage === 'archived'

  let list = costumes.filter((c) => c.programId === program.id)
  if (role === 'member') list = list.filter((c) => c.memberId === currentMemberId)

  const ready = costumeReadiness(program.id, costumes)
  const returnedCount = list.filter((c) => c.returned).length
  const stock = stocks.find((x) => x.programId === program.id)
  const shortages = sizeShortages(programs, costumes, stocks)

  const wantedOf = (c: CostumeRecord): CostumeSize => wanted[c.memberId] ?? (c.wantedSize || 'XL')
  const targetOf = (c: CostumeRecord): CostumeSize => target[c.memberId] ?? (c.wantedSize || 'XL')
  const bkSizeOf = (c: CostumeRecord): CostumeSize => bkSize[c.memberId] ?? (c.wantedSize || 'XL')

  return (
    <div>
      <div className="card">
        <div className="row">
          <h3 style={{ margin: 0 }}>服装管理 · 尺码返换</h3>
          <select className="inp" style={{ width: 'auto' }} value={program.id} onChange={(e) => setPid(e.target.value)}>
            {programs.map((p) => <option key={p.id} value={p.id}>《{p.title}》（{STAGE_LABEL[p.stage]}）</option>)}
          </select>
          <span className="row" style={{ marginLeft: 'auto' }}>
            <span className="badge gold">押金未收 {ready.unpaid}</span>
            <span className="badge brand">未领 {ready.unpicked}</span>
            <span className="badge blue">返换中 {ready.openExchange}</span>
            {ready.pendingFallback > 0 && <span className="badge red">待队长处置 {ready.pendingFallback}</span>}
            {ready.backupOpen > 0 && <span className="badge red">备用服未闭环 {ready.backupOpen}</span>}
            <span className="badge green">原服已还 {returnedCount}/{ready.total}</span>
          </span>
        </div>
        <div className="muted mt8">
          领取后试穿发现偏小：登记<b>试穿照片、原尺码、领取人</b>与期望尺码，服装负责人核对<b>可换库存</b>后换货；
          演出前仍换不到时由队长<b>调整站位或启用备用服装</b>，押金状态同步更新；备用服的押金、清洗责任与归还时间单独重记。
        </div>
      </div>

      {/* 库存确认 + 长期紧缺尺码（服装负责人 / 队长） */}
      {(manage || role === 'member') && (
        <div className="grid2">
          <div className="card">
            <div className="spread">
              <h3 style={{ margin: 0 }}>
                可换库存（按尺码）
                {stock?.confirmed
                  ? <span className="badge green" style={{ marginLeft: 8 }}>已确认 · {stock.confirmedAt}</span>
                  : <span className="badge gold" style={{ marginLeft: 8 }}>待服装负责人确认</span>}
              </h3>
              {manage && !archived && !stock && (
                <button className="btn sm" onClick={() => initStock(program.id)}>初始化库存表</button>
              )}
            </div>
            {stock ? (
              <>
                <div className="row mt8">
                  {SIZES.map((sz) => (
                    <label key={sz} className="fld" style={{ margin: 0, textAlign: 'center', minWidth: 74 }}>
                      {sz}
                      <input
                        className="inp" type="number" min={0} style={{ textAlign: 'center', marginTop: 4, padding: '7px' }}
                        value={stock.stock[sz] ?? 0}
                        disabled={!manage || archived || !isCostume}
                        onChange={(e) => setStockQty(program.id, sz, parseInt(e.target.value, 10) || 0)}
                      />
                    </label>
                  ))}
                </div>
                {isCostume && !archived && (
                  <div className="row mt8">
                    <button className="btn sm primary" onClick={() => confirmStock(program.id, CONFIRMER)}>服装负责人确认库存</button>
                    {stock.confirmedBy && <span className="muted">确认人：{stock.confirmedBy}</span>}
                  </div>
                )}
                {!isCostume && <div className="muted mt8">数字由服装负责人维护并确认，队员仅查看。</div>}
              </>
            ) : <div className="muted mt8">{archived ? '该节目无库存记录。' : '尚未建立可换库存表。'}</div>}
          </div>

          <div className="card">
            <h3 style={{ margin: 0 }}>哪些尺码长期紧缺
              <span className="sub">跨在办节目：未解决返换需求 − 当前库存</span>
            </h3>
            {shortages.length === 0 && <div className="muted mt8">暂无尺码返换需求。</div>}
            {shortages.map((sh) => (
              <div key={sh.size} className="spread mb8" style={{ borderBottom: '1px dashed var(--line)', paddingBottom: 6 }}>
                <span><b style={{ fontSize: 16 }}>{sh.size} 码</b>
                  {sh.gap > 0
                    ? <span className="badge red" style={{ marginLeft: 8 }}>紧缺 · 缺口 {sh.gap}</span>
                    : <span className="badge green" style={{ marginLeft: 8 }}>库存可覆盖</span>}
                </span>
                <span className="muted">待换 {sh.demand} 件 · 累计上报偏小 {sh.reports} 人次 · 可换库存 {sh.stock} 件</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 每位队员一张服装卡 */}
      {list.map((c) => {
        const m = members.find((x) => x.id === c.memberId)!
        const wantQty = stockOf(stocks, program.id, wantedOf(c))
        const tgt = targetOf(c)
        const tgtQty = stockOf(stocks, program.id, tgt)
        return (
          <div className="card" key={c.memberId} style={c.exchangeStatus === 'unresolved' ? { borderColor: 'var(--red)', boxShadow: '0 0 0 2px var(--red-soft)' } : undefined}>
            <div className="spread">
              <h3 style={{ margin: 0 }}>
                {m.name} <span className="sub">{m.age} 岁</span>
                {c.backupEnabled && <span className="badge blue" style={{ marginLeft: 8 }}>备用服 {c.backupSize} 码</span>}
                {c.returned && <span className="badge green" style={{ marginLeft: 8 }}>原服已还{c.returnedAt ? ` · ${c.returnedAt}` : ''}</span>}
              </h3>
              {c.exchangeStatus && <span className={`badge ${c.exchangeStatus === 'unresolved' ? 'red' : c.exchangeStatus === 'exchanged' ? 'green' : 'blue'}`}>
                {EXCHANGE_LABEL[c.exchangeStatus]}
              </span>}
            </div>

            {/* 基础信息：领取人 / 原尺码→现尺码 / 押金 */}
            <div className="row mt8" style={{ alignItems: 'flex-start' }}>
              <div className="kv" style={{ minWidth: 230 }}>
                <dt>领取人</dt>
                <dd>{c.pickedUp ? <b>{c.pickedUpBy}</b> : <span className="muted">未领取</span>}{c.pickedUpAt ? `（${c.pickedUpAt}）` : ''}</dd>
                <dt>尺码</dt>
                <dd>
                  原 <b>{c.originalSize}</b> 码
                  {c.size !== c.originalSize ? <> → 现 <b style={{ color: 'var(--green)' }}>{c.size}</b> 码</> : '（未换货）'}
                </dd>
                <dt>原服押金</dt>
                <dd><DepositBadge status={c.depositStatus} amount={c.deposit} /></dd>
              </div>

              {/* 押金 / 领取操作 */}
              {!archived && manage && (
                <div className="row" style={{ gap: 6 }}>
                  {c.depositStatus === 'unpaid' && <button className="btn sm" onClick={() => payDeposit(c.memberId, c.programId)}>收押金 ¥100</button>}
                  {!c.pickedUp && (
                    <span className="row" style={{ gap: 6 }}>
                      <input className="inp" style={{ width: 150, padding: '6px 8px' }} placeholder="领取人（家属写关系）"
                        value={pickupWho[c.memberId] ?? ''} onChange={(e) => setPickupWho({ ...pickupWho, [c.memberId]: e.target.value })} />
                      <button className="btn sm primary" onClick={() => {
                        const who = (pickupWho[c.memberId] ?? '').trim()
                        if (!who) { alert('请填写领取人，家属代领请注明关系，如「吴强（儿子）」'); return }
                        pickup(c.memberId, c.programId, who)
                      }}>登记领取</button>
                    </span>
                  )}
                  {c.pickedUp && !c.returned && !c.backupEnabled && (
                    <button className="btn sm green" onClick={() => ret(c.memberId, c.programId)}>登记原服归还（退押金）</button>
                  )}
                </div>
              )}
            </div>

            {/* 试穿照片 + 尺码返换 */}
            {c.pickedUp && (
              <div style={{ borderTop: '1px dashed var(--line)', marginTop: 10, paddingTop: 10 }}>
                {!c.exchangeStatus ? (
                  /* 未发起返换：试穿偏小登记 */
                  !archived && (manage || role === 'member') ? (
                    <div className="row">
                      <span className="muted">试穿偏小登记：</span>
                      <select className="inp" style={{ width: 70, padding: '6px 8px' }} value={photo[c.memberId] ?? PHOTO_EMOJIS[0]}
                        onChange={(e) => setPhoto({ ...photo, [c.memberId]: e.target.value })}>
                        {PHOTO_EMOJIS.map((e) => <option key={e}>{e}</option>)}
                      </select>
                      <span className="muted">原 {c.originalSize} 码 → 期望</span>
                      <select className="inp" style={{ width: 70, padding: '6px 8px' }} value={wantedOf(c)}
                        onChange={(e) => setWanted({ ...wanted, [c.memberId]: e.target.value as CostumeSize })}>
                        {SIZES.map((s) => <option key={s}>{s}</option>)}
                      </select>
                      <input className="inp" style={{ width: 220, padding: '6px 8px' }} placeholder="试穿情况，如：腰部紧、下蹲受限"
                        value={issueText[c.memberId] ?? ''} onChange={(e) => setIssueText({ ...issueText, [c.memberId]: e.target.value })} />
                      <button className="btn sm" onClick={() => {
                        const v = (issueText[c.memberId] ?? '').trim()
                        if (!v) { alert('请填写试穿偏小情况'); return }
                        reportIssue(c.memberId, c.programId, v, wantedOf(c), photo[c.memberId] ?? PHOTO_EMOJIS[0])
                        setIssueText({ ...issueText, [c.memberId]: '' })
                      }}>记录试穿照片并上报</button>
                    </div>
                  ) : <span className="muted">试穿合适，暂无返换。</span>
                ) : (
                  /* 返换进行中 / 已完成 */
                  <div>
                    <div className="row" style={{ alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 30 }}>{c.tryOnPhoto || '📸'}</span>
                      <div>
                        <div><b>试穿照片</b>（{c.originalSize} 码偏小）· 领取人 {c.pickedUpBy} · 期望换 <b>{c.wantedSize}</b> 码
                          <span className="muted"> · 可换库存 <b style={{ color: wantQty > 0 ? 'var(--green)' : 'var(--red)' }}>{wantQty}</b> 件</span>
                        </div>
                        <div className="muted">{c.tryOnNote || c.sizeIssue}</div>
                        <div className="muted">发起返换：{c.exchangeAt}{c.exchangedAt ? ` · 换到：${c.exchangedAt}` : ''}</div>
                      </div>
                    </div>

                    {/* 服装负责人核对库存 */}
                    {!archived && manage && (c.exchangeStatus === 'reported') && (
                      <div className="row mt8">
                        <span className="muted">服装负责人核对 {c.wantedSize} 码可换库存：</span>
                        <button className="btn sm green" disabled={wantQty <= 0} title={wantQty <= 0 ? '当前库存为 0' : ''}
                          onClick={() => markStock(c.memberId, c.programId, true)}>有货，安排换领</button>
                        <button className="btn sm danger" onClick={() => markStock(c.memberId, c.programId, false)}>演出前无货，转队长处置</button>
                      </div>
                    )}

                    {/* 换领 */}
                    {!archived && manage && (c.exchangeStatus === 'exchanging') && (
                      <div className="row mt8">
                        <span className="muted">换领尺码</span>
                        <select className="inp" style={{ width: 76, padding: '6px 8px' }} value={tgt}
                          onChange={(e) => setTarget({ ...target, [c.memberId]: e.target.value as CostumeSize })}>
                          {SIZES.map((s) => <option key={s}>{s}</option>)}
                        </select>
                        <span className="muted">可换 {tgtQty} 件</span>
                        <button className="btn sm green" disabled={tgtQty <= 0} onClick={() => {
                          const err = exchange(c.memberId, c.programId, tgt)
                          if (err) alert(err)
                        }}>完成换领（扣减库存，押金继续保管）</button>
                      </div>
                    )}

                    {/* 演出前换不到：队长处置 */}
                    {!archived && c.exchangeStatus === 'unresolved' && (
                      <div className="alert gold mt8">
                        演出前 {c.wantedSize} 码仍无货。{isLeader
                          ? '请队长选择处置方式：'
                          : <b>等待队长调整站位或启用备用服装。</b>}
                        {isLeader && (
                          <div className="grid2 mt8" style={{ gap: 10 }}>
                            <div className="card" style={{ margin: 0, boxShadow: 'none' }}>
                              <b>① 调整站位</b>
                              <div className="muted">将该队员调到对服装版型要求低的位置，记录走位调整。</div>
                              <div className="row mt8">
                                <input className="inp" style={{ flex: 1, padding: '6px 8px' }} placeholder="如：调至后排居中，减少下蹲动作"
                                  value={fbNote[c.memberId] ?? ''} onChange={(e) => setFbNote({ ...fbNote, [c.memberId]: e.target.value })} />
                                <button className="btn sm primary" onClick={() => {
                                  const v = (fbNote[c.memberId] ?? '').trim()
                                  if (!v) { alert('请填写站位调整说明'); return }
                                  byFormation(c.memberId, c.programId, v); setFbNote({ ...fbNote, [c.memberId]: '' })
                                }}>确认调整站位</button>
                              </div>
                            </div>
                            <div className="card" style={{ margin: 0, boxShadow: 'none' }}>
                              <b>② 启用备用服装</b>
                              <div className="muted">原押金结转抵扣；备用服押金、清洗责任、归还时间重新记录。</div>
                              <div className="row mt8">
                                <select className="inp" style={{ width: 70, padding: '6px 8px' }} value={bkSizeOf(c)}
                                  onChange={(e) => setBkSize({ ...bkSize, [c.memberId]: e.target.value as CostumeSize })}>
                                  {SIZES.map((s) => <option key={s}>{s}</option>)}
                                </select>
                                <input className="inp" style={{ width: 86, padding: '6px 8px' }} type="number" min={0} placeholder="押金"
                                  value={bkDeposit[c.memberId] ?? '100'} onChange={(e) => setBkDeposit({ ...bkDeposit, [c.memberId]: e.target.value })} />
                                <input className="inp" style={{ width: 150, padding: '6px 8px' }} placeholder="清洗责任人"
                                  value={bkOwner[c.memberId] ?? '服装组·周阿姨'} onChange={(e) => setBkOwner({ ...bkOwner, [c.memberId]: e.target.value })} />
                                <button className="btn sm danger" onClick={() => {
                                  const dep = parseInt(bkDeposit[c.memberId] ?? '100', 10)
                                  const owner = (bkOwner[c.memberId] ?? '服装组·周阿姨').trim()
                                  const err = enableBackup(c.memberId, c.programId, bkSizeOf(c), isNaN(dep) ? 0 : dep, owner)
                                  if (err) alert(err)
                                }}>启用备用服</button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {c.fallback && (
                      <div className="muted mt8">队长处置：{c.fallback === 'formation' ? '调整站位' : '启用备用服装'} — {c.fallbackNote}</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 备用服装：押金 / 清洗责任 / 归还时间重新记录 */}
            {c.backupEnabled && (
              <div style={{ borderTop: '1px dashed var(--line)', marginTop: 10, paddingTop: 10, background: 'var(--blue-soft)', borderRadius: 8, padding: 10 }}>
                <div className="spread">
                  <b>备用服装（{c.backupSize} 码）· 启用 {c.backupEnabledAt}</b>
                  <DepositBadge status={c.backupDepositStatus} amount={c.backupDeposit} />
                </div>
                <div className="kv mt8">
                  <dt>清洗责任</dt>
                  <dd>
                    {c.cleaningOwner || <span className="muted">待指定</span>}
                    {!archived && manage && (
                      <label style={{ marginLeft: 10, fontWeight: 400 }}>
                        <input type="checkbox" checked={c.cleaningDone} onChange={(e) => setCleaning(c.memberId, c.programId, e.target.checked)} />
                        清洗完成
                      </label>
                    )}
                    {c.cleaningDone && <span className="badge green" style={{ marginLeft: 8 }}>已清洗</span>}
                  </dd>
                  <dt>归还时间</dt>
                  <dd>{c.backupReturned
                    ? <span className="badge green">{c.backupReturnedAt} 已归还{c.backupDepositStatus === 'refunded' ? ' · 押金已退' : ''}</span>
                    : <span className="badge gold">待演出后归还</span>}</dd>
                </div>
                {!archived && manage && (
                  <div className="row mt8">
                    {c.backupDepositStatus === 'unpaid' && <button className="btn sm" onClick={() => payBackup(c.memberId, c.programId)}>收备用服押金 ¥{c.backupDeposit}</button>}
                    {!c.backupReturned && <button className="btn sm green" onClick={() => returnBackup(c.memberId, c.programId)}>登记备用服归还（退押金并记时间）</button>}
                  </div>
                )}
                <div className="muted mt8">原 {c.originalSize} 码服装押金 ¥{c.deposit} 已结转抵扣（启用备用服），不再退原押金。</div>
              </div>
            )}
          </div>
        )
      })}

      {list.length === 0 && <div className="card muted">该节目暂无服装记录（队员报名后自动生成押金记录）。</div>}
    </div>
  )
}
