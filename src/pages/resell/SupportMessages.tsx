import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useParams } from 'react-router-dom'
import {
  fetchSupportMessage,
  fetchSupportMessages,
  resolveSupportMessage,
} from '../../api/resellSupportApi'
import type {
  SupportMessageCategory,
  SupportMessageStatus,
  SupportMessageSummary,
} from '../../types/resellSupport'

const categoryLabels: Record<SupportMessageCategory, string> = {
  BILLING: '결제·입금',
  LICENSE: '라이선스',
  TECHNICAL: '기술 문제',
  OTHER: '기타',
}

const statusLabels: Record<SupportMessageStatus, string> = {
  OPEN: '처리 대기',
  RESOLVED: '처리 완료',
}

const formatDate = (value: string | null) => value
  ? dayjs(value).format('YYYY. MM. DD. HH:mm')
  : '—'

const errorMessage = (error: unknown) => {
  const response = typeof error === 'object' && error !== null && 'response' in error
    ? (error as { response?: { data?: { message?: string } } }).response
    : undefined
  return response?.data?.message ?? (error instanceof Error ? error.message : '요청을 처리하지 못했습니다.')
}

function StatusBadge({ status }: { status: SupportMessageStatus }) {
  const style = status === 'OPEN'
    ? 'bg-amber-50 text-amber-700 ring-amber-600/15'
    : 'bg-emerald-50 text-emerald-700 ring-emerald-600/15'
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${style}`}>{statusLabels[status]}</span>
}

export default function SupportMessages() {
  const queryClient = useQueryClient()
  const { supportMessageId: linkedSupportMessageId } = useParams()
  const [page, setPage] = useState(0)
  const [status, setStatus] = useState<'ALL' | SupportMessageStatus>('OPEN')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(linkedSupportMessageId ?? null)
  const [resolveReason, setResolveReason] = useState('')
  const [resolutionNote, setResolutionNote] = useState('')

  const listQuery = useQuery({
    queryKey: ['resell-support-messages', page, status, search],
    queryFn: () => fetchSupportMessages({
      page,
      size: 20,
      status: status === 'ALL' ? undefined : status,
      licenseUserId: search || undefined,
    }),
  })

  const detailQuery = useQuery({
    queryKey: ['resell-support-message', selectedId],
    queryFn: () => fetchSupportMessage(selectedId!),
    enabled: selectedId !== null,
    gcTime: 0,
  })

  const resolveMutation = useMutation({
    mutationFn: async () => {
      if (!detailQuery.data) throw new Error('처리할 문의를 먼저 선택해 주세요.')
      return resolveSupportMessage(detailQuery.data.supportMessageId, detailQuery.data.revision, {
        reason: resolveReason.trim(),
        resolutionNote: resolutionNote.trim() || undefined,
      })
    },
    onSuccess: async (resolved) => {
      queryClient.setQueryData(['resell-support-message', resolved.supportMessageId], resolved)
      setResolveReason('')
      setResolutionNote('')
      await queryClient.invalidateQueries({ queryKey: ['resell-support-messages'] })
    },
  })

  const visibleMessages = useMemo(() => {
    const messages = listQuery.data?.messages ?? []
    return messages.filter((message) => {
      if (status !== 'ALL' && message.status !== status) return false
      if (search && !message.licenseUserId?.includes(search)) return false
      return true
    })
  }, [listQuery.data, search, status])

  const openCount = (listQuery.data?.messages ?? []).filter((message) => message.status === 'OPEN').length
  const totalElements = listQuery.data?.totalElements ?? 0
  const totalPages = listQuery.data?.totalPages ?? 0
  const detail = detailQuery.data

  useEffect(() => {
    if (linkedSupportMessageId) setSelectedId(linkedSupportMessageId)
  }, [linkedSupportMessageId])

  const selectMessage = (message: SupportMessageSummary) => {
    setSelectedId(message.supportMessageId)
    setResolveReason('')
    setResolutionNote('')
  }

  return (
    <div className="mx-auto max-w-[1440px] text-slate-900">
      <div className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Resell Ops</p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">고객 문의함</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Desktop에서 서명되어 접수된 문의를 확인하고 처리합니다. Telegram 전달 큐에는 본문 없는 접수 메타데이터만 적재됩니다.</p>
        </div>
        <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/30">
          <div className="min-w-28 px-4 py-3"><p className="text-xs text-slate-400">조회 결과</p><strong className="mt-1 block text-lg font-semibold">{totalElements}</strong></div>
          <div className="min-w-28 border-l border-slate-100 px-4 py-3"><p className="text-xs text-slate-400">현재 페이지 대기</p><strong className="mt-1 block text-lg font-semibold text-amber-700">{openCount}</strong></div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/30">
          <div className="border-b border-slate-100 p-4 sm:p-5">
            <form className="flex flex-col gap-3 lg:flex-row" onSubmit={(event) => { event.preventDefault(); setPage(0); setSearch(searchInput.trim().toLowerCase()) }}>
              <input className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-500" placeholder="licenseUserId 검색" value={searchInput} maxLength={32} onChange={(event) => setSearchInput(event.target.value)} />
              <button className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800">검색</button>
              <select className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-600" value={status} onChange={(event) => { setPage(0); setStatus(event.target.value as 'ALL' | SupportMessageStatus) }}>
                <option value="OPEN">처리 대기</option>
                <option value="RESOLVED">처리 완료</option>
                <option value="ALL">전체</option>
              </select>
            </form>
          </div>

          {listQuery.isLoading ? <div className="p-12 text-center text-sm text-slate-400">문의를 불러오는 중입니다…</div>
            : listQuery.error ? <div className="p-12 text-center text-sm text-rose-700">{errorMessage(listQuery.error)}</div>
              : visibleMessages.length === 0 ? <div className="p-12 text-center"><p className="text-sm font-medium text-slate-700">조건에 맞는 문의가 없습니다.</p><p className="mt-2 text-xs text-slate-400">Desktop에서 접수되면 이곳에 표시됩니다.</p></div>
                : <div className="divide-y divide-slate-100">{visibleMessages.map((message) => (
                  <button key={message.supportMessageId} className={`grid w-full grid-cols-[minmax(0,1fr)_auto] gap-4 px-5 py-4 text-left hover:bg-slate-50 ${selectedId === message.supportMessageId ? 'bg-slate-50' : ''}`} onClick={() => selectMessage(message)}>
                    <span className="min-w-0"><span className="flex items-center gap-2"><strong className="text-sm font-medium text-slate-800">{categoryLabels[message.category]}</strong><StatusBadge status={message.status} /></span><span className="mt-2 block font-mono text-xs text-slate-500">{message.licenseUserId ?? 'ID 미등록 사용자'}</span><span className="mt-1 block truncate font-mono text-[11px] text-slate-400">{message.supportMessageId}</span></span>
                    <span className="text-xs text-slate-400">{formatDate(message.receivedAt)}</span>
                  </button>
                ))}</div>}

          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            <span>{totalPages ? `${page + 1} / ${totalPages} 페이지` : '0 페이지'}</span>
            <div className="flex gap-2"><button className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40" disabled={page <= 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>이전</button><button className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40" disabled={page + 1 >= totalPages} onClick={() => setPage((value) => value + 1)}>다음</button></div>
          </div>
        </section>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/30 xl:sticky xl:top-5">
          {!selectedId ? <div className="py-16 text-center"><p className="text-sm font-medium text-slate-700">문의를 선택해 주세요.</p><p className="mt-2 text-xs leading-5 text-slate-400">고객 메시지 본문은 이 관리자 화면에서만 확인합니다.</p></div>
            : detailQuery.isLoading ? <div className="py-16 text-center text-sm text-slate-400">상세 내용을 불러오는 중입니다…</div>
              : detailQuery.error ? <div className="py-16 text-center text-sm text-rose-700">{errorMessage(detailQuery.error)}</div>
                : detail && <div>
                  <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Support detail</p><h3 className="mt-1 text-lg font-semibold text-slate-950">{categoryLabels[detail.category]}</h3></div><StatusBadge status={detail.status} /></div>
                  <dl className="mt-5 grid gap-2 rounded-xl bg-slate-50 p-4 text-xs"><div className="flex justify-between gap-3"><dt className="text-slate-400">사용자 ID</dt><dd className="font-mono text-slate-700">{detail.licenseUserId ?? '미등록'}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-400">접수 시각</dt><dd className="text-slate-700">{formatDate(detail.receivedAt)}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-400">장치 ID</dt><dd className="max-w-52 truncate font-mono text-slate-500">{detail.deviceId}</dd></div></dl>
                  <div className="mt-5"><p className="text-xs font-medium text-slate-500">문의 내용</p><div className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">{detail.message}</div><p className="mt-2 text-xs leading-5 text-amber-700">비밀번호·OTP·계좌번호·토큰이 포함된 경우 복사하거나 Telegram으로 전달하지 말고 보안 절차에 따라 정제하세요.</p></div>

                  {detail.status === 'OPEN' ? <div className="mt-6 border-t border-slate-100 pt-5"><h4 className="text-sm font-semibold text-slate-800">처리 완료</h4><label className="mt-3 block text-xs font-medium text-slate-600">완료 사유 <span className="text-rose-600">*</span><input className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-500" value={resolveReason} maxLength={500} placeholder="예: 안내 완료" onChange={(event) => setResolveReason(event.target.value)} /></label><label className="mt-3 block text-xs font-medium text-slate-600">내부 메모<textarea className="mt-1.5 min-h-24 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500" value={resolutionNote} maxLength={500} onChange={(event) => setResolutionNote(event.target.value)} /></label>{resolveMutation.error && <p className="mt-3 text-xs text-rose-700">{errorMessage(resolveMutation.error)}</p>}<button className="mt-4 h-10 w-full rounded-lg bg-slate-900 text-sm font-medium text-white disabled:opacity-40" disabled={!resolveReason.trim() || resolveMutation.isPending} onClick={() => resolveMutation.mutate()}>{resolveMutation.isPending ? '처리 중…' : '처리 완료로 변경'}</button></div>
                    : <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50 p-4"><p className="text-xs font-semibold text-emerald-800">{detail.resolveReason}</p>{detail.resolutionNote && <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-emerald-700">{detail.resolutionNote}</p>}<p className="mt-2 text-[11px] text-emerald-600">{formatDate(detail.resolvedAt)} · {detail.resolvedBy}</p></div>}
                </div>}
        </aside>
      </div>
    </div>
  )
}
