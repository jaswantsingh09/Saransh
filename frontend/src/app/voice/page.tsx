'use client'

import { useAuth } from '@/contexts/AuthContext'
import { VoiceEnrollment } from '@/components/voice/VoiceEnrollment'

export default function VoicePage() {
  const { session } = useAuth()
  const defaultName = session?.name || session?.email?.split('@')[0] || ''
  return (
    <div className="px-4 py-8">
      <VoiceEnrollment defaultName={defaultName} />
    </div>
  )
}
