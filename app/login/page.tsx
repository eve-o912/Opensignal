import AuthPage from '@/components/pages/AuthPage'

export default function LoginPage() {
  return <AuthPage mode="login" googleClientId={process.env.GOOGLE_CLIENT_ID ?? ''} />
}
