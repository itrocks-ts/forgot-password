[![npm version](https://img.shields.io/npm/v/@itrocks/forgot-password?logo=npm)](https://www.npmjs.org/package/@itrocks/forgot-password)
[![npm downloads](https://img.shields.io/npm/dm/@itrocks/forgot-password)](https://www.npmjs.org/package/@itrocks/forgot-password)
[![GitHub](https://img.shields.io/github/last-commit/itrocks-ts/forgot-password?color=2dba4e&label=commit&logo=github)](https://github.com/itrocks-ts/forgot-password)
[![issues](https://img.shields.io/github/issues/itrocks-ts/forgot-password)](https://github.com/itrocks-ts/forgot-password/issues)
[![discord](https://img.shields.io/discord/1314141024020467782?color=7289da&label=discord&logo=discord&logoColor=white)](https://25.re/ditr)

# forgot-password

Forgot password management for @itrocks/user, including form, token generation, email sending, and secure reset.

*This documentation was written by an artificial intelligence and may contain errors or approximations.
It has not yet been fully reviewed by a human. If anything seems unclear or incomplete,
please feel free to contact the author of this package.*

## Installation

```bash
npm install @itrocks/forgot-password
```

This package is designed for the back-end part of an `@itrocks` application and
is typically used together with `@itrocks/user`.

Once installed, make sure the configuration of your application includes the
routes from this package (the default `config.yaml` shipped with the module
declares the `/user/forgot-password` route as publicly accessible):

```yaml
# app/config.yaml

imports:
  - ./node_modules/@itrocks/forgot-password/config.yaml
```

Adjust the path according to how you structure your configuration files.

Your global configuration must also provide an `smtp` section compatible with
what this package expects (SMTP host, port, credentials and default `from`
address). See the SMTP configuration example in the **Usage** section.

## Usage

`@itrocks/forgot-password` provides a single back-end action,
`Forgot`, that exposes the `/user/forgot-password` flow. The flow is:

1. Display a form asking for the user email.
2. When the form is submitted, generate a one-time token and send a reset
   email using `nodemailer` and your SMTP configuration.
3. When the user follows the link contained in the email, display a password
   reset form.
4. When the new password is submitted, update the corresponding `User` and
   invalidate the token.

The route is declared as **free access** by default, so that unauthenticated
users can request a reset link.

### Minimal example

With the module installed and `config.yaml` imported, a typical minimal setup
looks like this:

```yaml
# app/config.yaml

imports:
  - ./node_modules/@itrocks/user/config.yaml
  - ./node_modules/@itrocks/forgot-password/config.yaml

smtp:
  host:   smtp.example.com
  port:   465
  secure: true
  user:   no-reply@example.com
  pass:   "<SMTP_PASSWORD>"
  from:
    name:  "Example app"
    email: no-reply@example.com
```

With this configuration in place, your application exposes the URL
`/user/forgot-password`. Visiting it shows a **Forgot password** form asking for
an email address.

When a valid user is found for the given email, the package sends an email
containing a link with a time-limited token. When the user follows that link,
they are presented with a reset form where they can type a new password.

### Example with login screen integration

In a real application, you typically add a link from your login form to the
forgot password route, so that users can easily start the flow.

Assuming your login page already exists and uses the `@itrocks` routing
convention, you can add a link like this:

```html
<!-- Somewhere on the login page -->

<p>
  <a href="app://(@route)/forgot-password" target="main">
    Forgot your password?
  </a>
</p>
```

If you use `@itrocks/default-action-workflow`, you can also declare a link from
the `login` action to the `forgot-password` action in your workflow
configuration so that the navigation is handled consistently.

Once your SMTP configuration is correct and the templates provided by this
package are available (they are copied to `cjs/` during the build), the full
forgot-password flow works end-to-end without additional back-end code.

## API

This package exposes a single back-end class through its public API.

### `class Forgot<T extends User = User> extends Action<T>`

`Forgot` is an `@itrocks/action` that implements the **forgot password** and
**password reset** HTML flows for a given `User` type.

#### `html(request: Request<T>): Promise<HtmlResponse>`

Generates the HTML response for all steps of the forgot-password flow,
depending on the content of the incoming request.

Parameters:

- `request: Request<T>` – the current `@itrocks/action-request`, including:
  - `request.type`: the concrete `User` class used to search and update
    accounts.
  - `request.request.data`: POST or query parameters used to drive the flow.

Behavior (simplified):

1. **Password reset with token**
   - If `request.request.data.token` is present, the action looks up a matching
     token and associated user.
   - If a `password` value is also provided, the user password is updated and
     the token is deleted. A confirmation HTML page is returned.
   - If only the token is provided, a password reset form is shown.

2. **Forgot password request**
   - If no token is given but an `email` value is present, the action searches
     for a user whose `email` property matches.
   - If found, a token is created and a reset email is sent using the SMTP
     configuration. A "reset link sent" page is returned, or an error page if
     sending fails.
   - If no user matches the email, an error page is returned. For security
     reasons, you should typically show a generic message to the end user.

3. **Initial access**
   - If neither a token nor an email is provided, the action simply displays
     the initial forgot-password form.

Return value:

- `Promise<HtmlResponse>` – an HTML response built from one of the templates
  shipped with the package:
  - `forgot.html` – initial forgot-password form.
  - `forgot-sent.html` – confirmation page after sending the reset email.
  - `forgot-reset.html` – password reset form after following the email link.
  - `forgot-done.html` – confirmation page after successfully changing the
    password.
  - `forgot-error.html` – error page when the email cannot be sent or when the
    provided email does not match any user.

You typically do not instantiate `Forgot` directly: the `@itrocks` framework
uses the route configuration from this package to create and trigger actions.

## Typical use cases

- **Standard user account recovery**
  - Provide an accessible `/user/forgot-password` page so that users who have
    lost their password can request a reset link by email.

- **Integration with a custom login screen**
  - Add a "Forgot password?" link on the login page that targets
    `app://(@route)/forgot-password`, letting users seamlessly start the
    recovery flow.

- **Multi-language password reset emails**
  - Customize or translate the `forgot-email-<lang>.html` template files to
    send localized password reset emails while reusing the same back-end
    behavior.

- **Security-compliant password reset**
  - Rely on randomly generated, time-limited tokens stored in a dedicated
    store to avoid keeping passwords in clear text or exposing sensitive
    information when an email address is unknown.
