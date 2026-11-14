import { useState } from 'react'
import { AutoAwesomeRounded, VisibilityOffOutlined, VisibilityOutlined } from '@mui/icons-material'
import { Button, IconButton, InputAdornment, TextField } from '@mui/material'
import type { AuthSession } from '../types'

type Props = {
  onAuthenticate: (session: AuthSession) => void
  authenticate: (input: { email: string; password: string; confirm_password?: string }, register: boolean) => Promise<AuthSession>
}

export default function AuthPage({ onAuthenticate, authenticate }: Props) {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (isRegister && password !== confirmPassword) {
      setError('Those passwords don’t match yet.')
      return
    }

    setLoading(true)
    try {
      const session = await authenticate({
        email,
        password,
        ...(isRegister ? { confirm_password: confirmPassword } : {}),
      }, isRegister)
      onAuthenticate(session)
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Unable to sign in right now.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-left">
        <a href="/" className="brand-mark auth-brand"><span className="brand-icon">+</span><span>HealthVector</span></a>
        <div className="auth-copy">
          <div className="eyebrow">YOUR DAY, A LITTLE MORE IN RHYTHM</div>
          <h1>Care that fits<br />into <span>your life.</span></h1>
          <p>Keep your medication routine clear, simple, and a little easier to manage.</p>
        </div>
        <div className="auth-quote">
          <div className="auth-quote-mark">“</div>
          <p>A gentle reminder can make all the difference between wondering and knowing.</p>
          <span>YOUR PERSONAL WELLNESS SPACE</span>
        </div>
        <div className="auth-decoration auth-decoration-a" />
        <div className="auth-decoration auth-decoration-b" />
      </div>
      <div className="auth-right">
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand brand-mark"><span className="brand-icon">+</span><span>HealthVector</span></div>
          <div className="auth-form-heading">
            <div className="auth-welcome-icon"><AutoAwesomeRounded /></div>
            <div className="eyebrow">{isRegister ? 'A FRESH START' : 'WELCOME BACK'}</div>
            <h2>{isRegister ? 'Create your account' : 'Good to see you.'}</h2>
            <p>{isRegister ? 'Let’s make your medication routine feel more manageable.' : 'Sign in to pick up right where you left off.'}</p>
          </div>
          <form onSubmit={submit} className="auth-form">
            <TextField
              label="Email address"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              slotProps={{
                htmlInput: isRegister ? { minLength: 6 } : undefined,
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword((value) => !value)} edge="end" aria-label="Toggle password visibility">
                        {showPassword ? <VisibilityOffOutlined /> : <VisibilityOutlined />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
              fullWidth
            />
            {isRegister && (
              <TextField
                label="Confirm password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                slotProps={{ htmlInput: { minLength: 6 } }}
                fullWidth
              />
            )}
            {error && <div className="auth-error" role="alert">{error}</div>}
            <Button type="submit" variant="contained" size="large" disabled={loading}>
              {loading ? 'One moment...' : isRegister ? 'Create account' : 'Sign in to your account'}
            </Button>
          </form>
          <div className="auth-switch">
            {isRegister ? 'Already have an account?' : 'New to HealthVector?'}
            <button onClick={() => {
              setIsRegister((current) => !current)
              setError('')
            }}>{isRegister ? 'Sign in' : 'Create an account'}</button>
          </div>
          <div className="auth-security-note"><span>♡</span> Your medication routine is private and personal.</div>
        </div>
      </div>
    </main>
  )
}
