import AuthPage from '@/components/pages/AuthPage'

export default function RegisterPage() {
  return <AuthPage mode="register" googleClientId={process.env.GOOGLE_CLIENT_ID ?? ''} />
}
