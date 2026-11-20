import { LoginForm } from "./LoginForm";

export const metadata = { title: "Iniciar sesión · METALTRACK" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-navy px-4">
      <div className="w-full max-w-sm rounded-md border border-line bg-white p-6">
        <div className="mb-6 flex items-center gap-3">
          <svg width="36" height="36" viewBox="0 0 32 32" aria-hidden="true">
            <path d="M0 0h26l6 6v26H0z" fill="#1F5BFF" />
            <rect x="6" y="9" width="6" height="3" fill="#fff" />
            <rect x="14" y="9" width="6" height="3" fill="#fff" />
            <rect x="22" y="9" width="4" height="3" fill="#fff" opacity=".35" />
            <rect x="6" y="15" width="12" height="3" fill="#fff" />
            <rect x="20" y="15" width="6" height="3" fill="#fff" opacity=".35" />
            <rect x="6" y="21" width="4" height="3" fill="#fff" />
            <rect x="12" y="21" width="14" height="3" fill="#fff" opacity=".35" />
          </svg>
          <div>
            <h1 className="text-lg font-bold tracking-[.1em] text-navy">METALTRACK</h1>
            <p className="text-xs text-muted">Control de taller</p>
          </div>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
