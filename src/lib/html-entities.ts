/**
 * A API do YouTube devolve títulos com entidades HTML já codificadas
 * (`What&#39;s Up?`, `Rock &amp; Roll`). O React escapa o `&` ao renderizar,
 * então o usuário acaba vendo o código (`&#39;`) em vez do apóstrofo.
 *
 * Decodificamos na entrada (youtube-service) e também na limpeza de títulos,
 * cobrindo o que já veio persistido no localStorage de versões anteriores.
 *
 * `&amp;` fica por último: sem isso, `&amp;#39;` viraria `'` em vez de `&#39;`.
 */

const NAMED: Record<string, string> = {
  amp: '&',
  quot: '"',
  apos: "'",
  lt: '<',
  gt: '>',
  nbsp: '\u00a0',
  ndash: '\u2013',
  mdash: '\u2014',
  hellip: '\u2026',
  lsquo: '\u2018',
  rsquo: '\u2019',
  ldquo: '\u201c',
  rdquo: '\u201d',
  bull: '\u2022',
  trade: '\u2122',
  reg: '\u00ae',
  copy: '\u00a9',
}

export function decodeHtmlEntities(value: string): string {
  if (!value || !value.includes('&')) return value

  let out = value.replace(/&#(x[0-9a-f]+|\d+);?/gi, (match, code: string) => {
    const hex = code[0].toLowerCase() === 'x'
    const point = parseInt(hex ? code.slice(1) : code, hex ? 16 : 10)
    return Number.isFinite(point) && point > 0 && point <= 0x10ffff
      ? String.fromCodePoint(point)
      : match
  })

  out = out.replace(/&(amp|quot|apos|lt|gt|nbsp|ndash|mdash|hellip|lsquo|rsquo|ldquo|rdquo|bull|trade|reg|copy);/g,
    (match, name: string) => (name === 'amp' ? match : NAMED[name] ?? match))

  return out.replace(/&amp;/g, '&')
}
