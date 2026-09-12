[![npm version](https://img.shields.io/npm/v/@itrocks/forgot-password?logo=npm)](https://www.npmjs.org/package/@itrocks/forgot-password)
[![npm downloads](https://img.shields.io/npm/dm/@itrocks/forgot-password)](https://www.npmjs.org/package/@itrocks/forgot-password)
[![GitHub](https://img.shields.io/github/last-commit/itrocks-ts/forgot-password?color=2dba4e&label=commit&logo=github)](https://github.com/itrocks-ts/forgot-password)
[![issues](https://img.shields.io/github/issues/itrocks-ts/forgot-password)](https://github.com/itrocks-ts/forgot-password/issues)
[![discord](https://img.shields.io/discord/1314141024020467782?color=7289da&label=discord&logo=discord&logoColor=white)](https://25.re/ditr)

# forgot-password

Forgot password management for @itrocks/user, including form, token generation, email sending, and secure reset.

## Requirements

- Node.js 24 or newer.
- An application using [`@itrocks/user`](https://github.com/itrocks-ts/user).
- An SMTP server configured through the shared `smtp` application configuration.

## Installation

```bash
npm i @itrocks/forgot-password
```

The package contributes the public `/user/forgot-password` route through its
`config.yaml` file. The it.rocks framework loads dependency configuration files
automatically.

## Usage

Configure the same SMTP source used by the rest of the application:

```yaml
smtp:
  from:
    email: no-reply@example.com
    name: Example
  host: smtp.example.com
  pass: "<SMTP_PASSWORD>"
  port: 465
  secure: true
  user: no-reply@example.com
```

Opening `/user/forgot-password` displays the recovery form. Submitting an email
always produces the same public response, whether the address exists, delivery
fails, or the message is sent.

For a matching account, the action:

1. creates a random one-hour token;
2. stores only its SHA-256 fingerprint;
3. sends the raw token once in an SMTP email;
4. accepts one password reset before deleting the token.

Concurrent reset attempts are serialized by a unique persisted consumption
record. Only one attempt can change the password.

## API

### `Forgot`

```ts
class Forgot<T extends User = User> extends Action<T> {
	async html(request: Request<T>): Promise<HtmlResponse>
}
```

Implements the HTML request, email delivery, token validation and password reset
steps. The framework normally instantiates this action from the contributed route.

## Dependencies

See [dependency configuration](docs/dependencies.md) for password-change lifecycle
hooks and framework integration.
