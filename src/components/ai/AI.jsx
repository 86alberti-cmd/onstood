import React, { useEffect, useRef, useState } from 'react';
import { Globe2, History, Search, Send, Sparkles, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Page } from '../ui';
import OnstoodWordmark from '../OnstoodWordmark';

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
      const { data, error } = await supabase.functions.invoke('onstood-paypal-create-subscription', {
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

  function renderAiText(value) {
    const textValue = String(value || '');
    const tokenRx = /\[\[ONSTOOD_DOWNLOAD:([0-9a-f-]{36})\|([^\]]+)\]\]/gi;
    const nodes = [];
    let cursor = 0;
    let match;

    const renderText = (text, keyBase) => String(text || '')
      .split(/(\*\*[^*]+\*\*)/g)
      .map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={`${keyBase}-${index}`}>{part.slice(2, -2)}</strong>;
        }
        return <React.Fragment key={`${keyBase}-${index}`}>{part}</React.Fragment>;
      });

    while ((match = tokenRx.exec(textValue)) !== null) {
      if (match.index > cursor) nodes.push(...renderText(textValue.slice(cursor, match.index), `text-${cursor}`));
      const documentId = match[1];
      const label = decodeURIComponent(match[2]);
      nodes.push(
        <button
          key={`download-${documentId}-${match.index}`}
          type="button"
          onClick={() => openOnstoodDocument(documentId)}
          style={{ border: 0, padding: 0, background: 'transparent', color: '#168CFF', font: 'inherit', fontWeight: 800, textDecoration: 'underline', cursor: 'pointer' }}
        >
          {label}
        </button>
      );
      cursor = tokenRx.lastIndex;
    }
    if (cursor < textValue.length) nodes.push(...renderText(textValue.slice(cursor), `text-${cursor}`));
    return nodes;
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
      supabase.from('documents').select('id,file_name,created_at').order('created_at', { ascending: false }).limit(10),
      supabase.from('calendar_events').select('id,title,starts_at,location').gte('starts_at', new Date().toISOString()).order('starts_at', { ascending: true }).limit(6),
      supabase.from('posts').select('id,body,created_at').order('created_at', { ascending: false }).limit(10),
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
    (docsResult.data || []).forEach(item => local.push({ id: item.id, sourceType: 'document', kind: 'Document', title: item.file_name, context: item.file_name, meta: 'Available in ONSTOOD', score: relevance(item.file_name) }));
    (postsResult.data || []).filter(item => item.body?.trim()).forEach(item => local.push({ id: item.id, sourceType: 'post', kind: 'From your network', title: item.body.trim().slice(0, 90), context: item.body.trim(), meta: 'Shared on ONSTOOD', score: relevance(item.body) }));

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
                    <div className={message.role === 'user' ? 'bubble me' : 'bubble'} style={{ whiteSpace: 'pre-wrap' }}>
                      {message.role === 'assistant' && message.mode === 'advanced' && <small style={{ display: 'block', marginBottom: 5, fontWeight: 900 }}>✦ ADVANCED AI</small>}
                      {renderAiText(message.content)}
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
