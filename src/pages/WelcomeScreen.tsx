import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, SparklesIcon } from '../components/icons'
import { Logo } from '../components/Logo'
import { supabaseConfig } from '../lib/env'
import { markWelcomeSeen } from '../lib/onboarding'
import { SupabaseSetupGuide } from './SetupScreen'

function ChoiceCard({ icon, title, description, onClick }: { icon: ReactNode; title: string; description: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-sm transition hover:border-indigo-300 hover:shadow-md"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-slate-900">{title}</span>
        <span className="mt-0.5 block text-sm text-slate-500">{description}</span>
      </span>
      <ChevronRightIcon className="size-5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500" />
    </button>
  )
}

/**
 * The first screen a visitor sees: "Are you new here?"
 * New users get the Supabase setup guide; returning users go to log in.
 */
export function WelcomeScreen() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'choose' | 'guide'>('choose')

  function finish(to: '/login' | '/signup') {
    markWelcomeSeen()
    navigate(to, { replace: true })
  }

  if (step === 'choose') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center text-center">
            <Logo className="[&>span:last-child]:inline" />
            <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900">Welcome to HabitFlow</h1>
            <p className="mt-1.5 text-sm text-slate-500">Is this your first time here?</p>
          </div>
          <div className="space-y-3">
            <ChoiceCard
              icon={<SparklesIcon className="size-5" />}
              title="Yes, I'm new"
              description="Walk me through setting up my own Supabase project."
              onClick={() => setStep('guide')}
            />
            <ChoiceCard
              icon={<CheckIcon className="size-5" />}
              title="No, I've already set up Supabase"
              description="Take me straight to log in."
              onClick={() => finish('/login')}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={() => setStep('choose')}
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ChevronLeftIcon className="size-4" /> Back
        </button>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-900">Set up your Supabase project</h1>
        <p className="mt-2 text-slate-600">
          HabitFlow keeps your data in <strong>your own</strong> free Supabase project. Enter its details and click{' '}
          <strong>Check &amp; connect</strong> — HabitFlow checks them, creates the database tables and saves everything for you.
        </p>

        <div className="mt-6">
          <SupabaseSetupGuide
            initialUrl={supabaseConfig.ok ? supabaseConfig.url : ''}
            initialKey={supabaseConfig.ok ? supabaseConfig.key : ''}
          />
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already set up and have an account?{' '}
          <button type="button" onClick={() => finish('/login')} className="font-medium text-indigo-600 hover:text-indigo-500">
            Go to log in
          </button>
        </p>
      </div>
    </div>
  )
}
