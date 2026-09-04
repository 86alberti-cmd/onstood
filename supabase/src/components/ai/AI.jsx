import React, { useEffect, useRef, useState } from 'react';
import { Download, FileText, Globe2, GraduationCap, History, Presentation, Search, Send, Sparkles, WandSparkles, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Page } from '../ui';
import OnstoodWordmark from '../OnstoodWordmark';
import { creatorQualityReport, downloadDocx, downloadPptx, parseCreatorJson } from '../../utils/officeExport';

export default function AI({
  profile,
  externalAsk = null,
  onExternalAskConsumed = null,
  onUsageChanged = null
}) {
  const [plan, setPlan] = useState({ plan_code: 'free', standard_limit: 5, advanced_limit: 0, monthly_price_eur: 0 });
  const [aiInsights, setAiInsights] = useState([]);
  const [insightBusy, setInsightBusy] = useState(false);

  async function loadAiInsights() {
    if (!profile?.id) return;
    const { data } = await supabase
      .from('ai_insights')
      .select('id,title,teaser,action_prompt,status,advanced_required,created_at')
      .eq('user_id', profile.id)
      .in('status', ['new','seen'])
      .order('created_at', { ascending: false })
      .limit(5);
    if (data) setAiInsights(data);
  }

  async function dismissInsight(id) {
    await supabase.from('ai_insights').update({ status: 'dismissed', acted_at: new Date().toISOString() }).eq('id', id);
    setAiInsights(current => current.filter(x => x.id !== id));
  }

  async function acceptInsight(insight) {
    if (!isPro) {
      setMessages(current => [...current, {
        id: `local-${Date.now()}`, role: 'assistant', mode: 'advanced',
        content: 'I found this proactively, but the full analysis uses Advanced AI and requires the Advanced plan.'
      }]);
      focusInput();
      return;
    }
    if (advancedLeft <= 0) {
      setMessages(current => [...current, {
        id: `local-${Date.now()}`, role: 'assistant', mode: 'advanced',
        content: 'Your Advanced AI allowance is finished. It refreshes at 12:00 PM.'
      }]);
      focusInput();
      return;
    }
    await supabase.from('ai_insights').update({ status: 'accepted', acted_at: new Date().toISOString() }).eq('id', insight.id);
    setAiInsights(current => current.filter(x => x.id !== insight.id));
    setDraft(insight.action_prompt || `Analyze this study insight in depth: ${insight.title}. ${insight.teaser}`);
    setMode('advanced');
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  const inputRef = useRef(null);
  const chatEndRef = useRef(null);
  const lastExternalAskRef = useRef(null);

  const [planLoaded, setPlanLoaded] =
    useState(false);

  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [usage, setUsage] = useState({ standard_count: 0, advanced_count: 0 });
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingNotice, setBillingNotice] = useState('');
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [answerLanguage, setAnswerLanguage] = useState('auto');
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [creatorBusy, setCreatorBusy] = useState(false);
  const [creatorResult, setCreatorResult] = useState(null);
  const [creatorPlanConfirm, setCreatorPlanConfirm] = useState(null);
  const [creatorProgress, setCreatorProgress] = useState('');
  const [creatorForm, setCreatorForm] = useState({ kind:'assignment', topic:'', focus:'', brief:'', level:'Bachelor', citation:'APA 7', citationDisplay:'Academic standard', language:'Auto / Same as request', pages:'8-10', slides:'10-12', output:'word_ppt', template:'OnStood Minimal' });

  const AI_LANGUAGES = [
    ['auto', 'Auto'], ['sq', 'Shqip'], ['en', 'English'], ['de', 'Deutsch'], ['fr', 'Français'],
    ['it', 'Italiano'], ['es', 'Español'], ['pt', 'Português'], ['tr', 'Türkçe'], ['el', 'Ελληνικά'],
    ['nl', 'Nederlands'], ['pl', 'Polski'], ['ro', 'Română'], ['hr', 'Hrvatski'], ['sr', 'Srpski'],
    ['bs', 'Bosanski'], ['mk', 'Македонски'], ['ar', 'العربية'], ['he', 'עברית'], ['hi', 'हिन्दी'],
    ['zh', '中文'], ['ja', '日本語'], ['ko', '한국어'], ['ru', 'Русский'], ['uk', 'Українська']
  ];

  const standardLeft = Math.max(0, Number(plan.standard_limit || 0) - Number(usage.standard_count || 0));
  const advancedLeft = Math.max(0, Number(plan.advanced_limit || 0) - Number(usage.advanced_count || 0));
  const isPro = Number(plan.advanced_limit || 0) > 0;

  async function startAdvancedCheckout(planCode = 'advanced') {
    if (billingBusy) return;
    setBillingBusy(true);
    setBillingNotice('');
    try {
      const origin = window.location.origin;
      const basePath = window.location.pathname || '/';

      // Checkout needs a session token that Auth still recognises, not only
      // an unexpired JWT. After MFA/token rotation an older JWT can continue
      // to work with PostgREST while Auth correctly reports "Session not found".
      let { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session?.access_token) {
        throw new Error('Your session has expired. Please sign in again before checkout.');
      }

      let accessToken = sessionData.session.access_token;
      const { error: userCheckError } = await supabase.auth.getUser(accessToken);

      if (userCheckError) {
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshed?.session?.access_token) {
          throw new Error('Your session has expired. Please sign in again before checkout.');
        }
        accessToken = refreshed.session.access_token;
      }

      const { data, error } = await supabase.functions.invoke('onstood-paypal-create-subscription', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        body: {
          return_url: `${origin}${basePath}?paypal=success`,
          cancel_url: `${origin}${basePath}?paypal=cancelled`,
          plan_code: planCode
        }
      });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Checkout could not be started.');
      if (data?.already_active) {
        await loadUsage();
        setBillingNotice(`${planCode === 'pro' ? 'Pro' : 'Advanced'} is already active on your account.`);
        return;
      }
      if (!data?.approval_url) throw new Error('PayPal did not return an approval link.');
      window.location.assign(data.approval_url);
    } catch (error) {
      setBillingNotice(error?.message || 'Checkout could not be started.');
    } finally {
      setBillingBusy(false);
    }
  }

  async function cancelAdvancedRenewal() {
    if (billingBusy) return;
    setBillingBusy(true);
    setBillingNotice('');
    try {
      const { data, error } = await supabase.functions.invoke('onstood-paypal-cancel-subscription', { body: {} });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Cancellation could not be completed.');
      setBillingNotice(data?.access_until
        ? `Renewal cancelled. Advanced stays active until ${new Date(data.access_until).toLocaleDateString()}.`
        : 'Renewal cancelled.');
      await loadUsage();
    } catch (error) {
      setBillingNotice(error?.message || 'Cancellation could not be completed.');
    } finally {
      setBillingBusy(false);
    }
  }

  function focusInput() {
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  function scrollChat() {
    window.requestAnimationFrame(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }));
  }

  async function openOnstoodDocument(documentId) {
    const popup = window.open('about:blank', '_blank');
    try {
      const { data, error } = await supabase.functions.invoke(
        'onstood-document-download',
        { body: { document_id: documentId } }
      );
      if (error || !data?.url) {
        popup?.close?.();
        throw new Error(data?.error || error?.message || 'The document could not be prepared for download.');
      }
      if (popup) {
        popup.opener = null;
        popup.location.href = data.url;
      } else {
        window.location.assign(data.url);
      }
    } catch (error) {
      popup?.close?.();
      setMessages(current => [...current, {
        id: `download-error-${Date.now()}`,
        role: 'assistant',
        mode: 'standard',
        content: error?.message || 'The document could not be prepared for download.'
      }]);
    }
  }

  function readBalancedMathGroup(source, startIndex) {
    if (source[startIndex] !== '{') return null;
    let depth = 0;
    for (let index = startIndex; index < source.length; index += 1) {
      const char = source[index];
      if (char === '{') depth += 1;
      if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          return { content: source.slice(startIndex + 1, index), end: index + 1 };
        }
      }
    }
    return null;
  }

  function unicodeScript(value, type = 'sup') {
    const superscript = {
      '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹',
      '+':'⁺','-':'⁻','=':'⁼','(':'⁽',')':'⁾'
    };
    const subscript = {
      '0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉',
      '+':'₊','-':'₋','=':'₌','(':'₍',')':'₎',a:'ₐ',e:'ₑ',h:'ₕ',i:'ᵢ',j:'ⱼ',k:'ₖ',l:'ₗ',
      m:'ₘ',n:'ₙ',o:'ₒ',p:'ₚ',r:'ᵣ',s:'ₛ',t:'ₜ',u:'ᵤ',v:'ᵥ',x:'ₓ'
    };
    const map = type === 'sub' ? subscript : superscript;
    const chars = String(value || '').split('');
    if (!chars.length || chars.some(char => !map[char])) return null;
    return chars.map(char => map[char]).join('');
  }

  function expandLatexMath(value, depth = 0) {
    if (depth > 10) return String(value || '');
    const source = String(value || '');
    let output = '';

    for (let index = 0; index < source.length;) {
      let handled = false;

      if (source.startsWith('\\frac', index)) {
        let cursor = index + 5;
        while (/\s/.test(source[cursor] || '')) cursor += 1;
        const numerator = readBalancedMathGroup(source, cursor);
        if (numerator) {
          cursor = numerator.end;
          while (/\s/.test(source[cursor] || '')) cursor += 1;
          const denominator = readBalancedMathGroup(source, cursor);
          if (denominator) {
            output += `(${expandLatexMath(numerator.content, depth + 1)}) / (${expandLatexMath(denominator.content, depth + 1)})`;
            index = denominator.end;
            handled = true;
          }
        }
      }
      if (handled) continue;

      const oneArgCommands = [
        ['\\boxed', value => value], ['\\text', value => value],
        ['\\mathrm', value => value], ['\\mathbf', value => value],
        ['\\operatorname', value => value], ['\\sqrt', value => `√(${value})`]
      ];
      for (const [command, formatter] of oneArgCommands) {
        if (!source.startsWith(command, index)) continue;
        let cursor = index + command.length;
        while (/\s/.test(source[cursor] || '')) cursor += 1;
        const group = readBalancedMathGroup(source, cursor);
        if (!group) continue;
        output += formatter(expandLatexMath(group.content, depth + 1));
        index = group.end;
        handled = true;
        break;
      }
      if (handled) continue;

      output += source[index];
      index += 1;
    }

    return output;
  }

  function cleanAcademicMath(value) {
    let textValue = expandLatexMath(String(value || '').trim());
    const replacements = [
      [/\\left|\\right/g, ''], [/\\approx/g, '≈'], [/\\neq/g, '≠'],
      [/\\geq|\\ge/g, '≥'], [/\\leq|\\le/g, '≤'], [/\\times/g, '×'],
      [/\\cdot/g, '·'], [/\\sum/g, 'Σ'], [/\\prod/g, '∏'], [/\\infty/g, '∞'],
      [/\\Delta/g, 'Δ'], [/\\delta/g, 'δ'], [/\\alpha/g, 'α'], [/\\beta/g, 'β'],
      [/\\gamma/g, 'γ'], [/\\lambda/g, 'λ'], [/\\mu/g, 'μ'], [/\\sigma/g, 'σ'],
      [/\\theta/g, 'θ'], [/\\pi/g, 'π'], [/\\rho/g, 'ρ'], [/\\%/g, '%'],
      [/\\,/g, ' '], [/\\;/g, ' '], [/\\!/g, '']
    ];
    replacements.forEach(([pattern, replacement]) => {
      textValue = textValue.replace(pattern, replacement);
    });

    return textValue
      .replace(/_\{([^{}]+)\}/g, (_, content) => unicodeScript(content, 'sub') || `_${content}`)
      .replace(/\^\{([^{}]+)\}/g, (_, content) => unicodeScript(content, 'sup') || `^${content}`)
      .replace(/_([0-9aehijklmnoprstuvx]+)\b/g, (_, content) => unicodeScript(content, 'sub') || `_${content}`)
      .replace(/\^([+\-]?[0-9]+)\b/g, (_, content) => unicodeScript(content, 'sup') || `^${content}`)
      .replace(/\{,\}/g, ',')
      .replace(/[{}]/g, '')
      .replace(/\\([A-Za-z]+)/g, '$1')
      .replace(/\s*\/\s*/g, ' / ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function cleanPlainAcademicText(value) {
    const plain = String(value || '');
    const hasLatex = /\\(?:frac|boxed|text|mathrm|mathbf|operatorname|sqrt|left|right|approx|neq|geq|leq|times|cdot|sum|prod|infty|Delta|delta|alpha|beta|gamma|lambda|mu|sigma|theta|pi|rho)\b|[_^]\{/.test(plain);
    return hasLatex ? cleanAcademicMath(plain) : plain;
  }

  function renderAcademicInline(value, keyPrefix = 'ai') {
    const textValue = String(value || '');
    const tokenRx = /\[\[ONSTOOD_DOWNLOAD:([0-9a-f-]{36})\|([^\]]+)\]\]|(\\\([^)]*\\\)|\$[^$\n]+\$|\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`\n]+`|\[[^\]\n]+\]\(https?:\/\/[^)\s]+\))/gi;
    const nodes = [];
    let cursor = 0;
    let match;
    let tokenIndex = 0;

    const pushPlain = plainValue => {
      if (!plainValue) return;
      nodes.push(
        <React.Fragment key={`${keyPrefix}-plain-${tokenIndex++}`}>
          {cleanPlainAcademicText(plainValue)}
        </React.Fragment>
      );
    };

    while ((match = tokenRx.exec(textValue)) !== null) {
      if (match.index > cursor) pushPlain(textValue.slice(cursor, match.index));

      if (match[1]) {
        const documentId = match[1];
        const label = decodeURIComponent(match[2]);
        nodes.push(
          <button
            key={`${keyPrefix}-download-${documentId}-${tokenIndex++}`}
            type="button"
            onClick={() => openOnstoodDocument(documentId)}
            className="onstood-ai-document-link"
          >
            {label}
          </button>
        );
      } else {
        const token = match[3] || '';
        const key = `${keyPrefix}-token-${tokenIndex++}`;

        if (token.startsWith('**') && token.endsWith('**')) {
          nodes.push(<strong key={key}>{cleanPlainAcademicText(token.slice(2, -2))}</strong>);
        } else if (token.startsWith('*') && token.endsWith('*')) {
          nodes.push(<em key={key}>{cleanPlainAcademicText(token.slice(1, -1))}</em>);
        } else if (token.startsWith('`') && token.endsWith('`')) {
          nodes.push(<code key={key} className="onstood-ai-inline-code">{token.slice(1, -1)}</code>);
        } else {
          const link = token.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
          if (link) {
            nodes.push(
              <a key={key} href={link[2]} target="_blank" rel="noreferrer" className="onstood-ai-link">
                {link[1]}
              </a>
            );
          } else {
            const mathValue = token.startsWith('\\(') ? token.slice(2, -2) : token.slice(1, -1);
            nodes.push(
              <span key={key} className="onstood-ai-inline-math">
                {cleanAcademicMath(mathValue)}
              </span>
            );
          }
        }
      }

      cursor = tokenRx.lastIndex;
    }

    if (cursor < textValue.length) pushPlain(textValue.slice(cursor));
    return nodes;
  }

  function renderAiText(value) {
    const lines = String(value || '').replace(/\r\n/g, '\n').split('\n');
    const blocks = [];
    let index = 0;

    const isTableDivider = line =>
      /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line || '');

    const tableCells = line =>
      String(line || '')
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map(cell => cell.trim());

    while (index < lines.length) {
      const rawLine = lines[index];
      const line = rawLine.trim();

      if (!line) {
        index += 1;
        continue;
      }

      const fencedCode = line.match(/^```([A-Za-z0-9_+.#-]*)\s*$/);
      if (fencedCode) {
        const codeLines = [];
        let cursor = index + 1;
        while (cursor < lines.length && !/^```\s*$/.test(lines[cursor].trim())) {
          codeLines.push(lines[cursor]);
          cursor += 1;
        }
        blocks.push(
          <pre key={`code-${index}`} className="onstood-ai-code-block" data-language={fencedCode[1] || undefined}>
            <code>{codeLines.join('\n')}</code>
          </pre>
        );
        index = cursor < lines.length ? cursor + 1 : cursor;
        continue;
      }

      const heading = line.match(/^(#{1,4})\s+(.+)$/);
      if (heading) {
        const level = Math.min(4, heading[1].length);
        const Tag = `h${level}`;
        blocks.push(
          <Tag key={`h-${index}`} className={`onstood-ai-heading level-${level}`}>
            {renderAcademicInline(heading[2], `h-${index}`)}
          </Tag>
        );
        index += 1;
        continue;
      }

      if (/^(-{3,}|_{3,}|\*{3,})$/.test(line)) {
        blocks.push(<hr key={`hr-${index}`} className="onstood-ai-divider" />);
        index += 1;
        continue;
      }

      if (line.startsWith('\\[')) {
        const mathLines = [line.replace(/^\\\[/, '')];
        let cursor = index;

        while (cursor < lines.length && !lines[cursor].trim().endsWith('\\]')) {
          cursor += 1;
          if (cursor < lines.length) mathLines.push(lines[cursor].trim());
        }

        const joined = mathLines.join(' ').replace(/\\\]$/, '').trim();
        blocks.push(
          <div key={`math-${index}`} className="onstood-ai-display-math">
            {cleanAcademicMath(joined)}
          </div>
        );
        index = Math.min(cursor + 1, lines.length);
        continue;
      }

      if (
        line.includes('|') &&
        index + 1 < lines.length &&
        isTableDivider(lines[index + 1])
      ) {
        const headers = tableCells(rawLine);
        const rows = [];
        let cursor = index + 2;

        while (cursor < lines.length && lines[cursor].trim().includes('|')) {
          const rowLine = lines[cursor].trim();
          if (!rowLine || isTableDivider(rowLine)) break;
          rows.push(tableCells(rowLine));
          cursor += 1;
        }

        blocks.push(
          <div key={`table-wrap-${index}`} className="onstood-ai-table-wrap">
            <table className="onstood-ai-table">
              <thead>
                <tr>
                  {headers.map((cell, cellIndex) => (
                    <th key={`th-${index}-${cellIndex}`}>
                      {renderAcademicInline(cell, `th-${index}-${cellIndex}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={`tr-${index}-${rowIndex}`}>
                    {headers.map((_, cellIndex) => (
                      <td key={`td-${index}-${rowIndex}-${cellIndex}`}>
                        {renderAcademicInline(row[cellIndex] || '', `td-${index}-${rowIndex}-${cellIndex}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        index = cursor;
        continue;
      }

      const unordered = line.match(/^[-*+]\s+(.+)$/);
      const ordered = line.match(/^\d+[.)]\s+(.+)$/);
      if (unordered || ordered) {
        const orderedList = Boolean(ordered);
        const items = [];
        let cursor = index;

        while (cursor < lines.length) {
          const candidate = lines[cursor].trim();
          const match = orderedList
            ? candidate.match(/^\d+[.)]\s+(.+)$/)
            : candidate.match(/^[-*+]\s+(.+)$/);
          if (!match) break;
          items.push(match[1]);
          cursor += 1;
        }

        const ListTag = orderedList ? 'ol' : 'ul';
        blocks.push(
          <ListTag key={`list-${index}`} className="onstood-ai-list">
            {items.map((item, itemIndex) => (
              <li key={`li-${index}-${itemIndex}`}>
                {renderAcademicInline(item, `li-${index}-${itemIndex}`)}
              </li>
            ))}
          </ListTag>
        );
        index = cursor;
        continue;
      }

      const quote = line.match(/^>\s?(.*)$/);
      if (quote) {
        blocks.push(
          <blockquote key={`quote-${index}`} className="onstood-ai-quote">
            {renderAcademicInline(quote[1], `quote-${index}`)}
          </blockquote>
        );
        index += 1;
        continue;
      }

      const paragraphLines = [line];
      let cursor = index + 1;

      while (cursor < lines.length) {
        const candidate = lines[cursor].trim();
        if (!candidate) break;
        if (/^```/.test(candidate)) break;
        if (/^(#{1,4})\s+/.test(candidate)) break;
        if (/^(-{3,}|_{3,}|\*{3,})$/.test(candidate)) break;
        if (/^[-*+]\s+/.test(candidate) || /^\d+[.)]\s+/.test(candidate)) break;
        if (/^>\s?/.test(candidate) || candidate.startsWith('\\[')) break;
        if (candidate.includes('|') && cursor + 1 < lines.length && isTableDivider(lines[cursor + 1])) break;
        paragraphLines.push(candidate);
        cursor += 1;
      }

      blocks.push(
        <p key={`p-${index}`} className="onstood-ai-paragraph">
          {renderAcademicInline(paragraphLines.join(' '), `p-${index}`)}
        </p>
      );
      index = cursor;
    }

    return <div className="onstood-ai-answer">{blocks}</div>;
  }

  function isExamRevisionIntent(value) {
    const textValue = String(value || '').toLowerCase();

    return /\b(exam|midterm|finals?|test|revision|study guide|study plan|prepare me|exam prep|review for|key points|important topics|provim|provimi|perserit|përsërit|permbledh|përmbledh)\b/i.test(
      textValue
    );
  }

  function isAdvancedValueIntent(value) {
    const textValue = String(value || '').trim().toLowerCase();

    if (!textValue) {
      return false;
    }

    if (isExamRevisionIntent(textValue)) {
      return true;
    }

    // Selected passages/documents and larger study requests benefit from
    // deeper synthesis, so Standard may discreetly offer Advanced.
    if (textValue.length >= 220) {
      return true;
    }

    return /\b(selected text|document|notes?|material|lesson|chapter|course|summary|summarize|analyse|analyze|analysis|compare|explain in detail|detailed explanation|study material|tekst(?:in)? e zgjedhur|dokument|material(?:in)?|kapitull|leksion|kurs|përmbledh|permbledh|analiz|shpjego me hollësi|shpjego ne detaje|shpjego në detaje)\b/i.test(
      textValue
    );
  }

  function buildAdvancedExamPrompt(value) {
    const originalRequest =
      String(value || '').trim();

    if (isExamRevisionIntent(originalRequest)) {
      return [
        'Create an Advanced ONSTOOD AI exam revision from this request.',
        'Go deeper than a standard summary: organize the must-know topics, key concepts, likely exam questions, model answers, common mistakes and a practical revision plan.',
        '',
        `Original request: ${originalRequest}`
      ].join('\n');
    }

    return [
      'Analyze this request with Advanced ONSTOOD AI.',
      'Give a deeper, more detailed explanation and organize the important ideas clearly. Add useful connections, examples and study guidance where relevant.',
      '',
      `Original request: ${originalRequest}`
    ].join('\n');
  }

  function buildAdvancedUpgradePrompt(value) {
    const originalRequest = String(value || '').trim();
    if (!originalRequest) return '';
    return [
      'Regenerate the answer from the beginning with Advanced ONSTOOD AI.',
      'Give the most complete, rigorous and detailed answer that is useful for a university student. Do not continue from or refer to a previous truncated Standard answer.',
      'Structure the response clearly, cover the full scope of the request, explain important details, dates, causes, consequences, examples and connections where relevant, and do not stop mid-section.',
      '',
      `Original request: ${originalRequest}`
    ].join('\n');
  }

  function previousUserQuestion(messageIndex) {
    for (let index = messageIndex - 1; index >= 0; index -= 1) {
      if (messages[index]?.role === 'user') return String(messages[index]?.content || '').trim();
    }
    return '';
  }

  function shouldRecommendAdvanced(data) {
    if (!data || data.mode === 'advanced') return false;
    const adaptive = data.adaptive || {};
    return Boolean(adaptive.output_cap_hit || adaptive.complexity === 'complex');
  }

  function getExamUpgradeQuestion() {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];

      if (
        message?.role !== 'assistant' ||
        message?.mode !== 'standard'
      ) {
        continue;
      }

      // The response-specific Advanced recommendation rendered directly
      // under the answer supersedes the older generic exam/depth prompt.
      if (message?.response_meta?.advanced_recommended === true) {
        return null;
      }

      for (let userIndex = index - 1; userIndex >= 0; userIndex -= 1) {
        const userMessage = messages[userIndex];

        if (userMessage?.role !== 'user') {
          continue;
        }

        if (
          userMessage?.mode === 'standard' &&
          isAdvancedValueIntent(userMessage?.content)
        ) {
          return userMessage.content;
        }

        return null;
      }
    }

    return null;
  }

  async function loadUsage() {
    const { data, error } = await supabase.rpc('get_ai_usage');
    if (!error) {
      const row = Array.isArray(data) ? data[0] : data;
      setUsage({ standard_count: Number(row?.standard_used || 0), advanced_count: Number(row?.advanced_used || 0) });
      setPlan({ plan_code: row?.plan_code || 'free', standard_limit: Number(row?.standard_limit ?? 5), advanced_limit: Number(row?.advanced_limit ?? 0), monthly_price_eur: Number(row?.monthly_price_eur ?? 0) });
      setPlanLoaded(true);
      onUsageChanged?.();
    } else {
      setPlanLoaded(true);
    }
  }

  async function loadConversations(preferredId = null) {
    const { data, error } = await supabase
      .from('ai_conversations')
      .select('id,title,created_at,updated_at')
      .eq('user_id', profile.id)
      .order('updated_at', { ascending: false });

    if (error) return;

    const rows = data || [];
    setConversations(rows);

    // History stays available, but opening ONSTOOD AI starts with a clean chat.
    // A conversation is loaded only when the user explicitly selects it
    // or when a new question creates a conversation.
    if (preferredId) {
      setConversationId(preferredId);
    }
  }

  async function loadMessages(id) {
    if (!id) {
      setMessages([]);
      focusInput();
      return;
    }
    const { data, error } = await supabase
      .from('ai_messages')
      .select('id,role,mode,content,response_meta,created_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });
    if (!error) setMessages(data || []);
    focusInput();
    scrollChat();
  }

  async function loadSuggestions() {
    const [docsResult, eventsResult, postsResult, academicResult] = await Promise.all([
      supabase.from('documents').select('id,user_id,file_name,created_at,visibility,knowledge_consent').order('created_at', { ascending: false }).limit(20),
      supabase.from('calendar_events').select('id,title,starts_at,location').eq('user_id', profile.id).gte('starts_at', new Date().toISOString()).order('starts_at', { ascending: true }).limit(6),
      supabase.from('posts').select('id,user_id,body,created_at,audience,knowledge_consent').order('created_at', { ascending: false }).limit(20),
      supabase.from('academic_knowledge_items').select('id,title,abstract_text,institution,country,source_url,language,topics,published_at').eq('is_active', true).order('quality_score', { ascending: false }).limit(20)
    ]);

    const studyProfile = [profile?.degree, profile?.faculty, profile?.university]
      .filter(Boolean).join(' ').toLowerCase();
    const tokens = studyProfile.split(/[^\p{L}\p{N}]+/u).filter(x => x.length >= 3);
    const relevance = value => {
      const hay = String(value || '').toLowerCase();
      return tokens.reduce((score, token) => score + (hay.includes(token) ? 4 : 0), 0);
    };

    const local = [];
    (eventsResult.data || []).forEach(item => local.push({ id: item.id, sourceType: 'calendar_event', kind: 'Upcoming', title: item.title, context: [item.title, item.location].filter(Boolean).join(' — '), meta: item.location || new Date(item.starts_at).toLocaleString(), score: relevance(`${item.title} ${item.location}`) }));
    // Suggestion privacy is stricter than ordinary visibility: content from other people
    // may appear here only when it is Public. Connections-only content stays available
    // in its normal surface, but is never surfaced as an AI preview/recommendation.
    (docsResult.data || [])
      .filter(item => item.user_id === profile.id || item.visibility === 'public')
      .forEach(item => local.push({
        id: item.id,
        sourceType: 'document',
        kind: item.user_id === profile.id ? 'Your document' : 'Public document',
        title: item.file_name,
        context: item.file_name,
        meta: item.user_id === profile.id ? 'Your OnStood material' : 'Public on OnStood',
        score: relevance(item.file_name)
      }));
    (postsResult.data || [])
      .filter(item => item.body?.trim() && (item.user_id === profile.id || item.audience === 'public'))
      .forEach(item => local.push({
        id: item.id,
        sourceType: 'post',
        kind: item.user_id === profile.id ? 'Your post' : 'Public post',
        title: item.body.trim().slice(0, 90),
        context: item.body.trim(),
        meta: item.user_id === profile.id ? 'Your OnStood post' : 'Public on OnStood',
        score: relevance(item.body)
      }));

    const international = (academicResult.data || []).map(item => ({
      id: item.id, sourceType: 'academic', kind: 'Global academic',
      title: item.title, context: [item.title, item.abstract_text].filter(Boolean).join(' — '),
      meta: [item.institution, item.country].filter(Boolean).join(' · ') || 'Verified academic source',
      sourceUrl: item.source_url, originalLanguage: item.language,
      score: relevance(`${item.title} ${item.abstract_text || ''} ${(item.topics || []).join?.(' ') || ''}`) + 2
    })).sort((a,b) => b.score - a.score);

    local.sort((a,b) => b.score - a.score);
    // Target mix: roughly 60–70% ONSTOOD/local relevance and 30–40% international
    // academic discovery, while always preferring the student's field when metadata permits.
    const mixed = [...local.slice(0, 8), ...international.slice(0, 4)]
      .sort((a,b) => b.score - a.score || Math.random() - .5);
    setSuggestions(mixed.slice(0, 12));
  }

  useEffect(() => {
    if (!profile?.id) return;

    // Opening OnStood AI should always start below the fixed application header,
    // never halfway down an old scroll position from another section.
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

    // Every fresh AI screen opens as a clean new chat.
    setConversationId(null);
    setMessages([]);
    setHistoryOpen(false);
    setHistorySearch('');

    const paypalResult = new URLSearchParams(window.location.search).get('paypal');
    if (paypalResult === 'success') {
      setBillingNotice('Returned from PayPal. Checking your plan activation…');
      [1200, 3000, 6000].forEach(delay => window.setTimeout(() => loadUsage(), delay));
      const url = new URL(window.location.href);
      url.searchParams.delete('paypal');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    } else if (paypalResult === 'cancelled') {
      setBillingNotice('Payment was cancelled. No new subscription was activated.');
      const url = new URL(window.location.href);
      url.searchParams.delete('paypal');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    }

    loadUsage();
    loadConversations();
    loadSuggestions();
    focusInput();
  }, [profile?.id]);

  useEffect(() => {
    loadMessages(conversationId);
  }, [conversationId]);

  useEffect(() => {
    if (suggestions.length <= 1) return;
    const timer = window.setInterval(() => {
      setSuggestionIndex(current => (current + 1) % suggestions.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [suggestions.length]);

  async function ensureConversation(question) {
    if (conversationId) return conversationId;
    const title = question.trim().slice(0, 52) || 'ONSTOOD AI';
    const { data, error } = await supabase
      .from('ai_conversations')
      .insert({ user_id: profile.id, title })
      .select('id')
      .single();
    if (error) throw error;
    setConversationId(data.id);
    await loadConversations(data.id);
    return data.id;
  }

  async function searchOnstoodKnowledge(question) {
    try {
      const { data, error } = await supabase.functions.invoke(
        'onstood-knowledge-search',
        { body: { query: String(question || '').slice(0, 1200) } }
      );
      if (error) {
        console.warn('OnStood Knowledge search:', error);
        return { results: [], downloads: [] };
      }
      return {
        results: Array.isArray(data?.results) ? data.results : [],
        downloads: Array.isArray(data?.downloads) ? data.downloads : []
      };
    } catch (error) {
      console.warn('OnStood Knowledge search:', error);
      return { results: [], downloads: [] };
    }
  }

  function knowledgeTypeLabel(value) {
    if (value === 'original_hypothesis') {
      return 'Student hypothesis · unverified';
    }
    if (value === 'student_interpretation') {
      return 'Student interpretation';
    }
    if (value === 'supported_academic') {
      return 'Academic study material';
    }
    if (value === 'administrative_reference') {
      return 'Reference material';
    }
    if (value === 'historical') {
      return 'Historical material';
    }
    return 'Community knowledge';
  }


  function knowledgeBudget(question) {
    const text = String(question || '').trim();
    const words = text.split(/\s+/).filter(Boolean).length;
    const complexIntent = /(compare|krahas|analyse|analy|analiz|exam|provim|test|model|essay|ese|research|kërkim|explain in detail|shpjego në detaje|table|tabel|argument|evaluate|vlerëso)/i.test(text);
    const exactDocumentIntent = /(law|ligj|article|neni|document|dokument|pdf|download|shkarko)/i.test(text);
    if (complexIntent || words >= 55) return { maxSources: 5, maxPerSource: 1200, maxContext: 6000 };
    if (exactDocumentIntent || words >= 24) return { maxSources: 4, maxPerSource: 1900, maxContext: 6000 };
    return { maxSources: 3, maxPerSource: 900, maxContext: 3000 };
  }

  function uniqueKnowledgeMatches(results, question = '') {
    if (!Array.isArray(results)) return [];
    const budget = knowledgeBudget(question);
    const unique = [];
    const seen = new Set();
    const ranked = [...results].sort((a, b) =>
      Number(b?.context_priority || b?.rank || 0) - Number(a?.context_priority || a?.rank || 0)
    );
    for (const item of ranked) {
      const excerpt = String(item?.excerpt || '').trim();
      const title = String(item?.title || item?.file_name || '').trim();
      const titleScore = Number(item?.title_match_score || 0);
      const metadataOnlyExactCandidate = !excerpt && title && titleScore >= 12;
      const readable = item?.content_readable !== false;
      if ((!excerpt || !readable) && !metadataOnlyExactCandidate) continue;
      const key = `${item?.source_type || ''}:${item?.source_id || item?.document_id || ''}:${title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(item);
      if (unique.length >= budget.maxSources) break;
    }
    return unique;
  }


  function buildKnowledgeContext(results, downloads = [], question = '') {
    const budget = knowledgeBudget(question);
    const unique = uniqueKnowledgeMatches(results, question);
    const downloadableIds = new Set((Array.isArray(downloads) ? downloads : []).map(item => String(item?.document_id || '')).filter(Boolean));
    return unique.map((item, index) => {
      const excerpt = String(item?.excerpt || '')
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
        .slice(0, budget.maxPerSource);
      const sourceId = String(item?.source_id || item?.document_id || '');
      const downloadable = downloadableIds.has(sourceId) || item?.download_available === true;
      return [
        `SOURCE ${index + 1}`,
        `Title: ${item?.title || item?.file_name || 'Student contribution'}`,
        `Type: ${knowledgeTypeLabel(item?.knowledge_type)}`,
        `Quality: ${item?.quality_status || 'accepted'}`,
        `Relevance priority: ${Number(item?.context_priority || item?.rank || 0).toFixed(2)}`,
        `Exact-title score: ${Number(item?.title_match_score || 0)}`,
        `Original file available to student: ${downloadable ? 'yes' : 'no'}`,
        excerpt ? `Excerpt:\n${excerpt}` : 'Excerpt: unavailable or unreadable; use the title/identifier only for identity verification and do not invent document text.'
      ].join('\n');
    }).join('\n\n').slice(0, budget.maxContext);
  }

  function appendDownloadActions(answer, downloads) {
    const usable = (Array.isArray(downloads) ? downloads : [])
      .filter(item => item?.document_id && item?.file_name && Number(item?.title_match_score || 0) >= 12)
      .slice(0, 2);
    if (!usable.length) return String(answer || '');
    const lines = usable.map(item => {
      const label = `Klikoni këtu për të shkarkuar ${item.file_name}`;
      return `[[ONSTOOD_DOWNLOAD:${item.document_id}|${encodeURIComponent(label)}]]`;
    });
    return [String(answer || '').trim(), '', usable.length === 1 ? 'Dokumenti origjinal është i disponueshëm:' : 'Dokumentet origjinale janë të disponueshme:', ...lines].filter(Boolean).join('\n');
  }



  async function send(
    event,
    forcedMode = 'standard',
    forcedQuestion = null,
    privacyScope = 'user_prompt'
  ) {
    event?.preventDefault?.();
    const question = String(forcedQuestion ?? text).trim();
    if (!question || busy) return;
    const questionMode = forcedMode === 'advanced' ? 'advanced' : 'standard';

    if (questionMode === 'standard' && standardLeft <= 0) {
      setMessages(current => [...current, { id: `quota-${Date.now()}`, role: 'assistant', mode: 'standard', content: 'Your 5 free Ask AI questions are finished. They refresh at 12:00 PM.' }]);
      focusInput();
      return;
    }
    if (questionMode === 'advanced' && !isPro) {
      setMessages(current => [...current, { id: `quota-${Date.now()}`, role: 'assistant', mode: 'advanced', content: 'Advanced AI is available with the Advanced plan at €16.99/month.' }]);
      focusInput();
      return;
    }
    if (questionMode === 'advanced' && advancedLeft <= 0) {
      setMessages(current => [...current, { id: `quota-${Date.now()}`, role: 'assistant', mode: 'advanced', content: 'Your Advanced AI allowance is finished. It refreshes at 12:00 PM.' }]);
      focusInput();
      return;
    }

    setBusy(true);
    setText('');
    try {
      const activeId = await ensureConversation(question);
      const userMessage = { conversation_id: activeId, user_id: profile.id, role: 'user', mode: questionMode, content: question };
      const { data: savedUser, error: saveUserError } = await supabase.from('ai_messages').insert(userMessage).select('id,role,mode,content,response_meta,created_at').single();
      if (saveUserError) throw saveUserError;
      setMessages(current => [...current, savedUser]);
      scrollChat();

      const knowledge = await searchOnstoodKnowledge(question);
      const knowledgeMatches = knowledge.results;
      const downloads = knowledge.downloads;
      const knowledgeContext = buildKnowledgeContext(knowledgeMatches, downloads, question);

      const { data, error } = await supabase.functions.invoke('onstood-ai', {
        body: {
          message: question,
          mode: questionMode,
          knowledge_context: knowledgeContext || undefined,
          knowledge_source_count: uniqueKnowledgeMatches(knowledgeMatches, question).length,
          answer_language: answerLanguage,
          conversation_id: activeId
        }
      });

      if (error || !data?.answer) {
        if (data?.code === 'AI_QUOTA_REACHED') await loadUsage();
        throw new Error(data?.error || error?.message || "Sorry, we couldn't complete the AI request.");
      }

      // Always refresh from the authoritative quota RPC after a successful answer.
      // This prevents the visible counter from staying one question behind.
      await loadUsage();

      const answer = appendDownloadActions(data.answer, downloads);
      const advancedRecommended = questionMode === 'standard' && shouldRecommendAdvanced(data);
      const { data: savedAi, error: saveAiError } = await supabase.from('ai_messages').insert({
        conversation_id: activeId,
        user_id: profile.id,
        role: 'assistant',
        mode: questionMode,
        content: answer,
        response_meta: {
          advanced_recommended: advancedRecommended,
          output_cap_hit: Boolean(data?.adaptive?.output_cap_hit),
          complexity: data?.adaptive?.complexity || null
        }
      }).select('id,role,mode,content,response_meta,created_at').single();
      if (saveAiError) throw saveAiError;
      setMessages(current => [...current, savedAi]);
      await supabase.from('ai_conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeId);
      await loadConversations(activeId);
    } catch (error) {
      setMessages(current => [...current, { id: `error-${Date.now()}`, role: 'assistant', mode: questionMode, content: error?.message || "Sorry, we couldn't complete the AI request." }]);
    } finally {
      setBusy(false);
      focusInput();
    }
  }

  function buildSuggestionQuestion(item) {
    if (!item) return '';
    const source = String(item.context || item.title || '').trim();
    if (!source) return '';
    return `Explain this ONSTOOD material and help me understand it:\n\n${source}`;
  }

  function chooseSuggestion(item) {
    setSelectedSuggestion(item);
  }

  function askSelectedSuggestion(
    event,
    mode = 'standard'
  ) {
    event?.preventDefault?.();

    if (!selectedSuggestion || busy) {
      return;
    }

    const question =
      buildSuggestionQuestion(
        selectedSuggestion
      );

    if (!question) {
      return;
    }

    setText(question);

    send(
      event,
      mode === 'advanced'
        ? 'advanced'
        : 'standard',
      question,
      'onstood_content'
    );

    setSelectedSuggestion(null);
  }



  function estimateCreatorProject() {
    const nums = String(creatorForm.pages || '').match(/\d+/g)?.map(Number) || [];
    const pageTarget = nums.length > 1 ? (nums[0] + nums[1]) / 2 : (nums[0] || 8);
    const targetWords = Math.max(900, Math.round(pageTarget * 330));
    const slideNums = String(creatorForm.slides || '').match(/\d+/g)?.map(Number) || [];
    const targetSlides = slideNums.length > 1 ? Math.round((slideNums[0] + slideNums[1]) / 2) : (slideNums[0] || 10);
    const wantsWord = creatorForm.output !== 'ppt';
    const wantsPpt = creatorForm.output !== 'word';
    const paperCalls = wantsWord ? Math.max(1, Math.ceil(targetWords / 1450)) : 0;
    const presentationCalls = wantsPpt ? 1 : 0;
    return { targetWords, targetSlides, paperCalls, presentationCalls, units: Math.max(1, paperCalls + presentationCalls) };
  }

  async function invokeCreatorStage(message, context, sourceCount) {
    const { data, error } = await supabase.functions.invoke('onstood-ai', { body: {
      message, mode:'advanced', knowledge_context: context || undefined,
      knowledge_source_count: sourceCount, answer_language:'auto', privacy_scope:'academic_creator'
    }});
    if (error || !data?.answer) throw new Error(data?.error || error?.message || 'Academic Creator could not complete this stage.');
    return parseCreatorJson(data.answer);
  }

  function mergeCreatorParts(parts, slidesPart, targetWords) {
    const first = parts[0] || {};
    const uniq = arr => [...new Map((arr||[]).filter(Boolean).map(v => [typeof v === 'string' ? v.trim().toLowerCase() : JSON.stringify(v), v])).values()];
    const merged = {
      title: first.title || creatorForm.topic,
      subtitle: first.subtitle || '', abstract: first.abstract || '', keywords: uniq(parts.flatMap(p=>p.keywords||[])),
      sections: parts.flatMap(p=>p.sections||[]),
      conclusion: [...parts].reverse().find(p=>p.conclusion)?.conclusion || '',
      references: uniq(parts.flatMap(p=>p.references||[])),
      figures: parts.flatMap(p=>p.figures||[]), tables: parts.flatMap(p=>p.tables||[]), formulas: parts.flatMap(p=>p.formulas||[]),
      slides: slidesPart?.slides || [],
      academic_note: `Multi-stage Advanced AI academic package. Target ≈ ${targetWords.toLocaleString()} substantive words. Sources must remain traceable and verifiable.`
    };
    return parseCreatorJson(JSON.stringify(merged));
  }

  async function runAcademicCreator(planInfo) {
    if (creatorBusy) return;
    if (!isPro || advancedLeft < planInfo.units) { setCreatorPlanConfirm(null); setUpgradeOpen(true); return; }
    setCreatorBusy(true); setCreatorResult(null); setCreatorPlanConfirm(null);
    try {
      const knowledge = await searchOnstoodKnowledge(`${creatorForm.topic} ${creatorForm.focus}`);
      const matches = uniqueKnowledgeMatches(knowledge.results, `${creatorForm.topic} ${creatorForm.focus}`);
      const context = buildKnowledgeContext(knowledge.results, knowledge.downloads, `${creatorForm.topic} ${creatorForm.focus}`);
      const base = [
        'You are ONSTOOD Academic Creator, an advanced academic research-writing engine.',
        `Topic: ${creatorForm.topic.trim()}`, `Focus: ${creatorForm.focus.trim()}`,
        creatorForm.brief.trim() ? `Student direction: ${creatorForm.brief.trim()}` : '',
        `Academic level: ${creatorForm.level}`, `Citation style: ${creatorForm.citation}`,
        `Citation display: ${creatorForm.citationDisplay}`, `Output language: ${creatorForm.language}`,
        'Use rigorous academic reasoning: define concepts, compare evidence, distinguish correlation from causality, state assumptions, discuss limitations, and avoid unsupported certainty.',
        'Never invent authors, titles, journals, DOI values, URLs, datasets, quotations, statistics, institutions or findings. Cite only traceable sources present in supplied OnStood Knowledge context. If evidence is unavailable, say so instead of fabricating it.',
        creatorForm.citationDisplay === 'Numbered footnotes' ? 'Use numeric citation markers [1], [2] in prose and return complete matching references.' : `Use academically correct in-text citations for ${creatorForm.citation} and return complete matching references.`,
        'When quantitatively relevant, include useful tables, worked examples, charts/figure specifications and formulas. Every formula must define symbols and units; every table/figure must have a title, source_note, and a sentence explaining what it demonstrates. Never invent numeric data just to make a chart.',
        'Return ONLY valid JSON, no markdown fences and no prose outside JSON.'
      ].filter(Boolean).join('\n');
      const parts=[];
      for (let i=0;i<planInfo.paperCalls;i++) {
        setCreatorProgress(`Academic paper · stage ${i+1}/${planInfo.paperCalls}`);
        const from = Math.round((i/planInfo.paperCalls)*100), to = Math.round(((i+1)/planInfo.paperCalls)*100);
        const prompt = `${base}\nThis is PAPER STAGE ${i+1} of ${planInfo.paperCalls}, covering approximately ${from}%–${to}% of the paper. ${i===0?'Establish title, abstract, keywords, research framing and the first analytical sections.':'Continue with NEW sections only; do not repeat earlier material.'} ${i===planInfo.paperCalls-1?'Complete synthesis, limitations and conclusion.':''}\nAim for 1200–1550 substantive words in this stage.\nJSON schema: {"title":"","subtitle":"","abstract":"","keywords":[],"sections":[{"title":"","level":1,"paragraphs":["developed academic prose with citations"],"bullets":[],"table":{"title":"","headers":[],"rows":[],"source_note":""},"formula":{"expression":"","symbols":["x = definition (unit)"],"explanation":""}}],"figures":[{"title":"","type":"bar|line|conceptual","labels":[],"values":[],"series_name":"","source_note":"","interpretation":""}],"conclusion":"","references":["complete traceable citation"],"academic_note":""}. Omit tables/formulas/figures when they are not analytically justified.`;
        parts.push(await invokeCreatorStage(prompt, context, matches.length));
      }
      let slidesPart={slides:[]};
      if (planInfo.presentationCalls) {
        setCreatorProgress('Academic presentation · final stage');
        const paperDigest = parts.flatMap(p=>(p.sections||[]).map(s=>`${s.title}: ${(s.paragraphs||[]).join(' ').slice(0,900)}`)).join('\n').slice(0,9000);
        const refs = [...new Set(parts.flatMap(p=>p.references||[]))].slice(0,24);
        const prompt = `${base}\nBuild a REAL university presentation from the completed paper below. Do not paste paper paragraphs onto slides. Target exactly ${planInfo.targetSlides} slides (±1 only if academically necessary). Include title, research question/purpose, context/literature, method/analytical approach, core evidence/analysis, findings, implications/limitations, conclusion and references. Use 3–5 concise bullets per content slide. Include charts/tables/figures only where supported by supplied evidence.\nPAPER DIGEST:\n${paperDigest}\nVERIFIED REFERENCE LIST:\n${refs.join('\n')}\nJSON schema: {"title":"","slides":[{"title":"","subtitle":"","bullets":[],"takeaway":"","speaker_notes":"","source_note":"","visual":{"type":"none|bar|line|table|formula|process","title":"","labels":[],"values":[],"headers":[],"rows":[],"expression":"","source_note":""}}],"references":[]}.`;
        slidesPart = await invokeCreatorStage(prompt, context, matches.length);
      }
      const merged = mergeCreatorParts(parts, slidesPart, planInfo.targetWords);
      merged.quality = creatorQualityReport(merged, creatorForm.pages, creatorForm.slides);
      setCreatorResult(merged); await loadUsage();
    } catch (error) { setBillingNotice(error?.message || 'Academic Creator could not complete the work.'); await loadUsage(); }
    finally { setCreatorBusy(false); setCreatorProgress(''); }
  }

  async function generateAcademicCreator(event) {
    event?.preventDefault?.();
    if (creatorBusy || !creatorForm.topic.trim() || !creatorForm.focus.trim()) return;
    const estimate = estimateCreatorProject();
    if (!isPro || advancedLeft < estimate.units) { setUpgradeOpen(true); return; }
    setCreatorPlanConfirm(estimate);
  }

  function downloadCreator(kind) {
    if (!creatorResult) return;
    const title = creatorResult.title || creatorForm.topic || 'OnStood Academic Work';
    if (kind === 'word') downloadDocx(title, creatorResult, title, { template: creatorForm.template, pages: creatorForm.pages });
    if (kind === 'ppt') downloadPptx(title, creatorResult.slides || [], title, { template: creatorForm.template });
  }

  const filteredHistory = conversations.filter(item => (item.title || '').toLowerCase().includes(historySearch.toLowerCase()));
  const activeSuggestion = suggestions.length ? suggestions[suggestionIndex % suggestions.length] : null;

  return (
    <Page
      eyebrow="INTELLIGENCE LAYER"
      title={<><OnstoodWordmark /> <span style={{ color: '#111827' }}>AI</span></>}
    >
      <style>{`
        .onstood-advanced-chip{
          width:190px; min-width:190px; min-height:48px; padding:0 14px;
          border-radius:14px; border:1px solid rgba(99,102,241,.30);
          background:
            radial-gradient(circle at 72% 50%,rgba(79,70,229,.24),transparent 34%),
            linear-gradient(135deg,rgba(8,15,35,.97),rgba(25,35,74,.96));
          color:#fff; position:relative; overflow:hidden; cursor:pointer;
          box-shadow:inset 0 0 20px rgba(96,165,250,.05),0 5px 18px rgba(30,41,59,.12);
          isolation:isolate;
        }
        .onstood-advanced-chip:disabled{opacity:.44;cursor:default}
        .onstood-chip-label{
          position:relative;z-index:5;display:flex;align-items:center;justify-content:center;
          gap:8px;white-space:nowrap;text-shadow:0 1px 7px rgba(0,0,0,.78);
        }
        .onstood-chip-title{
          font-size:11px;font-weight:750;letter-spacing:.9px;line-height:1;
        }
        .onstood-chip-count{
          min-width:27px;padding:3px 6px;border-radius:999px;
          border:1px solid rgba(191,219,254,.22);
          background:rgba(255,255,255,.055);
          font-size:9px;font-weight:800;letter-spacing:.2px;line-height:1;
          color:rgba(239,246,255,.92);
          box-shadow:inset 0 0 8px rgba(96,165,250,.05);
        }
        .onstood-chip-core{
          position:absolute;right:17px;top:11px;width:27px;height:27px;border-radius:5px;
          border:1px solid rgba(147,197,253,.20);
          background:linear-gradient(145deg,rgba(5,12,27,.46),rgba(30,64,175,.12));
          box-shadow:0 0 10px rgba(96,165,250,.08);opacity:.40;z-index:1;
        }
        .onstood-chip-core:before,.onstood-chip-core:after{
          content:"";position:absolute;inset:5px;border:1px solid rgba(147,197,253,.22);border-radius:2px;
        }
        .onstood-chip-core i{position:absolute;width:2px;height:4px;background:rgba(147,197,253,.25)}
        .onstood-chip-core i:nth-child(1){left:-4px;top:5px}.onstood-chip-core i:nth-child(2){left:-4px;bottom:5px}
        .onstood-chip-core i:nth-child(3){right:-4px;top:5px}.onstood-chip-core i:nth-child(4){right:-4px;bottom:5px}
        .onstood-chip-core i:nth-child(5){top:-4px;left:12px;width:4px;height:2px}.onstood-chip-core i:nth-child(6){bottom:-4px;left:12px;width:4px;height:2px}
        .onstood-chip-circuit{position:absolute;height:1px;background:rgba(96,165,250,.16);z-index:0}
        .onstood-chip-circuit:after{content:"";position:absolute;right:-4px;top:-2px;width:5px;height:5px;border:1px solid rgba(147,197,253,.18);border-radius:50%}
        .onstood-chip-circuit-a{width:72px;right:43px;top:15px;transform:rotate(-7deg)}
        .onstood-chip-circuit-b{width:82px;right:43px;top:24px}
        .onstood-chip-circuit-c{width:68px;right:43px;top:34px;transform:rotate(7deg)}
        .onstood-chip-circuit-d{width:42px;right:7px;top:24px}
        .onstood-chip-packet{
          position:absolute;width:13px;height:2px;border-radius:999px;
          background:rgba(191,219,254,.96);box-shadow:0 0 5px rgba(96,165,250,.95),0 0 10px rgba(99,102,241,.65);
          z-index:2;opacity:0;
        }
        .packet-a{top:14px;right:108px;animation:onstoodDataA 1.93s linear infinite}
        .packet-b{top:23px;right:119px;animation:onstoodDataB 2.4s linear .55s infinite}
        .packet-c{top:33px;right:106px;animation:onstoodDataC 2.13s linear 1.1s infinite}
        @keyframes onstoodDataA{0%{transform:translateX(-18px) rotate(-7deg);opacity:0}12%{opacity:.9}78%{opacity:.9}100%{transform:translateX(68px) rotate(-7deg);opacity:0}}
        @keyframes onstoodDataB{0%{transform:translateX(-10px);opacity:0}12%{opacity:.9}78%{opacity:.9}100%{transform:translateX(82px);opacity:0}}
        @keyframes onstoodDataC{0%{transform:translateX(-14px) rotate(7deg);opacity:0}12%{opacity:.85}78%{opacity:.85}100%{transform:translateX(66px) rotate(7deg);opacity:0}}
        .onstood-advanced-chip:not(:disabled):hover{
          border-color:rgba(129,140,248,.56);box-shadow:inset 0 0 24px rgba(96,165,250,.09),0 0 18px rgba(99,102,241,.16)
        }
        .onstood-advanced-chip:not(:disabled):hover .onstood-chip-core{opacity:.58}
        .onstood-advanced-chip:not(:disabled):active .onstood-chip-core{box-shadow:0 0 18px rgba(96,165,250,.35);opacity:.75}

        .onstood-standard-chip{
          width:50px;min-width:50px;min-height:48px;border-radius:14px;
          border:1px solid rgba(99,102,241,.22);
          background:linear-gradient(145deg,rgba(31,41,74,.96),rgba(49,46,129,.88));
          color:white;position:relative;overflow:hidden;cursor:pointer;
          display:grid;place-items:center;isolation:isolate;
          box-shadow:inset 0 0 14px rgba(96,165,250,.05),0 4px 12px rgba(30,41,59,.10);
        }
        .onstood-standard-chip:disabled{opacity:.45;cursor:default}
        .onstood-standard-chip svg{position:relative;z-index:5}
        .onstood-standard-core{
          position:absolute;width:18px;height:18px;border-radius:4px;
          border:1px solid rgba(191,219,254,.18);
          background:rgba(15,23,42,.26);opacity:.38;z-index:1;
          box-shadow:0 0 8px rgba(96,165,250,.08);
        }
        .onstood-standard-track{
          position:absolute;height:1px;width:43px;background:rgba(147,197,253,.14);z-index:0;
        }
        .track-a{left:3px;top:16px;transform:rotate(12deg)}
        .track-b{left:3px;bottom:15px;transform:rotate(-12deg)}
        .onstood-standard-packet{
          position:absolute;width:9px;height:2px;border-radius:999px;
          background:rgba(219,234,254,.94);
          box-shadow:0 0 5px rgba(96,165,250,.82),0 0 8px rgba(99,102,241,.48);
          z-index:2;opacity:0;
        }
        .standard-packet-a{left:2px;top:15px;animation:onstoodStandardA 3.3s linear infinite}
        .standard-packet-b{right:2px;bottom:14px;animation:onstoodStandardB 3.7s linear 1.25s infinite}
        @keyframes onstoodStandardA{
          0%{transform:translateX(-8px) rotate(12deg);opacity:0}
          15%{opacity:.82}78%{opacity:.82}
          100%{transform:translateX(39px) rotate(12deg);opacity:0}
        }
        @keyframes onstoodStandardB{
          0%{transform:translateX(8px) rotate(-12deg);opacity:0}
          15%{opacity:.78}78%{opacity:.78}
          100%{transform:translateX(-39px) rotate(-12deg);opacity:0}
        }
        .onstood-standard-chip:not(:disabled):hover{
          border-color:rgba(129,140,248,.48);
          box-shadow:inset 0 0 18px rgba(96,165,250,.08),0 0 14px rgba(99,102,241,.12);
        }
        @media(max-width:850px){.onstood-advanced-chip{width:154px;min-width:154px}.onstood-chip-title{font-size:9.5px;letter-spacing:.55px}.onstood-chip-label{gap:5px}.onstood-chip-count{padding:3px 5px}}

        .onstood-ai-answer{
          line-height:1.62;
          overflow-wrap:anywhere;
          font-size:14px;
          letter-spacing:.003em;
          user-select:text;
        }
        .onstood-ai-answer .onstood-ai-heading{
          margin:18px 0 8px;
          line-height:1.28;
          color:#0f172a;
          font-weight:850;
        }
        .onstood-ai-answer .onstood-ai-heading:first-child{margin-top:0}
        .onstood-ai-answer .level-1{font-size:1.28em}
        .onstood-ai-answer .level-2{font-size:1.17em}
        .onstood-ai-answer .level-3{font-size:1.08em}
        .onstood-ai-answer .level-4{font-size:1em}
        .onstood-ai-paragraph{margin:0 0 11px}
        .onstood-ai-list{margin:6px 0 12px;padding-left:24px}
        .onstood-ai-list li{margin:4px 0;padding-left:2px}
        .onstood-ai-divider{border:0;border-top:1px solid rgba(148,163,184,.30);margin:15px 0}
        .onstood-ai-inline-math{
          display:inline-block;
          padding:0 3px;
          font-family:"Cambria Math",Cambria,"Times New Roman",serif;
          font-size:1.03em;
          white-space:normal;
        }
        .onstood-ai-inline-code{
          font-family:"SFMono-Regular",Consolas,"Liberation Mono",monospace;
          font-size:.92em;padding:1px 5px;border-radius:5px;background:rgba(15,23,42,.055);
        }
        .onstood-ai-link{color:#1d4ed8;text-decoration:underline;text-underline-offset:2px}
        .onstood-ai-code-block{
          margin:12px 0 16px;padding:13px 15px;border:1px solid rgba(148,163,184,.28);
          border-radius:10px;background:#0f172a;color:#e2e8f0;overflow:auto;
          font-family:"SFMono-Regular",Consolas,"Liberation Mono",monospace;font-size:.91em;line-height:1.55;
          white-space:pre;tab-size:2;
        }
        .onstood-ai-display-math{
          margin:12px 0 16px;
          padding:11px 14px;
          border-radius:10px;
          background:rgba(15,23,42,.035);
          border:1px solid rgba(148,163,184,.20);
          font-family:"Cambria Math",Cambria,"Times New Roman",serif;
          font-size:1.04em;
          overflow-x:auto;
          white-space:nowrap;
        }
        .onstood-ai-table-wrap{overflow-x:auto;margin:10px 0 15px}
        .onstood-ai-table{width:100%;border-collapse:collapse;background:#fff;font-size:.96em}
        .onstood-ai-table th,.onstood-ai-table td{
          padding:8px 10px;border:1px solid rgba(148,163,184,.34);text-align:left;vertical-align:top;vertical-align:top;
        }
        .onstood-ai-table th{background:rgba(15,23,42,.045);font-weight:800;color:#0f172a}
        .onstood-ai-quote{
          margin:10px 0 14px;padding:8px 12px;border-left:3px solid rgba(99,102,241,.55);
          background:rgba(99,102,241,.045);font-style:italic;
        }
        .onstood-ai-document-link{
          border:0;padding:0;background:transparent;color:#168CFF;font:inherit;font-weight:800;
          text-decoration:underline;cursor:pointer;
        }
        @media(max-width:720px){
          .onstood-ai-answer{font-size:13.5px;line-height:1.58}
          .onstood-ai-display-math{white-space:normal}
          .onstood-ai-table th,.onstood-ai-table td{padding:7px 8px}
        }

        .onstood-ai-selection-toolbar{
          position:fixed;z-index:60000;display:flex;align-items:center;gap:6px;
          padding:6px;border-radius:14px;border:1px solid rgba(99,102,241,.20);
          background:rgba(255,255,255,.97);backdrop-filter:blur(14px);
          box-shadow:0 14px 38px rgba(15,23,42,.20);
        }
        .onstood-ai-selection-copy{
          width:34px;height:34px;border-radius:10px;border:1px solid rgba(148,163,184,.25);
          background:#fff;cursor:pointer;display:grid;place-items:center;color:#475569;
        }
        .onstood-ai-selection-chip{
          min-height:34px;padding:0 10px;border-radius:10px;position:relative;overflow:hidden;
          border:1px solid rgba(99,102,241,.30);cursor:pointer;isolation:isolate;
          display:inline-flex;align-items:center;gap:7px;font-size:10px;font-weight:850;letter-spacing:.45px;
          white-space:nowrap;
        }
        .onstood-ai-selection-chip.standard{
          color:#eef2ff;background:linear-gradient(145deg,rgba(31,41,74,.98),rgba(67,56,202,.93));
          box-shadow:inset 0 0 14px rgba(96,165,250,.07),0 0 13px rgba(99,102,241,.18);
        }
        .onstood-ai-selection-chip.advanced{
          color:#fff;background:radial-gradient(circle at 80% 50%,rgba(96,165,250,.22),transparent 28%),linear-gradient(135deg,#071126,#1d2853);
          box-shadow:inset 0 0 18px rgba(96,165,250,.08),0 0 17px rgba(99,102,241,.22);
        }
        .onstood-ai-selection-chip:disabled{opacity:.38;cursor:default;box-shadow:none}
        .onstood-ai-selection-chip:not(:disabled):hover{transform:translateY(-1px);box-shadow:inset 0 0 20px rgba(96,165,250,.12),0 0 22px rgba(99,102,241,.28)}
        .onstood-ai-selection-led{
          width:8px;height:8px;border-radius:50%;background:#93c5fd;
          box-shadow:0 0 5px #60a5fa,0 0 11px rgba(99,102,241,.95);
          animation:onstoodSelectionLed 1.7s ease-in-out infinite;position:relative;z-index:2;
        }
        .onstood-ai-selection-chip:disabled .onstood-ai-selection-led{background:#64748b;box-shadow:none;animation:none}
        .onstood-ai-selection-flow{
          position:absolute;left:-18px;bottom:5px;width:18px;height:1px;border-radius:99px;
          background:#bfdbfe;box-shadow:0 0 6px #60a5fa;opacity:0;
          animation:onstoodSelectionFlow 2.2s linear infinite;z-index:1;
        }
        .onstood-ai-selection-chip.advanced .onstood-ai-selection-flow{animation-duration:1.55s}
        .onstood-ai-selection-chip:disabled .onstood-ai-selection-flow{display:none}
        @keyframes onstoodSelectionLed{0%,100%{opacity:.52}50%{opacity:1}}
        @keyframes onstoodSelectionFlow{0%{transform:translateX(0);opacity:0}18%{opacity:.9}78%{opacity:.9}100%{transform:translateX(150px);opacity:0}}

        @media(max-width:720px){
          .onstood-ai-suggested-bar{min-height:48px!important;padding:6px 10px!important;gap:7px!important}
          .onstood-ai-suggested-label{font-size:8px!important;letter-spacing:.55px!important;max-width:72px;line-height:1.05}
          .onstood-ai-suggested-bar small{font-size:9px!important}
          .onstood-ai-suggested-bar b{font-size:11px!important}
        }
        @media(max-width:720px){
          .onstood-ai-selection-toolbar{max-width:calc(100vw - 16px);gap:4px;padding:5px}
          .onstood-ai-selection-chip{padding:0 7px;font-size:9px;letter-spacing:.2px}
          .onstood-ai-selection-copy{width:30px;height:30px}
        }
      
      .onstood-mini-chat-shell {
        min-width: 0 !important;
        overflow: hidden !important;
      }
      .onstood-mini-chat-shell .card { border-radius: 10px !important; }
      .onstood-mini-chat-shell button,
      .onstood-mini-chat-shell input,
      .onstood-mini-chat-shell textarea { font-size: 12.5px !important; }
      .onstood-mini-chat-shell input,
      .onstood-mini-chat-shell textarea {
        min-width: 0 !important;
        box-sizing: border-box !important;
      }
      .onstood-mini-chat-shell .btn {
        min-height: 31px !important;
        padding: 5px 8px !important;
        gap: 5px !important;
      }
      .onstood-mini-chat-shell .icon-btn {
        width: 30px !important;
        height: 30px !important;
        min-width: 30px !important;
        min-height: 30px !important;
        padding: 4px !important;
      }
      .onstood-mini-chat-shell small { font-size: 10px !important; }
      .onstood-mini-chat-shell img { max-width: 100% !important; }
`}</style>

      <section className="academic-creator-launch">
        <div className="academic-creator-copy"><span className="creator-kicker"><GraduationCap size={14}/> ACADEMIC CREATOR · ADVANCED AI</span><h2>Turn an idea into university-ready academic work.</h2><p>Build a course assignment, term paper or presentation with academic structure, source discipline and ready-to-download Word / PowerPoint files.</p><div className="creator-pills"><span>Academic structure</span><span>OnStood Knowledge</span><span>APA · Harvard · MLA · Chicago</span><span>DOCX + PPTX</span></div></div>
        <button className="creator-launch-btn" onClick={()=>setCreatorOpen(true)}><WandSparkles size={21}/><span><b>Create academic work</b><small>Powered by Advanced AI</small></span></button>
      </section>

      {creatorPlanConfirm && <div className="creator-confirm-overlay"><div className="creator-confirm-card"><span className="creator-kicker"><OnstoodWordmark/> ADVANCED PROJECT</span><h3>This academic project requires {creatorPlanConfirm.units} Advanced AI requests.</h3><p>OnStood will build it in separate academic stages so a long paper and presentation are not truncated.</p><div className="creator-confirm-metrics"><span><b>{advancedLeft}</b><small>available now</small></span><span><b>{creatorPlanConfirm.units}</b><small>used for project</small></span><span><b>{advancedLeft-creatorPlanConfirm.units}</b><small>remaining after</small></span></div><small>Target: ≈ {creatorPlanConfirm.targetWords.toLocaleString()} substantive words · {creatorPlanConfirm.targetSlides} slides. Each stage is charged only when it is actually sent.</small><div className="creator-confirm-actions"><button type="button" className="btn" onClick={()=>setCreatorPlanConfirm(null)}>Cancel</button><button type="button" className="btn primary" onClick={()=>runAcademicCreator(creatorPlanConfirm)}>Use {creatorPlanConfirm.units} & Create</button></div></div></div>}
      {creatorOpen && <div className="creator-overlay" onMouseDown={e=>{if(e.target===e.currentTarget&&!creatorBusy)setCreatorOpen(false)}}><div className="creator-modal">
        <div className="creator-modal-head"><div><span className="creator-kicker"><OnstoodWordmark/> ACADEMIC CREATOR</span><h2>Create something worth presenting.</h2></div><button className="icon-btn" onClick={()=>!creatorBusy&&setCreatorOpen(false)}><X size={18}/></button></div>
        <form onSubmit={generateAcademicCreator} className="creator-form">
          <div className="creator-kind"><button type="button" className={creatorForm.kind==='assignment'?'active':''} onClick={()=>setCreatorForm(v=>({...v,kind:'assignment'}))}><FileText size={20}/><b>Course Assignment</b><small>Structured academic paper</small></button><button type="button" className={creatorForm.kind==='presentation'?'active':''} onClick={()=>setCreatorForm(v=>({...v,kind:'presentation'}))}><Presentation size={20}/><b>Presentation</b><small>Presentation-ready deck</small></button></div>
          <label>Topic<input value={creatorForm.topic} onChange={e=>setCreatorForm(v=>({...v,topic:e.target.value}))} placeholder="e.g. The impact of inflation on household consumption"/></label>
          <label>Focus<input value={creatorForm.focus} onChange={e=>setCreatorForm(v=>({...v,focus:e.target.value}))} placeholder="What should the work investigate or argue?"/></label>
          <label>Short direction <small>50+ characters recommended</small><textarea maxLength={500} value={creatorForm.brief} onChange={e=>setCreatorForm(v=>({...v,brief:e.target.value}))} placeholder="Describe the angle, country, period, method or key question the work should focus on…"/></label>
          <div className="creator-grid-fields"><label>Academic level<select value={creatorForm.level} onChange={e=>setCreatorForm(v=>({...v,level:e.target.value}))}><option>Bachelor</option><option>Master</option><option>Doctoral / Research</option></select></label><label>Citation style<select value={creatorForm.citation} onChange={e=>setCreatorForm(v=>({...v,citation:e.target.value}))}><option>APA 7</option><option>Harvard</option><option>MLA 9</option><option>Chicago</option></select></label><label>Citation display<select value={creatorForm.citationDisplay} onChange={e=>setCreatorForm(v=>({...v,citationDisplay:e.target.value}))}><option>Academic standard</option><option>Numbered footnotes</option></select></label><label>Language<input list="onstood-creator-languages" value={creatorForm.language} onChange={e=>setCreatorForm(v=>({...v,language:e.target.value}))} placeholder="Auto / search any language…"/><datalist id="onstood-creator-languages">{['Auto / Same as request','English','Shqip (Albanian)','Italiano','Deutsch','Français','Español','Português','Nederlands','Ελληνικά','Türkçe','العربية','中文 (Chinese)','日本語','한국어','हिन्दी','বাংলা','اردو','فارسی','Русский','Українська','Polski','Čeština','Slovenčina','Magyar','Română','Български','Srpski / Српски','Hrvatski','Bosanski','Slovenščina','Македонски','Svenska','Norsk','Dansk','Suomi','Íslenska','Eesti','Latviešu','Lietuvių','Gaeilge','Cymraeg','Català','Galego','Euskara','עברית','Bahasa Indonesia','Bahasa Melayu','Filipino / Tagalog','Tiếng Việt','ไทย','မြန်မာ','ខ្មែរ','ລາວ','नेपाली','සිංහල','தமிழ்','తెలుగు','ಕನ್ನಡ','മലയാളം','मराठी','ગુજરાતી','ਪੰਜਾਬੀ','Kiswahili','Afrikaans','Hausa','Yorùbá','Igbo','አማርኛ','Soomaali','isiZulu','isiXhosa'].map(language=><option key={language} value={language}/>)}</datalist></label><label>Output<select value={creatorForm.output} onChange={e=>setCreatorForm(v=>({...v,output:e.target.value}))}><option value="word">Word</option><option value="ppt">PowerPoint</option><option value="word_ppt">Word + PowerPoint</option></select></label><label>Template<select value={creatorForm.template} onChange={e=>setCreatorForm(v=>({...v,template:e.target.value}))}><option>OnStood Minimal</option><option>Research Classic</option><option>Modern Academic</option></select></label><label>Paper length<input value={creatorForm.pages} onChange={e=>setCreatorForm(v=>({...v,pages:e.target.value}))}/></label><label>Slides<input value={creatorForm.slides} onChange={e=>setCreatorForm(v=>({...v,slides:e.target.value}))}/></label></div>
          <div className="creator-integrity"><Sparkles size={16}/><span><b>Academic integrity built in.</b> OnStood tells Advanced AI not to invent citations or evidence and uses relevant OnStood Knowledge context when available.</span></div>
          {billingNotice?<div className="creator-notice">{billingNotice}</div>:null}
          {creatorResult?<div className="creator-result"><div><b>{creatorResult.quality?.ok?'Academic package ready.':'Academic draft ready — quality check flagged items.'}</b><span>{creatorResult.title}</span></div><div className="creator-quality-grid"><span><b>{Number(creatorResult.quality?.word_count||creatorResult.word_count||0).toLocaleString()}</b><small>words</small></span><span><b>{creatorResult.quality?.section_count||creatorResult.sections?.length||0}</b><small>sections</small></span><span><b>{creatorResult.quality?.reference_count||creatorResult.references?.length||0}</b><small>references</small></span><span><b>{creatorResult.quality?.slide_count||creatorResult.slides?.length||0}</b><small>slides</small></span></div>{creatorResult.quality?.issues?.length?<div className="creator-quality-warning">{creatorResult.quality.issues.map(issue=><small key={issue}>• {issue}</small>)}</div>:<small className="creator-quality-ok">✓ Structure, length, references and presentation passed the local readiness gate.</small>}<div className="creator-downloads">{creatorForm.output!=='ppt'&&<button type="button" className="btn primary" onClick={()=>downloadCreator('word')}><Download size={15}/> Download print-ready Word</button>}{creatorForm.output!=='word'&&<button type="button" className="btn primary" onClick={()=>downloadCreator('ppt')}><Download size={15}/> Download academic PowerPoint</button>}</div>{creatorResult.academic_note?<small>{creatorResult.academic_note}</small>:null}</div>:null}
          <div className="creator-footer"><span>{isPro?`${advancedLeft} Advanced AI request(s) left today`:'Advanced plan required'}</span><button className="btn primary creator-generate" disabled={creatorBusy||!creatorForm.topic.trim()||!creatorForm.focus.trim()}>{creatorBusy?(creatorProgress||'Building academic work…'):isPro?'Generate with Advanced AI':'View Advanced plan'}</button></div>
        </form>
      </div></div>}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="onstood-ai-suggested-bar" style={{ minHeight: 76, padding: '12px 18px', borderBottom: '1px solid rgba(0,0,0,.08)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="onstood-ai-suggested-label" style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.2, whiteSpace: 'nowrap' }}>✦ SUGGESTED BY ONSTOOD AI</div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {activeSuggestion ? (
              <button type="button" onClick={() => chooseSuggestion(activeSuggestion)} key={`${activeSuggestion.kind}-${activeSuggestion.id || suggestionIndex}`} style={{ width: '100%', border: 0, background: 'transparent', padding: 0, display: 'flex', alignItems: 'center', gap: 12, animation: 'fadeIn .35s ease', cursor: 'pointer', textAlign: 'left' }} title="Open this material with ONSTOOD AI">
                <span style={{ padding: '5px 9px', borderRadius: 999, background: 'rgba(99,102,241,.09)', fontSize: 11, fontWeight: 800 }}>{activeSuggestion.kind}</span>
                <div style={{ minWidth: 0 }}><b style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeSuggestion.title}</b><small className="muted">{activeSuggestion.meta}</small></div>
              </button>
            ) : <small className="muted">Suggestions will appear here from ONSTOOD content available to you.</small>}
          </div>
          {suggestions.length > 1 && <small className="muted">{suggestionIndex + 1}/{suggestions.length}</small>}
        </div>

        {selectedSuggestion && (
          <div style={{ padding: '10px 18px', borderBottom: '1px solid rgba(0,0,0,.08)', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(99,102,241,.035)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <small className="muted" style={{ display: 'block', fontWeight: 800 }}>SELECTED ONSTOOD MATERIAL</small>
              <b style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedSuggestion.title}</b>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flexWrap: 'wrap',
                justifyContent: 'flex-end'
              }}
            >
              <button
                type="button"
                className="onstood-global-selection-chip standard"
                disabled={
                  busy ||
                  standardLeft <= 0
                }
                onClick={event =>
                  askSelectedSuggestion(
                    event,
                    'standard'
                  )
                }
                title="Ask ONSTOOD AI about this material"
              >
                <span className="onstood-global-selection-flow" />
                <span className="onstood-global-selection-led" />
                <span className="onstood-global-selection-label">
                  ASK ONSTOOD AI
                </span>
              </button>

              <button
                type="button"
                className="onstood-global-selection-chip advanced"
                disabled={
                  busy ||
                  !isPro ||
                  advancedLeft <= 0
                }
                onClick={event =>
                  askSelectedSuggestion(
                    event,
                    'advanced'
                  )
                }
                title={
                  isPro
                    ? 'Ask Advanced ONSTOOD AI about this material'
                    : 'Advanced AI requires the Advanced plan'
                }
              >
                <span className="onstood-global-selection-flow" />
                <span className="onstood-global-selection-led" />
                <span className="onstood-global-selection-label">
                  ASK ADVANCED ONSTOOD AI
                </span>
              </button>
            </div>

            <button
              type="button"
              className="icon-btn"
              onClick={() =>
                setSelectedSuggestion(
                  null
                )
              }
              title="Close"
            >
              ×
            </button>
          </div>
        )}

        <div
          className="onstood-ai-workspace"
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 610
          }}
        >
          <div
            style={{
              minHeight: 42,
              padding: '7px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              borderBottom: '1px solid rgba(0,0,0,.06)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Globe2 size={14} style={{ opacity: .55 }} />
              <select
                value={answerLanguage}
                onChange={event => setAnswerLanguage(event.target.value)}
                title="Answer language"
                aria-label="ONSTOOD AI answer language"
                style={{ border: 0, background: 'transparent', fontSize: 11, fontWeight: 800, maxWidth: 118, cursor: 'pointer' }}
              >
                {AI_LANGUAGES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
              </select>
            </div>
            <button
              type="button"
              onClick={() =>
                setHistoryOpen(current => !current)
              }
              aria-expanded={historyOpen}
              title="AI history"
              style={{
                border: 0,
                background: 'transparent',
                color: 'inherit',
                opacity: historyOpen ? 1 : .48,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 8px',
                borderRadius: 9,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '.35px'
              }}
            >
              <History size={14} />
              HISTORY
            </button>
          </div>

          {historyOpen && (
            <>
              <button
                type="button"
                aria-label="Close AI history"
                onClick={() =>
                  setHistoryOpen(false)
                }
                style={{
                  position: 'absolute',
                  inset: '42px 0 0',
                  zIndex: 30,
                  border: 0,
                  background: 'rgba(15,23,42,.16)',
                  cursor: 'default'
                }}
              />

              <aside
                className="onstood-ai-history"
                style={{
                  position: 'absolute',
                  top: 50,
                  right: 10,
                  zIndex: 31,
                  width: 'min(310px, calc(100% - 20px))',
                  maxHeight: 520,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  background: '#fff',
                  border: '1px solid rgba(15,23,42,.10)',
                  borderRadius: 14,
                  boxShadow: '0 18px 50px rgba(15,23,42,.20)'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8
                  }}
                >
                  <small
                    className="muted"
                    style={{ fontWeight: 900 }}
                  >
                    AI HISTORY
                  </small>

                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() =>
                      setHistoryOpen(false)
                    }
                    aria-label="Close history"
                    title="Close"
                    style={{
                      width: 28,
                      height: 28,
                      minWidth: 28,
                      minHeight: 28
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <Search size={15} />
                  <input
                    value={historySearch}
                    onChange={event =>
                      setHistorySearch(event.target.value)
                    }
                    placeholder="Search history…"
                    style={{ width: '100%' }}
                  />
                </div>

                <div
                  style={{
                    overflowY: 'auto',
                    maxHeight: 430
                  }}
                >
                  {filteredHistory.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setConversationId(item.id);
                        setHistoryOpen(false);
                        focusInput();
                      }}
                      style={{
                        width: '100%',
                        border: 0,
                        borderRadius: 10,
                        padding: '10px 9px',
                        marginBottom: 4,
                        textAlign: 'left',
                        cursor: 'pointer',
                        background:
                          conversationId === item.id
                            ? 'rgba(99,102,241,.09)'
                            : 'transparent'
                      }}
                    >
                      <b
                        style={{
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: 13
                        }}
                      >
                        {item.title || 'ONSTOOD AI'}
                      </b>
                      <small className="muted">
                        {new Date(item.updated_at).toLocaleDateString()}
                      </small>
                    </button>
                  ))}

                  {!filteredHistory.length && (
                    <small className="muted">
                      Your AI history will stay here.
                    </small>
                  )}
                </div>
              </aside>
            </>
          )}

          <section
            className="onstood-ai-chat"
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div
              className="onstood-ai-messages"
              style={{ flex: 1, padding: 18, overflowY: 'auto', maxHeight: 520 }}
            >
              {!messages.length && <div className="empty" style={{ marginTop: 90 }}><Sparkles size={28} /><b>Ask ONSTOOD AI</b><span className="muted">Your cursor is ready below. Press Enter for a standard AI question.</span></div>}
              {messages.map((message, messageIndex) => {
                const advancedRecommended =
                  message?.role === 'assistant' &&
                  message?.mode === 'standard' &&
                  message?.response_meta?.advanced_recommended === true;
                const originalQuestion = advancedRecommended ? previousUserQuestion(messageIndex) : '';
                return (
                  <React.Fragment key={message.id}>
                    <div
                      className={message.role === 'user' ? 'bubble me' : 'bubble'}
                      style={{ whiteSpace: message.role === 'user' ? 'pre-wrap' : 'normal' }}
                    >
                      {message.role === 'assistant' && message.mode === 'advanced' && <small style={{ display: 'block', marginBottom: 5, fontWeight: 900 }}>✦ ADVANCED AI</small>}
                      {message.role === 'assistant' ? renderAiText(message.content) : message.content}
                    </div>
                    {advancedRecommended && originalQuestion && (
                      <div
                        style={{
                          margin: '8px 0 14px',
                          padding: '12px 14px',
                          borderRadius: 14,
                          border: '1px solid rgba(99,102,241,.22)',
                          background: 'linear-gradient(135deg, rgba(99,102,241,.07), rgba(59,130,246,.035))'
                        }}
                      >
                        <small style={{ display: 'block', fontWeight: 900, letterSpacing: '.45px', opacity: .72 }}>✦ ADVANCED AI</small>
                        <b style={{ display: 'block', marginTop: 4 }}>This answer needs Advanced AI for a complete, detailed response.</b>
                        <small className="muted" style={{ display: 'block', marginTop: 4, lineHeight: 1.45 }}>
                          Advanced AI will regenerate the answer from the beginning with substantially more depth and detail.
                        </small>
                        <button
                          type="button"
                          className="onstood-advanced-chip"
                          disabled={busy || !isPro || advancedLeft <= 0}
                          onClick={event => send(event, 'advanced', buildAdvancedUpgradePrompt(originalQuestion))}
                          title={isPro ? 'Regenerate with Advanced AI' : 'Advanced AI requires an active Advanced plan'}
                          style={{ marginTop: 10, minHeight: 42 }}
                        >
                          <span className="onstood-chip-circuit onstood-chip-circuit-a" />
                          <span className="onstood-chip-circuit onstood-chip-circuit-b" />
                          <span className="onstood-chip-circuit onstood-chip-circuit-c" />
                          <span className="onstood-chip-packet packet-a" />
                          <span className="onstood-chip-packet packet-b" />
                          <span className="onstood-chip-core" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>
                          <span className="onstood-chip-label">
                            <span className="onstood-chip-title">ADVANCED AI</span>
                            <span className="onstood-chip-count">{advancedLeft}/{plan.advanced_limit}</span>
                          </span>
                        </button>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}

              {getExamUpgradeQuestion() && !busy && (
                <div
                  style={{
                    margin: '10px 0 14px',
                    padding: '13px 14px',
                    borderRadius: 14,
                    border: '1px solid rgba(99,102,241,.22)',
                    background:
                      'linear-gradient(135deg, rgba(99,102,241,.06), rgba(59,130,246,.035))'
                  }}
                >
                  <small
                    style={{
                      display: 'block',
                      marginBottom: 5,
                      fontWeight: 900,
                      letterSpacing: '.55px',
                      opacity: .68
                    }}
                  >
                    {isExamRevisionIntent(
                      getExamUpgradeQuestion()
                    )
                      ? '✦ ADVANCED EXAM REVISION'
                      : '✦ ADVANCED ONSTOOD AI'}
                  </small>

                  <b style={{ display: 'block' }}>
                    {isExamRevisionIntent(
                      getExamUpgradeQuestion()
                    )
                      ? 'Want a more detailed exam review?'
                      : 'Need a deeper, more detailed analysis?'}
                  </b>

                  <small
                    className="muted"
                    style={{
                      display: 'block',
                      marginTop: 4,
                      lineHeight: 1.45
                    }}
                  >
                    {isExamRevisionIntent(
                      getExamUpgradeQuestion()
                    )
                      ? 'Advanced ONSTOOD AI can go deeper with must-know topics, likely exam questions, model answers, common mistakes and a structured revision plan.'
                      : 'For a deeper explanation, broader analysis and more detailed study support, ask with Advanced ONSTOOD AI.'}
                  </small>

                  <button
                    type="button"
                    className="btn subtle"
                    onClick={event =>
                      send(
                        event,
                        'advanced',
                        buildAdvancedExamPrompt(
                          getExamUpgradeQuestion()
                        )
                      )
                    }
                    disabled={
                      busy ||
                      (isPro && advancedLeft <= 0)
                    }
                    style={{
                      marginTop: 10,
                      fontSize: 12
                    }}
                  >
                    <Sparkles size={14} />
                    {isPro
                      ? 'Use Advanced ONSTOOD AI'
                      : 'Advanced AI · €16.99/month'}
                  </button>
                </div>
              )}

              {busy && <div className="bubble"><Sparkles size={15} /> <OnstoodWordmark /> <span>AI is thinking…</span></div>}
              <div ref={chatEndRef} />
            </div>

            <div
              className="onstood-ai-composer-wrap"
              style={{ borderTop: '1px solid rgba(0,0,0,.08)', padding: 14 }}
            >
              <div
                className="onstood-ai-usage-row"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}
              >
                <small className="muted">Free {standardLeft}/{plan.standard_limit} · Advanced {advancedLeft}/{plan.advanced_limit} · refresh 12:00 PM</small>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {plan.plan_code !== 'pro' && (
                    <button type="button" className="btn subtle" disabled={billingBusy} onClick={() => setUpgradeOpen(true)} style={{ fontSize: 11, padding: '5px 9px' }}>
                      Upgrade OnStood AI
                    </button>
                  )}
                  {['advanced', 'pro'].includes(plan.plan_code) && (
                    <button type="button" className="btn subtle" disabled={billingBusy} onClick={cancelAdvancedRenewal} style={{ fontSize: 11, padding: '5px 9px' }}>
                      Cancel renewal
                    </button>
                  )}
                  <small className="muted">Enter = Ask AI</small>
                </div>
              </div>
              {upgradeOpen && (
                <div role="dialog" aria-modal="true" aria-label="Upgrade OnStood AI" onMouseDown={e => { if (e.target === e.currentTarget && !billingBusy) setUpgradeOpen(false); }} style={{ position:'fixed', inset:0, zIndex:1200, background:'rgba(15,23,42,.48)', display:'grid', placeItems:'center', padding:16 }}>
                  <div className="card" style={{ width:'min(980px, 100%)', maxHeight:'88vh', overflowY:'auto', padding:22, borderRadius:20 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', gap:12, alignItems:'flex-start', marginBottom:16 }}>
                      <div><h2 style={{margin:0}}>Upgrade <OnstoodWordmark /> AI</h2><div className="muted" style={{marginTop:5}}>Choose the plan that fits your study needs.</div></div>
                      <button type="button" className="btn subtle" disabled={billingBusy} onClick={() => setUpgradeOpen(false)}>Close</button>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:14 }}>
                      {[
                        {code:'advanced', title:'Advanced', price:'€16.99 / month', total:'Total: up to 15 AI questions per day', points:[['10 Advanced AI questions every day','For deeper analysis, complex problems and advanced study support.'],['5 Standard AI questions every day — free from OnStood','Your free daily questions remain available.'],['Daily limits refresh every day',''],['Cancel renewal anytime','']]},
                        {code:'pro', title:'Pro', price:'€49.99 / month', total:'Total: up to 35 AI questions per day', points:[['30 Advanced AI questions every day','For intensive study, deeper analysis and complex academic work.'],['5 Standard AI questions every day — free from OnStood','Your free daily questions remain available.'],['Daily limits refresh every day',''],['Cancel renewal anytime','']]},
                        {code:'unlimited', title:'Unlimited', price:'Coming soon...', total:'Unlimited Advanced AI questions', points:[['Unlimited Advanced AI questions','Built for the highest level of study and research use.'],['5 Standard AI questions every day — free from OnStood','Your free daily questions remain available.'],['Advanced study and research support',''],['Fair-use and anti-abuse protections will apply','']]}
                      ].map(item => (
                        <div key={item.code} style={{ border:'1px solid rgba(0,0,0,.10)', borderRadius:16, padding:17, display:'flex', flexDirection:'column', gap:12 }}>
                          <div><div style={{fontWeight:850,fontSize:19}}><OnstoodWordmark /> {item.title}</div><div style={{fontWeight:800,fontSize:17,marginTop:5}}>{item.price}</div></div>
                          {item.points.map(([a,b],i)=><div key={i}><div style={{fontWeight:750}}>✓ {a}</div>{b && <div className="muted" style={{fontSize:12,marginTop:3}}>{b}</div>}</div>)}
                          <div style={{fontWeight:850,marginTop:'auto'}}>{item.total}</div>
                          {item.code === 'unlimited' ? (
                            <button type="button" className="btn subtle" disabled>Coming soon</button>
                          ) : (
                            <div style={{display:'grid',gap:7}}>
                              <button type="button" className="btn primary" disabled={billingBusy} onClick={() => startAdvancedCheckout(item.code)}>{billingBusy ? 'Opening payment…' : 'Continue to secure checkout'}</button>
                              <small className="muted" style={{fontSize:11,lineHeight:1.4}}>Pay with PayPal or debit/credit card when PayPal makes card checkout available.</small>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <button type="button" className="btn subtle" disabled={billingBusy} onClick={() => setUpgradeOpen(false)} style={{marginTop:16}}>Cancel</button>
                  </div>
                </div>
              )}
              {billingNotice && <small className="muted" style={{ display: 'block', margin: '-2px 0 8px' }}>{billingNotice}</small>}
              <form
                className="onstood-ai-composer"
                onSubmit={event => send(event, 'standard')}
                style={{ display: 'flex', alignItems: 'stretch', gap: 10 }}
              >
                <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                  {!text && !busy && (
                    <div
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '0 14px',
                        pointerEvents: 'none',
                        fontSize: 15,
                        color: '#6b7280',
                        zIndex: 1
                      }}
                    >
                      <span>Ask</span>
                      <OnstoodWordmark style={{ fontWeight: 800 }} />
                      <span>AI</span>
                    </div>
                  )}
                  <input
                    ref={inputRef}
                    autoFocus
                    value={text}
                    onChange={e => setText(e.target.value)}
                    aria-label="Ask OnStood AI"
                    placeholder=""
                    disabled={busy}
                    style={{ width: '100%', minHeight: 48, fontSize: 15, position: 'relative', zIndex: 2, background: 'transparent' }}
                  />
                </div>
                <button
                  className="onstood-standard-chip"
                  disabled={busy || !text.trim()}
                  title="Ask AI · Enter"
                >
                  <span className="onstood-standard-track track-a" />
                  <span className="onstood-standard-track track-b" />
                  <span className="onstood-standard-packet standard-packet-a" />
                  <span className="onstood-standard-packet standard-packet-b" />
                  <span className="onstood-standard-core" aria-hidden="true" />
                  <Send size={16} />
                </button>

                <button
                  type="button"
                  className="onstood-advanced-chip"
                  disabled={busy || !text.trim() || advancedLeft <= 0}
                  onClick={event => send(event, 'advanced')}
                  title="Ask Advanced AI"
                >
                  <span className="onstood-chip-circuit onstood-chip-circuit-a" />
                  <span className="onstood-chip-circuit onstood-chip-circuit-b" />
                  <span className="onstood-chip-circuit onstood-chip-circuit-c" />
                  <span className="onstood-chip-circuit onstood-chip-circuit-d" />
                  <span className="onstood-chip-packet packet-a" />
                  <span className="onstood-chip-packet packet-b" />
                  <span className="onstood-chip-packet packet-c" />
                  <span className="onstood-chip-core" aria-hidden="true">
                    <i /><i /><i /><i /><i /><i />
                  </span>
                  <span className="onstood-chip-label">
                    <span className="onstood-chip-title">ADVANCED AI</span>
                    <span className="onstood-chip-count">{advancedLeft}/{plan.advanced_limit}</span>
                  </span>
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>

    </Page>
  );
}
        .creator-confirm-overlay{position:fixed;inset:0;z-index:10050;background:rgba(7,12,24,.62);backdrop-filter:blur(10px);display:grid;place-items:center;padding:20px}.creator-confirm-card{width:min(560px,94vw);background:#fff;border:1px solid #e2e8f0;border-radius:24px;padding:26px;box-shadow:0 28px 80px rgba(15,23,42,.28)}.creator-confirm-card h3{margin:10px 0 8px;font-size:22px;color:#0f172a}.creator-confirm-card p{color:#64748b;line-height:1.55}.creator-confirm-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:18px 0}.creator-confirm-metrics span{padding:14px;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc;text-align:center}.creator-confirm-metrics b{display:block;font-size:24px;color:#111827}.creator-confirm-metrics small{color:#64748b}.creator-confirm-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}

