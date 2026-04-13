'use client'

import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import SectionHeader from '@/components/layout/SectionHeader'
import FormPanel from '@/components/layout/FormPanel'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function SettingsPage() {
  const { baseUrl, setBaseUrl } = useAuth()
  const { show } = useToast()

  function save() {
    if (typeof window !== 'undefined') localStorage.setItem('os_base_url', baseUrl)
    show('Settings saved')
  }

  return (
    <div>
      <SectionHeader
        eyebrow="System"
        title="Settings"
        sub="Configure your connection to the OpenSignal network."
      />

      <FormPanel title="API server">
        <div className="flex flex-col gap-4">
          <Input
            label="API server address"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            hint="The server handling your sponsorship requests. Only change if you're running your own instance."
          />
          <div>
            <Button variant="primary" onClick={save}>Save settings</Button>
          </div>
        </div>
      </FormPanel>

      <FormPanel title="About">
        <p className="text-sm text-blue-400 leading-relaxed mb-3">
          OpenSignal is a Sui gas sponsorship platform. It accepts prebuilt transaction kind bytes,
          validates policy, and sponsors gas on behalf of your users.
        </p>
        <p className="text-sm text-blue-400 leading-relaxed mb-4">
          Built for developers who want to remove native gas handling from their dApp integration path
          without changing on-chain execution.
        </p>
        <div className="flex gap-2 flex-wrap">
          {['Sui network', 'Prisma persistence', 'JWT auth', 'Policy engine'].map((tag) => (
            <span key={tag} className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100">
              {tag}
            </span>
          ))}
        </div>
      </FormPanel>
    </div>
  )
}
