import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchConnectorKillSwitches,
  updateConnectorKillSwitch,
} from '../../api/resellConnectorPolicyApi'
import type { ConnectorKillSwitch } from '../../types/resellConnectorPolicy'
import { executeConnectorKillSwitchChange } from './connectorKillSwitchOperation'
import { summarizeConnectorPolicy } from './connectorPolicySummary'
import { connectorPolicyErrorMessage } from './connectorPolicyErrorMessage'

const reasonOptions = [
  ['INCIDENT_RESPONSE', '장애 대응'],
  ['CONNECTOR_SCHEMA_DRIFT', '화면·스키마 변경 감지'],
  ['SECURITY_RESPONSE', '보안 대응'],
  ['POLICY_CHANGE', '정책·허용 범위 변경'],
  ['INCIDENT_RESOLVED', '장애 해소 확인'],
  ['MANUAL_RECOVERY', '운영자 복구 확인'],
] as const

const reasonLabels = new Map<string, string>(reasonOptions)
const capabilityLabels: Record<string, string> = {
  'order.file.validate.local': '주문 파일 로컬 검증',
  'settlement.file.validate.local': '정산 파일 로컬 검증',
}
const connectorPolicyQueryKey = ['resell-connector-kill-switches'] as const

const formatTime = (value: string | null) => value
  ? new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
  : '—'

const scopeTitle = (item: ConnectorKillSwitch) => item.scopeType === 'CONNECTOR'
  ? `${item.connectorId.toUpperCase()} 전체 기능`
  : capabilityLabels[item.capabilityId ?? ''] ?? item.capabilityId ?? '알 수 없는 기능'

const scopeDescription = (item: ConnectorKillSwitch) => item.scopeType === 'CONNECTOR'
  ? '이 Connector의 모든 실행 capability를 즉시 차단합니다.'
  : `${item.connectorId.toUpperCase()}의 선택된 capability만 차단합니다.`

