import { isIdentifier } from '@itrocks/storage'
import { Store }      from '@itrocks/store'
import { Unique }     from '@itrocks/unique'
import { User }       from '@itrocks/user'
import { createHash } from 'node:crypto'

export const tokenLifetimeMs = 60 * 60 * 1000

@Store('password_reset_token')
export class Token
{

	expiresAt = ''

	@Unique()
	tokenHash = ''

	userKey = ''

	constructor(user: User = new User(), token = '', now = new Date())
	{
		this.expiresAt = new Date(now.getTime() + tokenLifetimeMs).toISOString()
		this.tokenHash = token ? Token.hash(token) : ''
		this.userKey   = ('id' in user) && isIdentifier(user.id) ? String(user.id) : ''
	}

	static hash(token: string): string
	{
		return createHash('sha256').update(token).digest('hex')
	}

}

@Store('password_reset_use')
export class TokenUse
{

	@Unique()
	tokenHash = ''

	usedAt = ''

	constructor(tokenHash = '', now = new Date())
	{
		this.tokenHash = tokenHash
		this.usedAt    = now.toISOString()
	}

}
