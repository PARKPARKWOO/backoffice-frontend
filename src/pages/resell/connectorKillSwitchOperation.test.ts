import { describe, expect, it, vi } from 'vitest'
import {
  ConnectorKillSwitchRefreshError,
  executeConnectorKillSwitchChange,
} from './connectorKillSwitchOperation'

const current = {
  switchId: 'kream-all',
  scopeType: 'CONNECTOR' as const,
  connectorId: 'kream',
  capabilityId: null,
  active: false,
  reasonCode: null,
  revision: 3,
  activatedAt: null,
  deactivatedAt: null,
  updatedAt: '2026-07-18T00:00:00Z',
  updatedBy: 'SYSTEM',
}

describe('connector kill-switch change operation', () => {
  it('requires a canonical reason before any confirmation or mutation', async () => {
    const confirmActivation = vi.fn(() => true)
    const mutate = vi.fn()
    const refetch = vi.fn()

    await expect(executeConnectorKillSwitchChange({
      current,
      desiredActive: true,
      reasonCode: ' ',
      confirmActivation,
      mutate,
      refetch,
    })).rejects.toThrow('변경 사유를 선택해 주세요.')

    expect(confirmActivation).not.toHaveBeenCalled()
    expect(mutate).not.toHaveBeenCalled()
    expect(refetch).not.toHaveBeenCalled()
  })

  it('requires explicit confirmation before activating a block', async () => {
    const mutate = vi.fn()
    const refetch = vi.fn()

    const result = await executeConnectorKillSwitchChange({
      current,
      desiredActive: true,
      reasonCode: 'INCIDENT_RESPONSE',
      confirmActivation: () => false,
      mutate,
      refetch,
    })

    expect(result).toEqual({ status: 'CANCELLED' })
    expect(mutate).not.toHaveBeenCalled()
    expect(refetch).not.toHaveBeenCalled()
  })

  it('waits for the server and refetches after success without an optimistic callback', async () => {
    const events: string[] = []
    const updated = { ...current, active: true, revision: 4 }

    const result = await executeConnectorKillSwitchChange({
      current,
      desiredActive: true,
      reasonCode: 'INCIDENT_RESPONSE',
      confirmActivation: () => true,
      mutate: async (input) => {
        events.push('mutation-start')
        expect(input).toEqual({ switchId: 'kream-all', revision: 3, active: true, reasonCode: 'INCIDENT_RESPONSE' })
        events.push('mutation-complete')
        return updated
      },
      refetch: async () => {
        events.push('refetch')
        return {
          effectivePolicyDigest: `sha256:${'a'.repeat(64)}`,
          switches: [updated],
        }
      },
    })

    expect(result).toEqual({ status: 'UPDATED', switch: updated })
    expect(events).toEqual(['mutation-start', 'mutation-complete', 'refetch'])
  })

  it('reports both stale mutation and failed refresh without claiming the state was reloaded', async () => {
    const conflict = new Error('VERSION_CONFLICT')
    const refetch = vi.fn(async () => { throw new Error('refresh failed') })

    try {
      await executeConnectorKillSwitchChange({
        current: { ...current, active: true },
        desiredActive: false,
        reasonCode: 'INCIDENT_RESOLVED',
        confirmActivation: () => true,
        mutate: async () => { throw conflict },
        refetch,
      })
      throw new Error('expected operation failure')
    } catch (error) {
      expect(error).toBeInstanceOf(ConnectorKillSwitchRefreshError)
      expect(error).toMatchObject({ mutationError: conflict, mutationSucceeded: false })
    }

    expect(refetch).toHaveBeenCalledOnce()
  })

  it('does not claim success until the fresh policy confirms the requested state', async () => {
    const updated = { ...current, active: true, revision: 4 }

    await expect(executeConnectorKillSwitchChange({
      current,
      desiredActive: true,
      reasonCode: 'INCIDENT_RESPONSE',
      confirmActivation: () => true,
      mutate: async () => updated,
      refetch: async () => ({
        effectivePolicyDigest: `sha256:${'b'.repeat(64)}`,
        switches: [current],
      }),
    })).rejects.toMatchObject({ mutationSucceeded: true })
  })
})
