import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { computeRiskScore } from '@/lib/risk-engine'
import { HeartbeatPayload } from '@/lib/types/assets'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/assets/heartbeat
 *
 * Called by the AC-COS agent running on each machine.
 * Upserts the asset record and recomputes risk score.
 *
 * Body: HeartbeatPayload
 * Headers: x-api-key (optional for now) + x-user-id
 */
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'x-user-id header required' }, { status: 401 })

    const payload: HeartbeatPayload = await req.json()

    if (!payload.hostname || !payload.ip_address) {
      return NextResponse.json({ error: 'hostname and ip_address required' }, { status: 400 })
    }

    // Compute risk score
    const { score, factors } = computeRiskScore({
      openPorts: payload.open_ports ?? [],
      osName: payload.os_name,
      osVersion: payload.os_version,
      lastSeen: new Date(),
      vulnCount: 0,
      assetType: 'endpoint',
      isPrivileged: false,
    })

    const assetStatus = score >= 75 ? 'critical' : score >= 50 ? 'warning' : 'active'

    const assetData = {
      user_id: userId,
      hostname: payload.hostname,
      ip_address: payload.ip_address,
      mac_address: payload.mac_address ?? null,
      fqdn: payload.fqdn ?? null,
      os_name: payload.os_name,
      os_version: payload.os_version,
      os_arch: payload.os_arch ?? 'x86_64',
      manufacturer: payload.manufacturer ?? null,
      model: payload.model ?? null,
      open_ports: payload.open_ports ?? [],
      services: payload.services ?? [],
      uptime_seconds: payload.uptime_seconds ?? null,
      risk_score: score,
      risk_factors: factors,
      discovery_method: 'agent' as const,
      last_seen: new Date().toISOString(),
      status: assetStatus,
      is_managed: true,
      agent_version: payload.agent_version,
      updated_at: new Date().toISOString(),
    }

    // Upsert by hostname + user_id
    const { data, error } = await supabase
      .from('assets')
      .upsert(assetData, {
        onConflict: 'hostname,user_id',
        ignoreDuplicates: false,
      })
      .select()
      .single()

    if (error) {
      // Fallback: try insert
      const { data: inserted, error: insertError } = await supabase
        .from('assets')
        .insert({ ...assetData, first_seen: new Date().toISOString() })
        .select()
        .single()
      if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
      return NextResponse.json({ asset: inserted, action: 'created' }, { status: 201 })
    }

    return NextResponse.json({ asset: data, action: 'updated', risk_score: score })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
