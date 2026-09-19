/** Tiny DOM helpers and the allow-list Markdown renderer (contract §7.5: campaign text is untrusted). */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, attrs: Record<string, unknown> = {}, ...kids: unknown[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = String(v);
    else if (k === 'text') node.textContent = String(v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v as EventListener);
    else node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) node.append(kid instanceof Node ? kid : String(kid));
  return node;
}

/** SVG sibling of el(). SVG nodes need createElementNS, and building them as real
    nodes keeps icon markup out of innerHTML like everything else in this file. */
export function svgEl(tag: string, attrs: Record<string, unknown> = {}, ...kids: Node[]): SVGElement {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    node.setAttribute(k, v === true ? '' : String(v));
  }
  node.append(...kids);
  return node;
}

export function renderInline(str: string, parent: Node): void {
  const re = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([\s\S]+?)\*\*|\*([^*\n]+)\*/g;
  let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(str))) {
    if (m.index > last) parent.appendChild(document.createTextNode(str.slice(last, m.index)));
    if (m[1] !== undefined) {
      if (/^https?:\/\//i.test(m[2])) {
        const a = el('a', { href: m[2], target: '_blank', rel: 'noopener noreferrer' });
        renderInline(m[1], a); parent.appendChild(a);
      } else parent.appendChild(document.createTextNode(m[1]));
    } else if (m[3] !== undefined) { const s = el('strong'); renderInline(m[3], s); parent.appendChild(s); }
    else { const e = el('em'); renderInline(m[4], e); parent.appendChild(e); }
    last = re.lastIndex;
  }
  if (last < str.length) parent.appendChild(document.createTextNode(str.slice(last)));
}

export function renderBody(text: string): DocumentFragment {
  const frag = document.createDocumentFragment();
  for (const para of String(text).split(/\n{2,}/)) {
    if (!para.trim()) continue;
    const p = el('p');
    renderInline(para.replace(/\n/g, ' '), p);
    frag.append(p);
  }
  return frag;
}
