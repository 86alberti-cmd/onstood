import React, { useEffect, useRef, useState } from 'react';
import { Search, Send, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Page } from '../ui';

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
        content: 'I found this proactively, but the full analysis uses Advanced AI and is available with ONSTOOD PRO.'
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
  const [historySearch, setHistorySearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);

  const standardLeft = Math.max(0, Number(plan.standard_limit || 0) - Number(usage.standard_count || 0));
  const advancedLeft = Math.max(0, Number(plan.advanced_limit || 0) - Number(usage.advanced_count || 0));
  const isPro = plan.plan_code === 'pro';

  function focusInput() {
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  function scrollChat() {
    window.requestAnimationFrame(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }));
  }

  function renderAiText(value) {
    const parts = String(value || '').split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      return <React.Fragment key={index}>{part}</React.Fragment>;
    });
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
    const nextId = preferredId || conversationId || rows[0]?.id || null;
    if (nextId) setConversationId(nextId);
  }

  async function loadMessages(id) {
    if (!id) {
      setMessages([]);
      focusInput();
      return;
    }
    const { data, error } = await supabase
      .from('ai_messages')
      .select('id,role,mode,content,created_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });
    if (!error) setMessages(data || []);
    focusInput();
    scrollChat();
  }

  async function loadSuggestions() {
    const [docsResult, eventsResult, postsResult] = await Promise.all([
      supabase.from('documents').select('id,file_name,created_at').order('created_at', { ascending: false }).limit(6),
      supabase.from('calendar_events').select('id,title,starts_at,location').gte('starts_at', new Date().toISOString()).order('starts_at', { ascending: true }).limit(6),
      supabase.from('posts').select('id,body,created_at').order('created_at', { ascending: false }).limit(6)
    ]);

    const items = [];
    (eventsResult.data || []).forEach(item => items.push({ id: item.id, sourceType: 'calendar_event', kind: 'Upcoming', title: item.title, context: [item.title, item.location].filter(Boolean).join(' — '), meta: item.location || new Date(item.starts_at).toLocaleString() }));
    (docsResult.data || []).forEach(item => items.push({ id: item.id, sourceType: 'document', kind: 'Document', title: item.file_name, context: item.file_name, meta: 'Available in ONSTOOD' }));
    (postsResult.data || []).filter(item => item.body?.trim()).forEach(item => items.push({ id: item.id, sourceType: 'post', kind: 'From your network', title: item.body.trim().slice(0, 90), context: item.body.trim(), meta: 'Shared on ONSTOOD' }));
    setSuggestions(items.slice(0, 12));
  }

  useEffect(() => {
    if (!profile?.id) return;
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

  async function refundQuestion(questionMode) {
    try { await supabase.rpc('refund_ai_question', { p_mode: questionMode }); } catch {}
  }

  async function send(event, forcedMode = 'standard', forcedQuestion = null) {
    event?.preventDefault?.();
    const question = String(forcedQuestion ?? text).trim();
    if (!question || busy) return;
    const questionMode = forcedMode === 'advanced' ? 'advanced' : 'standard';

    if (questionMode === 'standard' && standardLeft <= 0) {
      setMessages(current => [...current, { id: `local-${Date.now()}`, role: 'assistant', mode: 'standard', content: 'Your 5 free Ask AI questions are finished. They refresh at 12:00 PM.' }]);
      focusInput(); return;
    }
    if (questionMode === 'advanced' && !isPro) {
      setMessages(current => [...current, { id: `local-${Date.now()}`, role: 'assistant', mode: 'advanced', content: 'Advanced AI is available with ONSTOOD PRO. PRO is planned at €8.99/month.' }]);
      focusInput(); return;
    }
    if (questionMode === 'advanced' && advancedLeft <= 0) {
      setMessages(current => [...current, { id: `local-${Date.now()}`, role: 'assistant', mode: 'advanced', content: 'Your Advanced AI allowance is finished. It refreshes at 12:00 PM.' }]);
      focusInput(); return;
    }

    setBusy(true);
    setText('');
    let activeId = null;

    try {
      activeId = await ensureConversation(question);
      const { data: quotaData, error: quotaError } = await supabase.rpc('consume_ai_question', { p_mode: questionMode });
      const quota = Array.isArray(quotaData) ? quotaData[0] : quotaData;
      if (quotaError || !quota?.allowed) throw new Error('Daily AI allowance reached. Refreshes at 12:00 PM.');

      setUsage({ standard_count: Number(quota.standard_used || 0), advanced_count: Number(quota.advanced_used || 0) });
      setPlan(current => ({ ...current, plan_code: quota.plan_code || current.plan_code, standard_limit: Number(quota.standard_limit ?? current.standard_limit), advanced_limit: Number(quota.advanced_limit ?? current.advanced_limit) }));
      onUsageChanged?.();

      const userMessage = { conversation_id: activeId, user_id: profile.id, role: 'user', mode: questionMode, content: question };
      const { data: savedUser, error: saveUserError } = await supabase.from('ai_messages').insert(userMessage).select('id,role,mode,content,created_at').single();
      if (saveUserError) throw saveUserError;
      setMessages(current => [...current, savedUser]);
      scrollChat();

      const { data, error } = await supabase.functions.invoke('onstood-ai', { body: { message: question, mode: questionMode } });
      if (error || !data?.answer) {
        await refundQuestion(questionMode);
        await loadUsage();
        throw new Error(data?.error || error?.message || 'ONSTOOD AI is temporarily unavailable. Your AI question was refunded.');
      }

      const { data: savedAi, error: saveAiError } = await supabase.from('ai_messages').insert({ conversation_id: activeId, user_id: profile.id, role: 'assistant', mode: questionMode, content: data.answer }).select('id,role,mode,content,created_at').single();
      if (saveAiError) throw saveAiError;
      setMessages(current => [...current, savedAi]);
      await supabase.from('ai_conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeId);
      await loadConversations(activeId);
    } catch (error) {
      setMessages(current => [...current, { id: `error-${Date.now()}`, role: 'assistant', mode: questionMode, content: error.message || 'Something went wrong.' }]);
    } finally {
      setBusy(false);
      focusInput();
      scrollChat();
    }
  }

  useEffect(() => {
    if (
      !externalAsk?.id ||
      !planLoaded ||
      busy ||
      lastExternalAskRef.current ===
        externalAsk.id
    ) {
      return;
    }

    lastExternalAskRef.current =
      externalAsk.id;

    const selectedText =
      String(
        externalAsk.text || ''
      ).trim();

    if (!selectedText) {
      onExternalAskConsumed?.();
      return;
    }

    const question =
      `${selectedText}\n\nHelp me understand this selected text clearly.`;

    setText(question);

    send(
      null,
      externalAsk.mode ===
        'advanced'
        ? 'advanced'
        : 'standard',
      question
    );

    onExternalAskConsumed?.();

  }, [
    externalAsk?.id,
    planLoaded,
    busy
  ]);


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
      question
    );

    setSelectedSuggestion(null);
  }



  const filteredHistory = conversations.filter(item => (item.title || '').toLowerCase().includes(historySearch.toLowerCase()));
  const activeSuggestion = suggestions.length ? suggestions[suggestionIndex % suggestions.length] : null;

  return (
    <Page eyebrow="INTELLIGENCE LAYER" title="ONSTOOD AI">
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
        <div style={{ minHeight: 76, padding: '12px 18px', borderBottom: '1px solid rgba(0,0,0,.08)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.2, whiteSpace: 'nowrap' }}>✦ SUGGESTED BY ONSTOOD AI</div>
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
                    : 'Advanced AI requires ONSTOOD PRO'
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
          style={{ display: 'flex', minHeight: 610 }}
        >
          <aside
            className="onstood-ai-history"
            style={{ width: 250, borderRight: '1px solid rgba(0,0,0,.08)', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Search size={15} /><input value={historySearch} onChange={e => setHistorySearch(e.target.value)} placeholder="Search history…" style={{ width: '100%' }} /></div>
            <small className="muted" style={{ fontWeight: 800 }}>HISTORY</small>
            <div style={{ overflowY: 'auto', maxHeight: 510 }}>
              {filteredHistory.map(item => (
                <button key={item.id} type="button" onClick={() => { setConversationId(item.id); focusInput(); }} style={{ width: '100%', border: 0, borderRadius: 10, padding: '10px 9px', marginBottom: 4, textAlign: 'left', cursor: 'pointer', background: conversationId === item.id ? 'rgba(99,102,241,.09)' : 'transparent' }}>
                  <b style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>{item.title || 'ONSTOOD AI'}</b>
                  <small className="muted">{new Date(item.updated_at).toLocaleDateString()}</small>
                </button>
              ))}
              {!filteredHistory.length && <small className="muted">Your AI history will stay here.</small>}
            </div>
          </aside>

          <section
            className="onstood-ai-chat"
            style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}
          >
            <div
              className="onstood-ai-messages"
              style={{ flex: 1, padding: 18, overflowY: 'auto', maxHeight: 520 }}
            >
              {!messages.length && <div className="empty" style={{ marginTop: 90 }}><Sparkles size={28} /><b>Ask ONSTOOD AI</b><span className="muted">Your cursor is ready below. Press Enter for a standard AI question.</span></div>}
              {messages.map(message => (
                <div key={message.id} className={message.role === 'user' ? 'bubble me' : 'bubble'} style={{ whiteSpace: 'pre-wrap' }}>
                  {message.role === 'assistant' && message.mode === 'advanced' && <small style={{ display: 'block', marginBottom: 5, fontWeight: 900 }}>✦ ADVANCED AI</small>}
                  {renderAiText(message.content)}
                </div>
              ))}
              {busy && <div className="bubble"><Sparkles size={15} /> ONSTOOD AI is thinking…</div>}
              <div ref={chatEndRef} />
            </div>

            <div
              className="onstood-ai-composer-wrap"
              style={{ borderTop: '1px solid rgba(0,0,0,.08)', padding: 14 }}
            >
              <div
                className="onstood-ai-usage-row"
                style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}
              >
                <small className="muted">Free {standardLeft}/{plan.standard_limit} · Advanced {advancedLeft}/{plan.advanced_limit} · refresh 12:00 PM</small>
                <small className="muted">Enter = Ask AI</small>
              </div>
              <form
                className="onstood-ai-composer"
                onSubmit={event => send(event, 'standard')}
                style={{ display: 'flex', alignItems: 'stretch', gap: 10 }}
              >
                <input ref={inputRef} autoFocus value={text} onChange={e => setText(e.target.value)} placeholder="Ask ONSTOOD AI" disabled={busy} style={{ flex: 1, minHeight: 48, fontSize: 15 }} />
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
