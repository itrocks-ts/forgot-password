# Forgot-password dependency configuration

`@itrocks/forgot-password` exposes lifecycle hooks for security work surrounding a
successful password reset.

## Default

Both hooks resolve without side effects. Password reset remains usable in an
application that does not manage other sessions or security notifications.

## Framework-agnostic configuration

Supply either hook before the first recovery request:

```ts
import { forgotPasswordDependsOn } from '@itrocks/forgot-password'

forgotPasswordDependsOn({
	beforePasswordChanged: async user => revokeSessionsOf(user),
	mayRecover:            user => user.emailVerifiedAt !== undefined,
	passwordChanged:       async user => notifyPasswordChanged(user)
})
```

- `beforePasswordChanged` runs after the one-time token is consumed and before the
  new password is saved. Use it for fail-closed work such as session revocation.
- `mayRecover` decides whether the account has a verified recovery channel. It
  returns `true` by default for backward compatibility.
- `passwordChanged` runs after persistence succeeds. Use it for notifications.

Supplying one hook preserves the current value of the other.

## it.rocks framework configuration

The framework does not assign application-specific password-change policy. The
application binds the hooks during bootstrap. SMTP delivery continues to read the
shared `smtp` configuration loaded by `@itrocks/config`.
