const assert = require('node:assert/strict')

const { describe, it } = require('node:test')

const { Token, tokenLifetimeMs, TokenUse } = require('../cjs/token')

describe('password reset token', () => {
	it('stores only a fingerprint with a one-hour lifetime', () => {
		const now   = new Date('2026-09-12T10:00:00Z')
		const token = new Token({ id: 42, login: 'alice' }, 'raw-recovery-secret', now)

		assert.equal(token.tokenHash, Token.hash('raw-recovery-secret'))
		assert.notEqual(token.tokenHash, 'raw-recovery-secret')
		assert.equal(token.userKey, '42')
		assert.equal(Date.parse(token.expiresAt), now.getTime() + tokenLifetimeMs)
		assert.doesNotMatch(JSON.stringify(token), /raw-recovery-secret/)
	})

	it('creates a stable unique consumption key without the raw token', () => {
		const now       = new Date('2026-09-12T10:30:00Z')
		const tokenHash = Token.hash('raw-recovery-secret')
		const use       = new TokenUse(tokenHash, now)

		assert.equal(use.tokenHash, tokenHash)
		assert.equal(use.usedAt, now.toISOString())
	})
})