export default function ConnectorKillSwitches() {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: connectorPolicyQueryKey,
    queryFn: ({ signal }) => fetchConnectorKillSwitches(signal),
  })
  const [target, setTarget] = useState<ConnectorKillSwitch | null>(null)
  const [reasonCode, setReasonCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const switches = query.data?.switches ?? []
  const policySummary = summarizeConnectorPolicy(query.data?.switches, Boolean(query.error))
  const policySummaryClass = policySummary.state === 'BLOCKED'
    ? 'border-rose-200 bg-rose-50 text-rose-900'
    : policySummary.state === 'CLEAR'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : 'border-amber-200 bg-amber-50 text-amber-900'

  const openAction = (item: ConnectorKillSwitch) => {
    setNotice(null)
    setActionError(null)
    setReasonCode('')
    setTarget(item)
  }

  const refetchOrThrow = async () => {
    const result = await query.refetch({ cancelRefetch: true })
    if (result.error || !result.data) throw result.error ?? new Error('Connector policy refresh returned no data.')
    return result.data
  }

  const fetchAuthoritativePolicy = async () => {
    await queryClient.cancelQueries({ queryKey: connectorPolicyQueryKey, exact: true })
    return queryClient.fetchQuery({
      queryKey: connectorPolicyQueryKey,
      queryFn: ({ signal }) => fetchConnectorKillSwitches(signal),
      staleTime: 0,
    })
  }

  const applyChange = async () => {
    if (!target || busy) return
    if (!reasonCode) {
      setActionError('변경 사유를 선택해 주세요.')
      return
    }
    const desiredActive = !target.active
    setBusy(true)
    setActionError(null)
    try {
      const result = await executeConnectorKillSwitchChange({
        current: target,
        desiredActive,
        reasonCode,
        confirmActivation: () => window.confirm(
          `${scopeTitle(target)}을(를) 즉시 차단합니다. 신규 작업이 중단될 수 있습니다. 계속할까요?`,
        ),
        mutate: updateConnectorKillSwitch,
        refetch: fetchAuthoritativePolicy,
      })
      if (result.status === 'CANCELLED') return
      setNotice(`${scopeTitle(target)} ${desiredActive ? '차단을 활성화' : '차단을 해제'}했습니다.`)
      setTarget(null)
      setReasonCode('')
    } catch (error) {
      setActionError(connectorPolicyErrorMessage(error))
      setTarget(null)
      setReasonCode('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-[1380px] text-slate-900">
      <header className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Resell Ops · Safety control</p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Connector 긴급 차단</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            승인된 Connector 기능을 새로 허용하지 않고, 장애·정책 변경 시 실행 권한만 즉시 제거합니다.
            시스템 상태 점검과 영향받지 않은 Connector는 계속 동작합니다.
          </p>
        </div>
        <div className={`rounded-2xl border px-5 py-4 ${policySummaryClass}`}>
          <p className="text-xs font-medium opacity-70">
            {policySummary.state === 'UNKNOWN' ? '정책 확인 상태' : '현재 안전 상태'}
          </p>
          <p className="mt-1 text-lg font-semibold">{policySummary.label}</p>
        </div>
      </header>

      {notice && <div role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}
      {actionError && <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{actionError}</div>}

      <section className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/30">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Effective policy digest</p>
            <code className="mt-1 block break-all text-xs text-slate-600">{query.data?.effectivePolicyDigest ?? '불러오는 중…'}</code>
          </div>
          <button
            type="button"
            className="h-9 rounded-lg border border-slate-300 px-3.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            disabled={query.isFetching || busy}
            onClick={() => void refetchOrThrow().catch(() => setActionError('최신 정책을 불러오지 못했습니다.'))}
          >
            {query.isFetching ? '동기화 중…' : '최신 상태 새로고침'}
          </button>
        </div>
        <div className="bg-slate-50/70 px-5 py-3 text-xs leading-5 text-slate-500">
          이 화면은 Backend 정책 원장을 조회합니다. 라이선스 entitlement나 이 화면의 조작만으로 미승인 기능을 활성화할 수 없습니다.
        </div>
      </section>

      {query.isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400">Connector 정책을 불러오는 중입니다…</div>
      ) : query.error ? (
        <div className="rounded-2xl border border-rose-200 bg-white p-12 text-center">
          <p className="text-sm font-medium text-rose-700">정책 응답을 안전하게 확인할 수 없습니다.</p>
          <p className="mt-2 text-xs text-slate-400">형식이 올바르지 않거나 서비스 연결이 실패해 변경 기능을 차단했습니다.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {switches.map((item) => (
            <article
              key={item.switchId}
              className={`rounded-2xl border bg-white p-5 shadow-sm transition-colors ${item.active ? 'border-rose-200 shadow-rose-100/60' : 'border-slate-200 shadow-slate-200/30'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] uppercase text-slate-500">{item.scopeType}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.active ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {item.active ? '차단 중' : '허용 정책 유지'}
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-slate-950">{scopeTitle(item)}</h3>
                  <p className="mt-1 text-sm leading-5 text-slate-500">{scopeDescription(item)}</p>
                </div>
                <div className={`mt-1 h-3 w-3 shrink-0 rounded-full ring-4 ${item.active ? 'bg-rose-500 ring-rose-100' : 'bg-emerald-500 ring-emerald-100'}`} aria-hidden="true" />
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3 border-t border-slate-100 pt-4 text-xs">
                <div><dt className="text-slate-400">Switch ID</dt><dd className="mt-1 break-all font-mono text-slate-700">{item.switchId}</dd></div>
                <div><dt className="text-slate-400">Revision</dt><dd className="mt-1 font-medium text-slate-700">{item.revision}</dd></div>
                <div><dt className="text-slate-400">마지막 사유</dt><dd className="mt-1 text-slate-700">{item.reasonCode ? reasonLabels.get(item.reasonCode) ?? item.reasonCode : '초기 상태'}</dd></div>
                <div><dt className="text-slate-400">수정 운영자</dt><dd className="mt-1 break-all font-mono text-slate-700">{item.updatedBy}</dd></div>
                <div className="col-span-2"><dt className="text-slate-400">마지막 변경</dt><dd className="mt-1 text-slate-700">{formatTime(item.updatedAt)}</dd></div>
                {item.active && <div className="col-span-2"><dt className="text-slate-400">차단 활성 시각</dt><dd className="mt-1 text-rose-700">{formatTime(item.activatedAt)}</dd></div>}
                {!item.active && item.deactivatedAt && <div className="col-span-2"><dt className="text-slate-400">최근 해제 시각</dt><dd className="mt-1 text-slate-700">{formatTime(item.deactivatedAt)}</dd></div>}
              </dl>

              <button
                type="button"
                className={`mt-5 w-full rounded-lg px-4 py-2.5 text-sm font-medium ${item.active ? 'border border-slate-300 text-slate-700 hover:bg-slate-50' : 'bg-rose-600 text-white hover:bg-rose-700'} disabled:opacity-50`}
                disabled={busy || query.isFetching}
                onClick={() => openAction(item)}
              >
                {item.active ? '차단 해제 검토' : '긴급 차단 검토'}
              </button>
            </article>
          ))}
        </div>
      )}

      {target && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/30 p-4 backdrop-blur-[1px] sm:items-center" role="dialog" aria-modal="true" aria-labelledby="connector-policy-dialog-title">
          <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-950/20">
            <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${target.active ? 'text-slate-400' : 'text-rose-500'}`}>
              {target.active ? 'Unblock capability' : 'Emergency block'}
            </p>
            <h3 id="connector-policy-dialog-title" className="mt-2 text-xl font-semibold text-slate-950">{scopeTitle(target)}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {target.active
                ? '해제 후 최신 정책 digest를 Agent가 다시 수락해야 실행 가능 상태가 됩니다.'
                : '차단은 권한만 제거하며 실행 권한을 새로 만들지 않습니다. 활성화 시 한 번 더 확인합니다.'}
            </p>
            <label className="mt-5 block text-sm font-medium text-slate-700" htmlFor="connector-policy-reason">변경 사유</label>
            <select
              id="connector-policy-reason"
              className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
              value={reasonCode}
              disabled={busy}
              onChange={(event) => { setReasonCode(event.target.value); setActionError(null) }}
            >
              <option value="">사유를 선택하세요</option>
              {reasonOptions.map(([value, label]) => <option key={value} value={value}>{label} · {value}</option>)}
            </select>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100" disabled={busy} onClick={() => { setTarget(null); setReasonCode('') }}>취소</button>
              <button
                type="button"
                className={`rounded-lg px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 ${target.active ? 'bg-slate-800 hover:bg-slate-900' : 'bg-rose-600 hover:bg-rose-700'}`}
                disabled={busy || !reasonCode}
                onClick={() => void applyChange()}
              >
                {busy ? '서버 확인 중…' : target.active ? '차단 해제' : '차단 활성화'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
