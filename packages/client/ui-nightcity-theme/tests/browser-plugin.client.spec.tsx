// @vitest-environment jsdom
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import { apply, inject } from '../src/client/index.ts'
import { nightcityStylesheet } from '../src/client/stylesheet.ts'
import { NIGHTCITY_TOKENS } from '../src/client/tokens.ts'

async function bench() {
  const ctx = new Context()
  return { ctx }
}

const SHEET_ID = 'nightcity-theme-override'

describe('nightcity theme plugin', () => {
  it('declares no service dependencies (the skin is plain CSS)', () => {
    expect(inject).toEqual([])
  })

  it('installs one stylesheet with both schemes and removes it with the fiber', async () => {
    const subject = await bench()
    const fiber = subject.ctx.plugin({ inject: [...inject], apply })
    await fiber.await()

    const sheet = document.getElementById(SHEET_ID)
    expect(sheet?.textContent).toBe(nightcityStylesheet(NIGHTCITY_TOKENS))
    expect(sheet?.textContent).toContain('body {')
    expect(sheet?.textContent).toContain('body[data-ds-dark-theme] {')

    await fiber.dispose()
    expect(document.getElementById(SHEET_ID)).toBeNull()
  })
})

describe('nightcity stylesheet', () => {
  it('carries both scheme values for every token', () => {
    const sheet = nightcityStylesheet(NIGHTCITY_TOKENS)
    for (const [name, modes] of Object.entries(NIGHTCITY_TOKENS)) {
      expect(sheet).toContain(`${name}: ${modes.light};`)
      expect(sheet).toContain(`${name}: ${modes.dark};`)
    }
    // The base token must flip between schemes so the attribute cascade moves it.
    expect(NIGHTCITY_TOKENS['--dsw-alias-bg-base']?.light)
      .not.toBe(NIGHTCITY_TOKENS['--dsw-alias-bg-base']?.dark)
  })
})
