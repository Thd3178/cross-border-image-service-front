import { LoginForm } from "@/components/login-form"

export function App() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  )
}

export default App
