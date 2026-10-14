import { Request }         from '@itrocks/action-request'
import { Action }          from '@itrocks/action'
import { config }          from '@itrocks/config'
import { HtmlResponse }    from '@itrocks/core-responses'
import { dataToObject }    from '@itrocks/data-to-object'
import { lessOrEqual }     from '@itrocks/sql-functions'
import { dataSource }      from '@itrocks/storage'
import { lang, tr }        from '@itrocks/translate'
import { User }            from '@itrocks/user'
import { htmlToText }      from 'html-to-text'
import { randomBytes }     from 'node:crypto'
import { readFile }        from 'node:fs/promises'
import { createTransport } from 'nodemailer'
import { Token }           from './token'
import { tokenLifetimeMs } from './token'
import { TokenUse }        from './token'

export { Token }    from './token'
export { TokenUse } from './token'

type Dependencies = {
	beforePasswordChanged: (user: User) => Promise<void>
	mayRecover:            (user: User) => boolean | Promise<boolean>
	passwordChanged:       (user: User) => Promise<void>
	resetUrl:              (request: Request<User>, secret: string) => string
}

const dependencyScope = globalThis as typeof globalThis & {
	itrocksForgotPasswordDependencies?: Dependencies
}

const depends: Dependencies = dependencyScope.itrocksForgotPasswordDependencies ??= {
	beforePasswordChanged: async () => undefined,
	mayRecover:            () => true,
	passwordChanged:       async () => undefined,
	resetUrl:              (request, secret) => request.request.url + '?token=' + secret
}

export function forgotPasswordDependsOn(dependencies: Partial<Dependencies>)
{
	Object.assign(depends, dependencies)
}

export class Forgot<T extends User = User> extends Action<T>
{

	async html(request: Request<T>): Promise<HtmlResponse>
	{
		const dao = dataSource()
		const now = new Date()

		const userType = request.type

		let templateName = 'forgot'

		for (const oldToken of await dao.search(Token, { expiresAt: lessOrEqual(now.toISOString()) })) {
			await dao.delete(oldToken, 'tokenHash')
		}
		const usesBefore = new Date(now.getTime() - tokenLifetimeMs)
		for (const oldUse of await dao.search(TokenUse, { usedAt: lessOrEqual(usesBefore.toISOString()) })) {
			await dao.delete(oldUse, 'tokenHash')
		}

		const requestToken = (typeof request.request.data.token === 'string')
			? request.request.data.token
			: ''
		if (requestToken) {
			const token = await dao.searchOne(Token, { tokenHash: Token.hash(requestToken) })
			if (token && (Date.parse(token.expiresAt) > now.getTime())) {
				const password  = request.request.data.password
				const tokenUser = await dao.read(userType, token.userKey).catch(() => undefined)
				if (tokenUser && (typeof password === 'string') && password.length && (password.length <= 1024)) {
					try {
						await dao.save(new TokenUse(token.tokenHash, now))
					}
					catch {
						return this.htmlTemplateResponse(tokenUser, request, __dirname + '/forgot-error.html', 422)
					}
					await depends.beforePasswordChanged(tokenUser)
					await dataToObject(tokenUser, { password })
					await dao.save(tokenUser)
					await dao.delete(token, 'tokenHash')
					await depends.passwordChanged(tokenUser)
					return this.htmlTemplateResponse(tokenUser, request, __dirname + '/forgot-done.html')
				}
				if (tokenUser) {
					tokenUser.password = ''
					return this.htmlTemplateResponse({ token: requestToken, user: tokenUser }, request,
						__dirname + '/forgot-reset.html')
				}
			}
			return this.htmlTemplateResponse(new userType, request, __dirname + '/forgot-error.html', 422)
		}

		const email = request.request.data.email
		let   user: T | undefined
		if (email && (typeof email === 'string')) {
			user = await dao.searchOne(userType, { email })

			if (user && await depends.mayRecover(user)) {
				const secret = randomBytes(32).toString('base64url')
				const smtp   = config.smtp
				await dao.save(new Token(user, secret, now))
				const content     = (await readFile(__dirname + '/forgot-email-' + lang() + '.html')) + ''
				const from        = (smtp.from.name ? ('"' + smtp.from.name + '" ') : '') + '<' + smtp.from.email + '>'
				const html        = content.replaceAll('app://(resetLink)', depends.resetUrl(request, secret))
				const transporter = createTransport({
					auth:   { pass: smtp.pass, user: smtp.user },
					disableFileAccess: true,
					disableUrlAccess:  true,
					host:   smtp.host,
					port:   smtp.port,
					secure: smtp.secure,
				})
				try {
					await transporter.sendMail({
						from,
						html,
						subject: tr('Password reset request'),
						text:    htmlToText(html, {wordwrap: 130}),
						to:      '"' + user.login + '" <' + user.email + '>'
					})
				}
				catch {
					// The public response deliberately does not reveal delivery failure.
				}
			}
			user = Object.assign(new userType, { email })
			templateName = 'forgot-sent'
		}
		else {
			user = new userType
		}

		return this.htmlTemplateResponse(user, request, __dirname + '/' + templateName + '.html')
	}

}
