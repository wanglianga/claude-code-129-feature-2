import { useMemo, useState } from 'react'
import { useStore, awaitingDecision, pendingExchanges, shortageStats, stockOf } from '../store'
import { SIZES, SHORTAGE_REASON_LABEL, STAGE_LABEL, type CostumeSize } from '../types'

const TRYON_EMOJIS = ['🤏', '📏', '👕', '👗', '🙅', '💪', '🪡', '📷']
const RESOLUTION_LABEL: Record<string, string> = {
  exchanged: '已换到合适尺码',
  backup: '已启用备用服装',
  reposition: '已调整站位将就',
}

interface BackupForm { size: CostumeSize; deposit: string; cleaningDuty: string; returnBy: string; note: string }

export default function Costume() {
  const role = useStore((s) => s.role)
  const programs = useStore((s) => s.programs)
  const costumes = useStore((s) => s.costumes)
  const stocks = useStore((s) => s.costumeStocks)
  const shortages = useStore((s) => s.sizeShortages)
  const members = useStore((s) => s.members)
  const currentMemberId = useStore((s) => s.currentMemberId)

  const payDeposit = useStore((s) => s.payDeposit)
  const pickup = useStore((s) => s.pickupCostume)
  const ret = useStore((s) => s.returnCostume)
  const reportIssue = useStore((s) => s.reportSizeIssue)
  const recordTryOn = useStore((s) => s.recordTryOn)
  const removeTryOnPhoto = useStore((s) => s.removeTryOnPhoto)
  const setWantedSize = useStore((s) => s.setWantedSize)
  const setStock = useStore((s) => s.setStock)
  const confirmStock = useStore((s) => s.confirmStock)
  const exchangeCostume = useStore((s) => s.exchangeCostume)
  const resolveByReposition = useStore((s) => s.resolveByReposition)
  const activateBackup = useStore((s) => s.activateBackup)
  const payBackupDeposit = useStore((s) => s.payBackupDeposit)

  const [pid, setPid] = useState(programs[0]?.id ?? '')
  const program = programs.find((p) => p.id === pid) ?? programs[0]

  const [pickupWho, setPickupWho] = useState<Record<string, string>>({})
  const [issueText, setIssueText] = useState<Record<string, string>>({})
  const [openMember, setOpenMember] = useState<string | null>(null)

  // 返换面板的本地表单（按队员隔离）
  const [wantSize, setWantSize] = useState<Record<string, CostumeSize>>({})
  const [photoEmoji, setPhotoEmoji] = useState<Record<string, string>>({})
  const [photoCaption, setPhotoCaption] = useState<Record<string, string>>({})
  const [exchangeSize, setExchangeSize] = useState<Record<string, CostumeSize>>({})
  const [reposNote, setReposNote] = useState<Record<string, string>>({})
  const [confirmNote, setConfirmNote] = useState<Record<string, string>>({})
  const [backupForm, setBackupForm] = useState<Record<string, BackupForm>>({})
  // 库存盘点本地输入（按尺码）
  const [stockN, setStockN] = useState<Record<string, string>>({})
  const [stockNote, setStockNote] = useState<Record<string, string>>({})

  const manage = role === 'costume' || role === 'leader'
  const isCostume = role === 'costume'
  const isLeader = role === 'leader'
  // 队员可对本人记录上报偏小 / 登记试穿照片（列表已按本人过滤）；库存确认与处置仍仅负责人/队长
  const canRecord = manage || role === 'member'

  const shortageList = useMemo(() => shortageStats(shortages), [shortages])

  if (!program) return null
  let list = costumes.filter((c) => c.programId === program.id)
  if (role === 'member') list = list.filter((c) => c.memberId === currentMemberId)

  const pending = pendingExchanges(costumes, program.id).filter((c) =>
    role === 'member' ? c.memberId === currentMemberId : true)
  const toConfirm = pending.filter((c) => !c.stockChecked)
  const toDecide = awaitingDecision(costumes, program.id).filter((c) =>
    role === 'member' ? c.memberId === currentMemberId : true)

  const stats = {
    total: list.length,
    picked: list.filter((c) => c.pickedUp).length,
    returned: list.filter((c) => c.returned).length,
    deposit: list.filter((c) => c.depositPaid).length,
  }

  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? id
  const getBackupForm = (mid: string): BackupForm => backupForm[mid] ?? { size: 'XL', deposit: '100', cleaningDuty: '本人清洗', returnBy: '演出结束次日 12:00 前', note: '' }
  const setBf = (mid: string, patch: Partial<BackupForm>) =>
    setBackupForm((m) => ({ ...m, [mid]: { ...getBackupForm(mid), ...patch } }))

  const statusBadge = (c: (typeof list)[number]) => {
    if (!c.sizeIssue) return <span className="muted">—</span>
    if (c.resolution === 'exchanged') return <span className="badge green">{RESOLUTION_LABEL.exchanged}</span>
    if (c.resolution === 'backup') return <span className="badge green">{RESOLUTION_LABEL.backup}</span>
    if (c.resolution === 'reposition') return <span className="badge gold">{RESOLUTION_LABEL.reposition}</span>
    if (!c.stockChecked) return <span className="badge gold">待确认库存</span>
    if (!c.stockAvailable) return <span className="badge red">缺货 · 待决策</span>
    return <span className="badge blue">可换货</span>
  }

  return (
    <div>
      <div className="card">
        <div className="row">
          <h3 style={{ margin: 0 }}>服装管理 · 尺码返换</h3>
          <select className="inp" style={{ width: 'auto' }} value={program.id} onChange={(e) => { setPid(e.target.value); setOpenMember(null) }}>
            {programs.map((p) => <option key={p.id} value={p.id}>《{p.title}》（{STAGE_LABEL[p.stage]}）</option>)}
          </select>
          <span className="row" style={{ marginLeft: 'auto' }}>
            <span className="badge blue">押金 {stats.deposit}/{stats.total}</span>
            <span className="badge brand">已领 {stats.picked}/{stats.total}</span>
            <span className="badge green">已还 {stats.returned}/{stats.total}</span>
            {toConfirm.length > 0 && <span className="badge gold">待确认库存 {toConfirm.length}</span>}
            {toDecide.length > 0 && <span className="badge red">缺货待决策 {toDecide.length}</span>}
          </span>
        </div>
        <div className="muted mt8">
          每套服装押金 100 元，归还检查无损后退还。领取后试穿偏小：登记<b>试穿照片、原尺码、期望尺码与领取人</b>，
          由服装负责人确认可换库存；演出前换不到合适尺码时，队长可<b>调整站位</b>或<b>启用备用服装</b>（押金、清洗责任、归还时间重新记录），押金状态全程同步。
        </div>
        {toDecide.length > 0 && (
          <div className="alert red mt8">
            ⚠ {toDecide.map((c) => nameOf(c.memberId)).join('、')} 的 {toDecide[0].wantedSize || '合适'} 码确认无货，
            {isLeader ? '请在下方展开记录选择「调整站位」或「启用备用服装」。' : '已通知队长尽快调整站位或安排备用服装。'}
          </div>
        )}
      </div>

      {/* 可换库存盘点（服装负责人维护并确认） */}
      <div className="card">
        <h3>可换库存盘点 <span className="sub">服装负责人按尺码盘点、确认《{program.title}》可换件数</span></h3>
        <table className="tbl">
          <thead>
            <tr><th>尺码</th><th style={{ width: 130 }}>可换件数</th><th>库存说明 / 货位</th><th style={{ width: 150 }}>确认状态</th>{manage && <th style={{ width: 90 }}>操作</th>}</tr>
          </thead>
          <tbody>
            {SIZES.map((sz) => {
              const k = stockOf(stocks, program.id, sz)
              return (
                <tr key={sz}>
                  <td><b>{sz}</b></td>
                  <td>
                    {isCostume
                      ? <input className="inp" style={{ width: 90, padding: '6px 8px' }} type="number" min={0}
                          value={stockN[sz] ?? String(k?.exchangeable ?? 0)}
                          onChange={(e) => setStockN({ ...stockN, [sz]: e.target.value })} />
                      : <b>{k?.exchangeable ?? '—'}</b>}
                  </td>
                  <td>
                    {isCostume
                      ? <input className="inp" style={{ padding: '6px 8px' }} placeholder="货位 / 备注"
                          value={stockNote[sz] ?? k?.note ?? ''}
                          onChange={(e) => setStockNote({ ...stockNote, [sz]: e.target.value })} />
                      : (k?.note || <span className="muted">未盘点</span>)}
                  </td>
                  <td>{k?.checked
                    ? <span className="badge green">已确认 {k.checkedAt.slice(5)}</span>
                    : <span className="badge gray">未确认</span>}</td>
                  {manage && (
                    <td>
                      {isCostume
                        ? <button className="btn sm primary" onClick={() => {
                            const n = parseInt(stockN[sz] ?? String(k?.exchangeable ?? 0), 10)
                            setStock(program.id, sz, isNaN(n) ? 0 : n, (stockNote[sz] ?? k?.note ?? '').trim())
                          }}>盘点确认</button>
                        : <span className="muted">负责人操作</span>}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 队员服装与返换主表 */}
      <div className="card">
        <table className="tbl">
          <thead>
            <tr>
              <th>队员</th><th>年龄</th><th>原码→现码</th><th>押金（同步）</th><th>领取人</th><th>归还</th><th>尺码返换</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => {
              const m = members.find((x) => x.id === c.memberId)!
              const changed = c.originalSize !== c.size
              return (
                <tr key={c.memberId}>
                  <td><b>{m.name}</b></td>
                  <td>{m.age}</td>
                  <td>
                    {changed
                      ? <span><span className="badge gray">{c.originalSize}</span> → <span className="badge green">{c.size}</span></span>
                      : <b>{c.size}</b>}
                  </td>
                  <td>
                    {c.depositPaid
                      ? <span className="badge green">已交 ¥{c.deposit}</span>
                      : <><span className="badge red">未交</span>{manage && <button className="btn sm mt8" onClick={() => payDeposit(c.memberId, c.programId)}>收押金</button>}</>}
                    {c.backup && (
                      <div className="mt8">
                        {c.backup.depositPaid
                          ? <span className="badge blue">备用 ¥{c.backup.deposit} 已交</span>
                          : <><span className="badge gold">备用 ¥{c.backup.deposit} 未交</span>
                            {manage && <button className="btn sm" onClick={() => payBackupDeposit(c.memberId, c.programId)}>收备用押金</button>}</>}
                      </div>
                    )}
                  </td>
                  <td>
                    {c.pickedUp
                      ? <span className="badge brand">{c.pickedUpBy || '已领'}</span>
                      : manage
                        ? <div className="row">
                            <input className="inp" style={{ width: 130, padding: '6px 8px' }} placeholder="领走人（家属写关系）"
                              value={pickupWho[c.memberId] ?? ''} onChange={(e) => setPickupWho({ ...pickupWho, [c.memberId]: e.target.value })} />
                            <button className="btn sm primary" onClick={() => {
                              const who = (pickupWho[c.memberId] ?? '').trim()
                              if (!who) { alert('请填写领取人，家属代领请注明关系，如「吴强（儿子）」'); return }
                              pickup(c.memberId, c.programId, who)
                            }}>登记领取</button>
                          </div>
                        : <span className="badge gray">待领取</span>}
                  </td>
                  <td>
                    {c.returned
                      ? <span className="badge green">已归还{c.backup?.returnedAt ? ` ${c.backup.returnedAt.slice(5)}` : ''}（押金可退）</span>
                      : c.pickedUp && manage
                        ? <button className="btn sm green" onClick={() => ret(c.memberId, c.programId)}>
                            {c.backup ? '归还备用服（退押金）' : '登记归还'}
                          </button>
                        : <span className="muted">—</span>}
                  </td>
                  <td style={{ minWidth: 170 }}>
                    <div className="row">
                      {statusBadge(c)}
                      {c.sizeIssue && (
                        <button className="btn sm" onClick={() => setOpenMember(openMember === c.memberId ? null : c.memberId)}>
                          {openMember === c.memberId ? '收起' : '返换详情'}
                        </button>
                      )}
                    </div>
                    {!c.sizeIssue && canRecord && (
                      <div className="row mt8">
                        <input className="inp" style={{ width: 130, padding: '6px 8px' }} placeholder="如：L码偏小" value={issueText[c.memberId] ?? ''}
                          onChange={(e) => setIssueText({ ...issueText, [c.memberId]: e.target.value })} />
                        <button className="btn sm" onClick={() => {
                          const v = (issueText[c.memberId] ?? '').trim()
                          if (!v) return
                          const bigger = SIZES[Math.min(SIZES.indexOf(c.size) + 1, SIZES.length - 1)]
                          reportIssue(c.memberId, c.programId, v)
                          setWantedSize(c.memberId, c.programId, bigger)
                          setWantSize((w) => ({ ...w, [c.memberId]: bigger }))
                          setIssueText({ ...issueText, [c.memberId]: '' })
                          setOpenMember(c.memberId)
                        }}>上报偏小</button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 返换详情面板 */}
      {list.map((c) => {
        if (openMember !== c.memberId || !c.sizeIssue) return null
        const m = members.find((x) => x.id === c.memberId)!
        const wanted = wantSize[c.memberId] ?? c.wantedSize ?? 'XL'
        const wantedStock = stockOf(stocks, c.programId, wanted as CostumeSize)
        const exSize = exchangeSize[c.memberId] ?? wanted as CostumeSize
        const bf = getBackupForm(c.memberId)
        return (
          <div className="card" key={`detail-${c.memberId}`} style={{ borderColor: 'var(--gold)' }}>
            <div className="spread">
              <h3 style={{ margin: 0 }}>尺码返换详情 · {m.name}</h3>
              <span className="muted">领取人：{c.pickedUpBy || '—'} · 上报：{c.sizeIssue}</span>
            </div>

            <div className="grid2 mt12" style={{ alignItems: 'start' }}>
              {/* 左：试穿照片 + 原尺码/期望尺码 */}
              <div>
                <div className="kv mb8">
                  <dt>原尺码</dt><dd><b className="badge gray">{c.originalSize}</b>（领取试穿偏小）</dd>
                  <dt>现持尺码</dt><dd><b>{c.size}</b></dd>
                  <dt>期望换码</dt>
                  <dd>
                    {canRecord
                      ? <select className="inp" style={{ width: 90, padding: '6px 8px' }} value={wanted}
                          onChange={(e) => { setWantSize({ ...wantSize, [c.memberId]: e.target.value as CostumeSize }); setWantedSize(c.memberId, c.programId, e.target.value as CostumeSize) }}>
                          {SIZES.map((s) => <option key={s}>{s}</option>)}
                        </select>
                      : <b>{c.wantedSize || '—'}</b>}
                  </dd>
                </div>

                <h3 style={{ fontSize: 15 }}>试穿照片</h3>
                <div className="photos">
                  {c.tryOnPhotos.length === 0 && <span className="muted">暂无试穿照片。</span>}
                  {c.tryOnPhotos.map((p) => (
                    <div className="photo" key={p.id}>
                      <div className="img">{p.emoji}</div>
                      <div className="cap">{p.caption}<br />{p.at}</div>
                      {canRecord && <button className="btn sm danger" style={{ marginTop: 4 }} onClick={() => removeTryOnPhoto(c.memberId, c.programId, p.id)}>删除</button>}
                    </div>
                  ))}
                </div>
                {canRecord && (
                  <div className="row mt8">
                    <select className="inp" style={{ width: 70, padding: '6px 8px' }} value={photoEmoji[c.memberId] ?? TRYON_EMOJIS[0]}
                      onChange={(e) => setPhotoEmoji({ ...photoEmoji, [c.memberId]: e.target.value })}>
                      {TRYON_EMOJIS.map((e) => <option key={e}>{e}</option>)}
                    </select>
                    <input className="inp" style={{ flex: 1, padding: '6px 8px' }} placeholder="试穿说明，如：腋下紧绷抬臂困难"
                      value={photoCaption[c.memberId] ?? ''} onChange={(e) => setPhotoCaption({ ...photoCaption, [c.memberId]: e.target.value })} />
                    <button className="btn sm primary" onClick={() => {
                      const cap = (photoCaption[c.memberId] ?? '').trim()
                      if (!cap) { alert('请填写试穿说明'); return }
                      recordTryOn(c.memberId, c.programId, photoEmoji[c.memberId] ?? TRYON_EMOJIS[0], cap, wanted)
                      setPhotoCaption({ ...photoCaption, [c.memberId]: '' })
                    }}>记录试穿照片</button>
                  </div>
                )}
              </div>

              {/* 右：库存确认 + 处置 */}
              <div>
                {/* 库存确认 */}
                <h3 style={{ fontSize: 15 }}>可换库存确认 <span className="sub">服装负责人操作</span></h3>
                <div className="alert blue">
                  目标 {wanted} 码当前可换库存：<b>{wantedStock?.exchangeable ?? '未盘点'}</b> 件
                  {wantedStock?.checked ? `（${wantedStock.checkedAt.slice(5)} 已确认${wantedStock.note ? ` · ${wantedStock.note}` : ''}）` : '（尚未盘点）'}
                </div>
                {!c.resolution && (
                  isCostume ? (
                    <div className="row">
                      <input className="inp" style={{ flex: 1, padding: '6px 8px' }} placeholder="确认说明（可选）"
                        value={confirmNote[c.memberId] ?? ''} onChange={(e) => setConfirmNote({ ...confirmNote, [c.memberId]: e.target.value })} />
                      <button className="btn sm green" onClick={() => confirmStock(c.memberId, c.programId, true, (confirmNote[c.memberId] ?? '').trim() || `${wanted}码有货可换`)}>确认有货</button>
                      <button className="btn sm danger" onClick={() => confirmStock(c.memberId, c.programId, false, (confirmNote[c.memberId] ?? '').trim() || `${wanted}码无货可换`)}>确认无货</button>
                    </div>
                  ) : <div className="muted">库存由服装负责人确认。{c.stockChecked ? `结论：${c.stockAvailable ? '有货可换' : '无货'}（${c.stockNote}）` : '待服装负责人确认。'}</div>
                )}

                {/* 处置区 */}
                <div className="mt12" style={{ borderTop: '1px dashed var(--line)', paddingTop: 12 }}>
                  {!c.resolution && c.stockChecked && c.stockAvailable && (
                    <div className="row">
                      <span>换到</span>
                      <select className="inp" style={{ width: 80, padding: '6px 8px' }} value={exSize}
                        onChange={(e) => setExchangeSize({ ...exchangeSize, [c.memberId]: e.target.value as CostumeSize })}>
                        {SIZES.map((s) => <option key={s}>{s}</option>)}
                      </select>
                      <span>码</span>
                      {manage && <button className="btn sm green" onClick={() => exchangeCostume(c.memberId, c.programId, exSize)}>完成换货（库存-1）</button>}
                      <span className="muted">原 ¥{c.deposit} 押金延续有效</span>
                    </div>
                  )}

                  {!c.resolution && c.stockChecked && !c.stockAvailable && (
                    <div className="alert red" style={{ marginBottom: 8 }}>演出前无合适尺码可换，请队长调整站位或启用备用服装。</div>
                  )}

                  {!c.resolution && c.stockChecked && !c.stockAvailable && isLeader && (
                    <div>
                      <div className="row mb8">
                        <input className="inp" style={{ flex: 1, padding: '6px 8px' }} placeholder="站位调整说明（如：调到后排中间，宽松外套遮掩）"
                          value={reposNote[c.memberId] ?? ''} onChange={(e) => setReposNote({ ...reposNote, [c.memberId]: e.target.value })} />
                        <button className="btn sm" style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}
                          onClick={() => { resolveByReposition(c.memberId, c.programId, (reposNote[c.memberId] ?? '').trim()); setReposNote({ ...reposNote, [c.memberId]: '' }) }}>
                          队长调整站位将就
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 启用备用服装 */}
                  {!c.resolution && c.stockChecked && !c.stockAvailable && manage && (
                    <div className="card" style={{ boxShadow: 'none', background: '#fffaf4' }}>
                      <h3 style={{ fontSize: 14 }}>启用备用服装 <span className="sub">押金 / 清洗责任 / 归还时间重新记录</span></h3>
                      <div className="form-row">
                        <label className="fld">备用尺码
                          <select className="inp" value={bf.size} onChange={(e) => setBf(c.memberId, { size: e.target.value as CostumeSize })}>
                            {SIZES.map((s) => <option key={s}>{s}</option>)}
                          </select>
                        </label>
                        <label className="fld">备用押金（元）
                          <input className="inp" type="number" min={0} value={bf.deposit} onChange={(e) => setBf(c.memberId, { deposit: e.target.value })} />
                        </label>
                        <label className="fld">清洗责任
                          <select className="inp" value={bf.cleaningDuty} onChange={(e) => setBf(c.memberId, { cleaningDuty: e.target.value })}>
                            <option>本人清洗</option>
                            <option>家属代洗</option>
                            <option>队里统一送洗</option>
                          </select>
                        </label>
                        <label className="fld">归还时间
                          <input className="inp" value={bf.returnBy} onChange={(e) => setBf(c.memberId, { returnBy: e.target.value })} />
                        </label>
                      </div>
                      <label className="fld">备注<input className="inp" value={bf.note} onChange={(e) => setBf(c.memberId, { note: e.target.value })} placeholder="如：队部备用 XL 一套，编号 B-03" /></label>
                      <button className="btn sm primary" onClick={() => {
                        const dep = parseInt(bf.deposit, 10)
                        if (isNaN(dep) || dep < 0) { alert('请填写备用押金金额'); return }
                        if (!bf.returnBy.trim()) { alert('请填写归还时间'); return }
                        activateBackup(c.memberId, c.programId, {
                          size: bf.size, deposit: dep, cleaningDuty: bf.cleaningDuty,
                          returnBy: bf.returnBy.trim(), note: bf.note.trim(),
                        })
                      }}>启用备用服装并重录押金/清洗/归还</button>
                    </div>
                  )}
                </div>

                {/* 已启用备用服装后的重录信息 */}
                {c.resolution === 'backup' && c.backup && (
                  <div className="card" style={{ boxShadow: 'none', background: 'var(--green-soft)' }}>
                    <h3 style={{ fontSize: 14 }}>备用服装记录（{c.backup.size} 码）</h3>
                    <dl className="kv">
                      <dt>备用押金</dt><dd>¥{c.backup.deposit} · {c.backup.depositPaid ? <span className="badge green">已交</span> : <span className="badge gold">未交</span>}</dd>
                      <dt>清洗责任</dt><dd>{c.backup.cleaningDuty}</dd>
                      <dt>归还时间</dt><dd>{c.backup.returnBy}</dd>
                      <dt>归还状态</dt><dd>{c.backup.returned ? <span className="badge green">已于 {c.backup.returnedAt} 归还，押金可退</span> : <span className="badge gold">待归还</span>}</dd>
                      {c.backup.note && <><dt>备注</dt><dd>{c.backup.note}</dd></>}
                    </dl>
                    <div className="muted mt8">原 {c.originalSize} 码服装押金 ¥{c.deposit}：{c.returned ? '随备用服一并归还后结算退还' : '暂挂，待原服与备用服归还后统一结算'}。</div>
                  </div>
                )}

                {c.resolution === 'reposition' && (
                  <div className="alert gold" style={{ marginBottom: 0 }}>已由队长调整站位将就（详见「走位编排」调整记录）；押金暂挂，演出归还后结算。</div>
                )}
                {c.resolution === 'exchanged' && (
                  <div className="alert green" style={{ marginBottom: 0 }}>已换到 {c.size} 码，押金延续有效，演出后正常归还退押金。</div>
                )}
              </div>
            </div>
          </div>
        )
      })}

      {/* 长期紧缺尺码看板（服装负责人 / 队长视角） */}
      {role !== 'member' && (
      <div className="card">
        <h3>尺码长期紧缺看板 <span className="sub">累计「确认无货 / 启用备用 / 调整站位」≥{2} 次即标记长期紧缺，用于提前补货与采购</span></h3>
        {shortageList.length === 0 && <div className="muted">暂无紧缺记录。</div>}
        <table className="tbl">
          <thead><tr><th>尺码</th><th>累计紧缺</th><th>确认无货</th><th>启用备用</th><th>调整站位</th><th>状态</th></tr></thead>
          <tbody>
            {shortageList.map((s) => (
              <tr key={s.size}>
                <td><b style={{ fontSize: 16 }}>{s.size}</b></td>
                <td>{s.count} 次</td>
                <td>{s.oos}</td>
                <td>{s.backup}</td>
                <td>{s.reposition}</td>
                <td>{s.longTerm
                  ? <span className="badge red">⚠ 长期紧缺 · 建议补货采购</span>
                  : <span className="badge gray">偶发紧张</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <details className="mt8">
          <summary className="muted" style={{ cursor: 'pointer' }}>查看紧缺明细（{shortages.length}）</summary>
          <table className="tbl mt8">
            <thead><tr><th>时间</th><th>节目</th><th>尺码</th><th>队员</th><th>类型</th><th>说明</th></tr></thead>
            <tbody>
              {[...shortages].sort((a, b) => b.at.localeCompare(a.at)).map((s) => (
                <tr key={s.id}>
                  <td>{s.at}</td>
                  <td>《{programs.find((p) => p.id === s.programId)?.title ?? s.programId}》</td>
                  <td><b>{s.size}</b></td>
                  <td>{nameOf(s.memberId)}</td>
                  <td><span className="badge gray">{SHORTAGE_REASON_LABEL[s.reason]}</span></td>
                  <td>{s.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </div>
      )}
    </div>
  )
}
