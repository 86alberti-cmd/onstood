import React, { useEffect, useRef, useState } from 'react';
import { OnstoodRichText } from '../OnstoodRichText';
import OnstoodWordmark from '../OnstoodWordmark';
import { Globe2, History, Search, Send, Sparkles, X } from 'lucide-react';
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

  function getExamUpgradeQuestion() {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];

      if (
        message?.role !== 'assistant' ||
        message?.mode !== 'standard'
      ) {
        continue;
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
      .select('id,role,mode,content,created_at')
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

  async function searchOnstoodKnowledge(question) {
    try {
      const { data, error } =
        await supabase.functions.invoke(
          'onstood-knowledge-search',
          {
            body: {
              query: String(question || '').slice(0, 1200)
            }
          }
        );

      if (error) {
        console.warn(
          'ONSTOOD Knowledge search:',
          error
        );
        return [];
      }

      return Array.isArray(data?.results)
        ? data.results
        : [];
    } catch (error) {
      console.warn(
        'ONSTOOD Knowledge search:',
        error
      );
      return [];
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


  function uniqueKnowledgeMatches(results) {
    if (!Array.isArray(results)) return [];

    const unique = [];
    const seen = new Set();

    for (const item of results) {
      const excerpt = String(item?.excerpt || '').trim();
      if (!excerpt) continue;

      const key =
        `${item?.source_type || ''}:` +
        `${item?.source_id || item?.document_id || ''}:` +
        excerpt;

      if (seen.has(key)) continue;

      seen.add(key);
      unique.push(item);

      if (unique.length >= 4) break;
    }

    return unique;
  }


  function buildKnowledgeContext(results) {
    const unique = uniqueKnowledgeMatches(results);

    return unique
      .map((item, index) => {
        const excerpt = String(item?.excerpt || '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 900);

        return [
          `SOURCE ${index + 1}`,
          `Title: ${item?.title || item?.file_name || 'Student contribution'}`,
          `Type: ${knowledgeTypeLabel(item?.knowledge_type)}`,
          `Quality: ${item?.quality_status || 'accepted'}`,
          `Excerpt: ${excerpt}`
        ].join('\n');
      })
      .join('\n\n')
      .slice(0, 3600);
  }


  function formatKnowledgeSources(results) {
    const unique = uniqueKnowledgeMatches(results);

    if (!unique.length) return '';

    return [
      '',
      '',
      `ONSTOOD Knowledge · ${unique.length} relevant source${unique.length === 1 ? '' : 's'}`,
      ...unique.map((item, index) => {
        const title =
          item?.title ||
          item?.file_name ||
          'Student contribution';

        const status =
          item?.quality_status === 'disputed'
            ? ' · disputed'
            : item?.quality_status === 'outdated'
              ? ' · may be outdated'
              : '';

        return `${index + 1}. ${title} · ${knowledgeTypeLabel(item?.knowledge_type)}${status}`;
      }),
      '',
      'ONSTOOD used only small, privacy-filtered excerpts for answer generation; original contributed files were not sent as an external knowledge base.'
    ].join('\n');
  }


  async function consumeQuestionQuota(questionMode) {
    if (
      questionMode === 'standard' &&
      standardLeft <= 0
    ) {
      throw new Error(
        'Your 5 free Ask AI questions are finished. They refresh at 12:00 PM.'
      );
    }

    if (
      questionMode === 'advanced' &&
      !isPro
    ) {
      throw new Error(
        'Advanced AI is available with ONSTOOD PRO. PRO is planned at €8.99/month.'
      );
    }

    if (
      questionMode === 'advanced' &&
      advancedLeft <= 0
    ) {
      throw new Error(
        'Your Advanced AI allowance is finished. It refreshes at 12:00 PM.'
      );
    }

    const {
      data: quotaData,
      error: quotaError
    } = await supabase.rpc(
      'consume_ai_question',
      { p_mode: questionMode }
    );

    const quota =
      Array.isArray(quotaData)
        ? quotaData[0]
        : quotaData;

    if (quotaError || !quota?.allowed) {
      throw new Error(
        'Daily AI allowance reached. Refreshes at 12:00 PM.'
      );
    }

    setUsage({
      standard_count:
        Number(quota.standard_used || 0),
      advanced_count:
        Number(quota.advanced_used || 0)
    });

    setPlan(current => ({
      ...current,
      plan_code:
        quota.plan_code ||
        current.plan_code,
      standard_limit:
        Number(
          quota.standard_limit ??
          current.standard_limit
        ),
      advanced_limit:
        Number(
          quota.advanced_limit ??
          current.advanced_limit
        )
    }));

    onUsageChanged?.();

    return quota;
  }


  async function send(
    event,
    forcedMode = 'standard',
    forcedQuestion = null,
    privacyScope = 'user_prompt'
  ) {
    event?.preventDefault?.();

    const question =
      String(forcedQuestion ?? text).trim();

    if (!question || busy) return;

    const questionMode =
      forcedMode === 'advanced'
        ? 'advanced'
        : 'standard';

    const privateOnstoodRequest =
      privacyScope === 'onstood_content';

    setBusy(true);
    setText('');

    let activeId = null;
    let quotaConsumed = false;
    let successfulAnswer = false;

    try {
      activeId =
        await ensureConversation(question);

      const userMessage = {
        conversation_id: activeId,
        user_id: profile.id,
        role: 'user',
        mode: questionMode,
        content: question
      };

      const {
        data: savedUser,
        error: saveUserError
      } = await supabase
        .from('ai_messages')
        .insert(userMessage)
        .select(
          'id,role,mode,content,created_at'
        )
        .single();

      if (saveUserError) {
        throw saveUserError;
      }

      setMessages(current => [
        ...current,
        savedUser
      ]);

      scrollChat();

      // A successful ONSTOOD AI answer always consumes the selected
      // Standard/Advanced allowance, regardless of whether the useful
      // information comes from ONSTOOD Knowledge or the external model.
      await consumeQuestionQuota(questionMode);
      quotaConsumed = true;

      // Knowledge is checked first. Search returns privacy-filtered,
      // quality-gated excerpts rather than original contributed files.
      const knowledgeMatches =
        await searchOnstoodKnowledge(question);

      const knowledgeContext =
        buildKnowledgeContext(
          knowledgeMatches
        );

      let answer = '';

      if (knowledgeContext) {
        // Refine the small privacy-filtered retrieval with ONSTOOD AI.
        // The original document/post is never sent as the knowledge base.
        const { data, error } =
          await supabase.functions.invoke(
            'onstood-ai',
            {
              body: {
                message: question,
                mode: questionMode,
                knowledge_context:
                  knowledgeContext,
                knowledge_source_count: uniqueKnowledgeMatches(knowledgeMatches).length,
                answer_language: answerLanguage
              }
            }
          );

        if (!error && data?.answer) {
          answer = [
            data.answer,
            formatKnowledgeSources(
              knowledgeMatches
            )
          ].join('');
        } else {
          // If refinement is temporarily unavailable, ONSTOOD can still
          // return the privacy-filtered Knowledge result. The student has
          // received a useful answer, so the allowance remains consumed.
          const fallback = uniqueKnowledgeMatches(
            knowledgeMatches
          );

          answer = [
            'ONSTOOD Knowledge found relevant material for your question.',
            '',
            ...fallback.map((item, index) => {
              const clean = String(
                item?.excerpt || ''
              )
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 700);

              return [
                `${index + 1}. ${item?.title || item?.file_name || 'Student contribution'}`,
                `${knowledgeTypeLabel(item?.knowledge_type)}`,
                clean
              ].join('\n');
            }),
            formatKnowledgeSources(
              knowledgeMatches
            )
          ].join('\n');
        }

        successfulAnswer = Boolean(
          String(answer || '').trim()
        );
      } else if (privateOnstoodRequest) {
        // Selected private ONSTOOD content is not forwarded when it has
        // no approved Knowledge match. No useful answer = no charge.
        await refundQuestion(questionMode);
        await loadUsage();
        quotaConsumed = false;

        answer =
          "Sorry, we couldn't find reliable information for your request. Please try rephrasing your question.";

        successfulAnswer = false;
      } else {
        const { data, error } =
          await supabase.functions.invoke(
            'onstood-ai',
            {
              body: {
                message: question,
                mode: questionMode,
                answer_language: answerLanguage
              }
            }
          );

        if (error || !data?.answer) {
          await refundQuestion(questionMode);
          await loadUsage();
          quotaConsumed = false;

          throw new Error(
            data?.error ||
            error?.message ||
            "Sorry, we couldn't find reliable information for your request. Your AI question was not charged."
          );
        }

        answer = data.answer;
        successfulAnswer = true;
      }

      const {
        data: savedAi,
        error: saveAiError
      } = await supabase
        .from('ai_messages')
        .insert({
          conversation_id: activeId,
          user_id: profile.id,
          role: 'assistant',
          mode: questionMode,
          content: answer
        })
        .select(
          'id,role,mode,content,created_at'
        )
        .single();

      if (saveAiError) {
        // If the user never receives the successful answer because
        // persistence fails, refund the quota.
        if (
          quotaConsumed &&
          successfulAnswer
        ) {
          await refundQuestion(
            questionMode
          );
          await loadUsage();
          quotaConsumed = false;
        }

        throw saveAiError;
      }

      setMessages(current => [
        ...current,
        savedAi
      ]);

      await supabase
        .from('ai_conversations')
        .update({
          updated_at:
            new Date().toISOString()
        })
        .eq('id', activeId);

      await loadConversations(
        activeId
      );
    } catch (error) {
      if (
        quotaConsumed &&
        !successfulAnswer
      ) {
        await refundQuestion(
          questionMode
        );
        await loadUsage();
        quotaConsumed = false;
      }

      setMessages(current => [
        ...current,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          mode: questionMode,
          content:
            error.message ||
            "Sorry, we couldn't find reliable information for your request."
        }
      ]);
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
      question,
      selectedSuggestion?.sourceType === 'academic' ? 'user_prompt' : 'onstood_content'
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
      question,
      'onstood_content'
    );

    setSelectedSuggestion(null);
  }



  const filteredHistory = conversations.filter(item => (item.title || '').toLowerCase().includes(historySearch.toLowerCase()));
  const activeSuggestion = suggestions.length ? suggestions[suggestionIndex % suggestions.length] : null;

  return (
    <Page eyebrow="INTELLIGENCE LAYER" title={<><OnstoodWordmark /> AI</>}>
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
          <div className="onstood-ai-suggested-label" style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.2, whiteSpace: 'nowrap' }}>✦ SUGGESTED BY <OnstoodWordmark /> AI</div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {activeSuggestion ? (
              <button type="button" onClick={() => chooseSuggestion(activeSuggestion)} key={`${activeSuggestion.kind}-${activeSuggestion.id || suggestionIndex}`} style={{ width: '100%', border: 0, background: 'transparent', padding: 0, display: 'flex', alignItems: 'center', gap: 12, animation: 'fadeIn .35s ease', cursor: 'pointer', textAlign: 'left' }} title="Open this material with ONSTOOD AI">
                <span style={{ padding: '5px 9px', borderRadius: 999, background: 'rgba(99,102,241,.09)', fontSize: 11, fontWeight: 800 }}>{activeSuggestion.kind}</span>
                <div style={{ minWidth: 0 }}><b style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeSuggestion.title}</b><small className="muted">{activeSuggestion.meta}</small></div>
              </button>
            ) : <small className="muted">Suggestions will appear here from <OnstoodWordmark /> content available to you.</small>}
          </div>
          {suggestions.length > 1 && <small className="muted">{suggestionIndex + 1}/{suggestions.length}</small>}
        </div>

        {selectedSuggestion && (
          <div style={{ padding: '10px 18px', borderBottom: '1px solid rgba(0,0,0,.08)', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(99,102,241,.035)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <small className="muted" style={{ display: 'block', fontWeight: 800 }}>SELECTED <OnstoodWordmark /> MATERIAL</small>
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
                  ASK <OnstoodWordmark /> AI
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
                  ASK ADVANCED <OnstoodWordmark /> AI
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
              className="onstood-ai-messages onstood-ai-copy-protected"
              onCopy={event => event.preventDefault()}
              onCut={event => event.preventDefault()}
              onContextMenu={event => event.preventDefault()}
              onDragStart={event => event.preventDefault()}
              style={{
                flex: 1,
                padding: 18,
                overflowY: 'auto',
                maxHeight: 520,
                userSelect: 'text',
                WebkitUserSelect: 'text',
                WebkitTouchCallout: 'none'
              }}
            >
              {!messages.length && <div className="empty" style={{ marginTop: 90 }}><Sparkles size={28} /><b>Ask <OnstoodWordmark /> AI</b><span className="muted">Your cursor is ready below. Press Enter for a standard AI question.</span></div>}
              {messages.map(message => (
                <div key={message.id} className={message.role === 'user' ? 'bubble me' : 'bubble'} style={{ whiteSpace: 'pre-wrap' }}>
                  {message.role === 'assistant' && message.mode === 'advanced' && <small style={{ display: 'block', marginBottom: 5, fontWeight: 900 }}>✦ ADVANCED AI</small>}
                  {renderAiText(message.content)}
                </div>
              ))}

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
                      : 'Advanced ONSTOOD AI · PRO'}
                  </button>
                </div>
              )}

              {busy && <div className="bubble"><Sparkles size={15} /> <OnstoodWordmark /> AI is thinking…</div>}
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
                <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                  {!text && (
                    <div
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        paddingLeft: 14,
                        paddingRight: 14,
                        pointerEvents: 'none',
                        fontSize: 15,
                        color: 'var(--muted)',
                        zIndex: 2
                      }}
                    >
                      Ask&nbsp;<OnstoodWordmark />&nbsp;AI
                    </div>
                  )}
                  <input
                    ref={inputRef}
                    autoFocus
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder=""
                    aria-label="Ask OnStood AI"
                    disabled={busy}
                    style={{
                      width: '100%',
                      minHeight: 48,
                      fontSize: 15,
                      boxSizing: 'border-box',
                      position: 'relative',
                      zIndex: 1,
                      background: 'transparent'
                    }}
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

      <style>{`
        .onstood-ai-copy-protected,
        .onstood-ai-copy-protected * {
          -webkit-user-select: text !important;
          user-select: text !important;
          -webkit-touch-callout: none !important;
        }

        .onstood-ai-copy-protected img,
        .onstood-ai-copy-protected video,
        .onstood-ai-copy-protected a {
          -webkit-user-drag: none !important;
          user-drag: none !important;
        }
      `}</style>

    </Page>
  );
}
