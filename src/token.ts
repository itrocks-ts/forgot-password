import { Store }       from '@itrocks/store'
import { User }        from '@itrocks/user'
import { randomBytes } from 'node:crypto'

@Store('password_reset_token')
export class Token
{

	date  = new Date()
	token = randomBytes(32).toString('hex')
	user?: User

	constructor(user?: User)
	{
		this.user = user
	}

}
