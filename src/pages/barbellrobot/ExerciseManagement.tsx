import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAreas, createArea, deleteArea, fetchItems, deleteItem, addYoutube, deleteYoutube, getItem } from '../../api/bbrApi'

export default function ExerciseManagement() {
  const queryClient = useQueryClient()
  const [newArea, setNewArea] = useState('')
  const [selectedArea, setSelectedArea] = useState<number | null>(null)
  const [youtubeForm, setYoutubeForm] = useState({ exerciseItemId: '', youtubeUrl: '', title: '' })
  const [expandedItem, setExpandedItem] = useState<number | null>(null)
  const [itemDetail, setItemDetail] = useState<any>(null)

  const { data: areas } = useQuery({ queryKey: ['bbr-areas'], queryFn: fetchAreas })
  const { data: items, isLoading } = useQuery({
    queryKey: ['bbr-items', selectedArea],
    queryFn: () => fetchItems(selectedArea ?? undefined),
  })

  const createAreaMut = useMutation({
    mutationFn: () => createArea({ name: newArea }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bbr-areas'] }); setNewArea('') },
  })
  const deleteAreaMut = useMutation({
    mutationFn: deleteArea,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bbr-areas'] }),
  })
  const deleteItemMut = useMutation({
    mutationFn: deleteItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bbr-items'] }),
  })
  const addYoutubeMut = useMutation({
    mutationFn: () => addYoutube({
      exerciseItemId: Number(youtubeForm.exerciseItemId),
      youtubeUrl: youtubeForm.youtubeUrl,
      title: youtubeForm.title || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bbr-items'] })
      setYoutubeForm({ exerciseItemId: '', youtubeUrl: '', title: '' })
    },
  })
  const deleteYoutubeMut = useMutation({
    mutationFn: deleteYoutube,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bbr-items'] })
      if (expandedItem) loadDetail(expandedItem)
    },
  })

  const loadDetail = async (id: number) => {
    if (expandedItem === id) { setExpandedItem(null); return }
    const detail = await getItem(id)
    setItemDetail(detail)
    setExpandedItem(id)
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">BBR - Exercise Management</h2>

      {/* Areas */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h3 className="font-medium text-gray-900 mb-3">Exercise Areas</h3>
        <div className="flex gap-2 flex-wrap mb-3">
          <button
            className={`px-3 py-1.5 rounded-full text-sm border ${!selectedArea ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            onClick={() => setSelectedArea(null)}
          >All</button>
          {(areas as any[])?.map((a: any) => (
            <div key={a.id} className="flex items-center gap-1">
              <button
                className={`px-3 py-1.5 rounded-full text-sm border ${selectedArea === a.id ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                onClick={() => setSelectedArea(a.id)}
              >{a.name}</button>
              <button className="text-red-400 hover:text-red-600 text-xs" onClick={() => { if (confirm(`Delete area "${a.name}"?`)) deleteAreaMut.mutate(a.id) }}>x</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input className="border border-gray-300 rounded-md px-3 py-1.5 text-sm flex-1" placeholder="New area name" value={newArea} onChange={(e) => setNewArea(e.target.value)} />
          <button className="px-4 py-1.5 bg-indigo-600 text-white rounded-md text-sm disabled:opacity-50" disabled={!newArea.trim()} onClick={() => createAreaMut.mutate()}>Add</button>
        </div>
      </div>

      {/* YouTube link */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h3 className="font-medium text-gray-900 mb-3">Add YouTube Link</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="border border-gray-300 rounded-md px-3 py-2 text-sm" type="number" placeholder="Exercise Item ID" value={youtubeForm.exerciseItemId} onChange={(e) => setYoutubeForm({ ...youtubeForm, exerciseItemId: e.target.value })} />
          <input className="border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="YouTube URL" value={youtubeForm.youtubeUrl} onChange={(e) => setYoutubeForm({ ...youtubeForm, youtubeUrl: e.target.value })} />
          <input className="border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Title (optional)" value={youtubeForm.title} onChange={(e) => setYoutubeForm({ ...youtubeForm, title: e.target.value })} />
        </div>
        <button
          className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm disabled:opacity-50"
          disabled={!youtubeForm.exerciseItemId || !youtubeForm.youtubeUrl || addYoutubeMut.isPending}
          onClick={() => addYoutubeMut.mutate()}
        >Add YouTube</button>
      </div>

      {/* Items */}
      {isLoading ? <div className="text-gray-500">Loading...</div> : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Area</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(items as any[])?.map((item: any) => (
                <>
                  <tr key={item.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => loadDetail(item.id)}>
                    <td className="px-6 py-4 text-sm text-gray-500">{item.id}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{item.exerciseAreaName ?? item.areaName ?? '-'}</td>
                    <td className="px-6 py-4 text-sm">
                      <button className="text-red-600 hover:text-red-800 text-sm font-medium" onClick={(e) => { e.stopPropagation(); if (confirm('Delete?')) deleteItemMut.mutate(item.id) }}>Delete</button>
                    </td>
                  </tr>
                  {expandedItem === item.id && itemDetail && (
                    <tr key={`detail-${item.id}`}>
                      <td colSpan={4} className="px-6 py-4 bg-gray-50">
                        <div className="text-sm">
                          <p className="font-medium mb-2">YouTube Links:</p>
                          {(itemDetail.youtubeLinks ?? itemDetail.youtubeVideos ?? []).length === 0 ? (
                            <p className="text-gray-400">No YouTube links</p>
                          ) : (
                            <ul className="space-y-1">
                              {(itemDetail.youtubeLinks ?? itemDetail.youtubeVideos ?? []).map((yt: any) => (
                                <li key={yt.id} className="flex items-center gap-2">
                                  <a href={yt.url ?? yt.youtubeUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline truncate">{yt.title ?? yt.url ?? yt.youtubeUrl}</a>
                                  <button className="text-red-400 hover:text-red-600 text-xs" onClick={() => deleteYoutubeMut.mutate(yt.id)}>x</button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
