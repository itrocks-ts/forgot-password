import { Action }          from '@itrocks/action'
import { Request }         from '@itrocks/action-request'
import { Type }            from '@itrocks/class-type'
import { config }          from '@itrocks/config'
import { dataToObject }    from '@itrocks/data-to-object'
import { lessOrEqual }     from '@itrocks/sql-functions'
import { dataSource }      from '@itrocks/storage'
import { lang, tr }        from '@itrocks/translate'
import { User }            from '@itrocks/user'
import { htmlToText }      from 'html-to-text'
import { readFile }        from 'node:fs/promises'
import { createTransport } from 'nodemailer'
import { Token }           from './token'

export class Forgot<T extends User = User> extends Action<T>
{

	async html(request: Request<T>)
	{
		const userType:  Type<User> = request.type
		const dao        = dataSource()
		let templateName = 'forgot'

		if (request.request.data.token) {
			const momentAgo = new Date()
			momentAgo.setHours(momentAgo.getHours() - 1)
			for (const oldToken of await dao.search(Token, { date: lessOrEqual(momentAgo) })) {
				await dao.delete(oldToken, 'token')
			}
			const token = await dao.searchOne(Token, { token: request.request.data.token })
			if (token) {
				const tokenUser = await token.user
				if (tokenUser) {
					if (request.request.data.password) {
						await dataToObject(tokenUser, { password: request.request.data.password })
						await dao.save(tokenUser)
						await dao.delete(token, 'token')
						return this.htmlTemplateResponse(tokenUser, request, __dirname + '/forgot-done.html')
					}
					tokenUser.password = ''
					return this.htmlTemplateResponse(token, request, __dirname + '/forgot-reset.html')
				}
			}
		}

		const email = request.request.data.email
		let   user: User | undefined
		if (email && (typeof email === 'string')) {
			user = await dao.searchOne(userType, { email })

			if (user) {
				const smtp  = config.smtp
				const token = await dao.save(new Token(user))
				const transporter = createTransport({
					auth:   { pass: smtp.pass, user: smtp.user },
					host:   smtp.host,
					port:   smtp.port,
					secure: smtp.secure,
				})
				const content = (await readFile(__dirname + '/forgot-email-' + lang() + '.html')) + ''
				const link    = request.request.url + '?token=' + token.token
				const from    = (smtp.from.name ? ('"' + smtp.from.name + '" ') : '') + '<' + smtp.from.email + '>'
				const html    = content.replaceAll('app://(resetLink)', link)
				try {
					await transporter.sendMail({
						from,
						html,
						subject: tr('Password reset request'),
						text:    htmlToText(html, {wordwrap: 130}),
						to:      '"' + user.login + '" <' + user.email + '>'
					})
					templateName = 'forgot-sent'
				}
				catch (exception) {
					templateName = 'forgot-error'
				}
			}
			else {
				user         = Object.assign(new userType, { email })
				templateName = 'forgot-error'
			}
		}
		else {
			user = new userType
		}

		return this.htmlTemplateResponse(user, request, __dirname + '/' + templateName + '.html')
	}

}
