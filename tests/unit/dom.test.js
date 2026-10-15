import { describe, expect, it } from 'vitest';
import { esc, html, raw } from '../../src/lib/dom.js';

describe('html templating', () => {
  it('escapes interpolated text', () => {
    const evil = '<img src=x onerror="alert(1)">';
    expect(String(html`<p>${evil}</p>`)).toBe('<p>&lt;img src=x onerror=&quot;alert(1)&quot;&gt;</p>');
  });

  it('escapes inside attributes', () => {
    expect(String(html`<a title="${'" onclick="x'}">`)).toBe('<a title="&quot; onclick=&quot;x">');
    expect(esc("it's & <b>")).toBe('it&#39;s &amp; &lt;b&gt;');
  });

  it('nests templates without double escaping', () => {
    const inner = html`<b>${'a&b'}</b>`;
    expect(String(html`<p>${inner}</p>`)).toBe('<p><b>a&amp;b</b></p>');
  });

  it('renders arrays and skips empty values', () => {
    expect(String(html`${['a', html`<i>b</i>`, null, undefined, false, 0]}`)).toBe('a<i>b</i>0');
  });

  it('only raw() bypasses escaping', () => {
    expect(String(html`${raw('<hr>')}`)).toBe('<hr>');
  });
});
