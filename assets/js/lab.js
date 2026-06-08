/* =================================================================
   lab page — three interactive demos:
     1) chat playground (canned but believable)
     2) BPE-ish tokenizer visualizer
     3) embedding scatter plot
   ================================================================= */

(() => {
  const $  = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ─────────────────────────────────────────────
     1) CHAT PLAYGROUND
     ───────────────────────────────────────────── */

  const RESPONSES = [
    {
      match: /\b(rag|retrieval|augment|retriev)/i,
      reply:
        "RAG is mostly an information-retrieval problem with an LLM at the end, not a prompting problem with a search engine at the start. The three places I'd focus first: (1) chunk by meaning, not by token count — recursive splitters that respect paragraphs beat fixed windows every time; (2) hybrid search — BM25 in parallel with vector embeddings, fused with reciprocal rank fusion, catches exact-match queries that pure vectors miss; (3) a cross-encoder reranker over the top ~20 candidates is the highest-leverage change you can make after the basics.",
    },
    {
      match: /\b(eval|evaluation|test|measure)/i,
      reply:
        "Eval-driven prompting changed my life. Without a test set you're not iterating — you're rearranging deck chairs. My loop: 30-100 fixed cases with categories, run every prompt variant through them, track accuracy + cost + p95 latency. Use an LLM-as-judge for open-ended outputs but sample 10% for manual review, and version the judge prompt too — we lost a week to silent judge drift before we caught it.",
    },
    {
      match: /\b(fine[- ]?tun|lora|adapter|train)/i,
      reply:
        "Honestly, most teams reach for fine-tuning when they should reach for better retrieval or better prompts first. Fine-tuning earns its keep when: (1) you have a stable distribution of queries the base model is bad at, (2) you have hundreds of clean labeled examples, and (3) latency or cost is a real constraint. Below that bar I'd use LoRA over a small open model before paying for a full fine-tune.",
    },
    {
      match: /\b(transformer|attention|kv cache|positional)/i,
      reply:
        "Self-attention is mostly weighted averaging where the weights come from a softmax over query·key dot products. Multi-head just lets the model learn several different attention patterns in parallel and concat them. The thing that took me longest to internalize: KV caching only helps decoding, not prefill — every new token attends to all the old keys and values, so you store them once and reuse them. Karpathy's nanoGPT walk-through is still the clearest path I've found.",
    },
    {
      match: /\b(hire|hiring|role|job|opportunit|work for)/i,
      reply:
        "Short answer: yes. I'm looking for an AI engineering role — junior, associate, or a meaty internship — where the work involves taking LLMs from notebook to production. I'm based in Kathmandu but open to remote, hybrid, or relocation. The fastest way to reach me is hello@manishkarki.dev.",
    },
    {
      match: /\b(wordpress|wp|php)/i,
      reply:
        "I spent two years deep in WordPress before pivoting to Python, and I'm still glad I did. The discipline of shipping inside its constraints — non-technical authors, caching gotchas, plugin compatibility hell, decade-old admin patterns — taught me more about software than any framework has since. A working site that earns money beats a beautiful repo that doesn't.",
    },
    {
      match: /\b(python|django|flask|fastapi)/i,
      reply:
        "Python is my daily driver. FastAPI for new services, Flask when I want minimalism, Django when I'm shipping CRUD with auth and admin already needed. The thing I keep telling junior devs: learn the standard library before you learn the third-party packages. asyncio, dataclasses, contextlib, pathlib, functools — most of what people import is already in there.",
    },
    {
      match: /\b(stack|tools|setup|editor)/i,
      reply:
        "Day-to-day: Neovim + Claude Code inside tmux on macOS, ChatGPT/Claude open in a browser tab, GitHub for everything, Docker for anything that has to run on a server. Python is my main language; PyTorch when I need tensors; LangChain and LlamaIndex sparingly — they're useful for prototypes, less useful in production. PostgreSQL for data, Cloudflare in front of everything I deploy.",
    },
    {
      match: /\b(prompt|prompt engineering)/i,
      reply:
        "I think 'prompt engineering' is mostly a placeholder name for two real skills: (1) being able to write down what you want clearly enough that a model can't misinterpret it, and (2) being patient enough to run an eval before you decide whether your last change was an improvement. The rest is folklore that the next model release will deprecate.",
    },
    {
      match: /\b(hello|hi|hey|hola|namaste)/i,
      reply:
        "Hey! This is a tiny in-browser demo, not a real LLM — answers come from a pattern-matched dictionary, not a model. Try asking me about RAG, evals, fine-tuning, transformers, or my background. There's a list of suggestions below if you'd like a starting point.",
    },
    {
      match: /\b(who are you|about you|background|story)/i,
      reply:
        "I'm Manish Karki — a web developer turned AI engineering intern, based in Kathmandu. I spent five years building WordPress sites and Python web apps before pivoting to AI in 2024. Now I'm focused on shipping LLM features that actually work in production. Full story is on the About page.",
    },
  ];

  const FALLBACK =
    "I can't answer that one from the tiny dictionary that powers this demo — I'd need to be hooked up to a real model. But happy to share how I'd approach it: I'd start by writing the question down as plainly as possible, sketch what a great answer looks like, then either RAG over a known source or run it through a few prompt variants with a small eval to compare. Try one of the suggestions below for something I can actually respond to.";

  const chatLog = $("#chat-log");
  const chatForm = $("#chat-form");
  const chatInput = $("#chat-input");

  const send = (who, text, html = false) => {
    const msg = document.createElement("div");
    msg.className = `chat-msg ${who}`;
    msg.innerHTML = `<span class="who">${who === "user" ? "you" : "bot"}</span><div class="bubble">${html ? text : ""}</div>`;
    chatLog.appendChild(msg);
    chatLog.scrollTop = chatLog.scrollHeight;
    return msg.querySelector(".bubble");
  };

  const typingDots = () => {
    const msg = document.createElement("div");
    msg.className = "chat-msg bot";
    msg.innerHTML = `<span class="who">bot</span><div class="bubble"><span class="typing"></span><span class="typing"></span><span class="typing"></span></div>`;
    chatLog.appendChild(msg);
    chatLog.scrollTop = chatLog.scrollHeight;
    return msg;
  };

  const stream = async (bubble, text) => {
    bubble.textContent = "";
    const words = text.split(" ");
    for (let i = 0; i < words.length; i++) {
      bubble.textContent += (i === 0 ? "" : " ") + words[i];
      chatLog.scrollTop = chatLog.scrollHeight;
      await sleep(28 + Math.random() * 30);
    }
  };

  const handleUser = async (text) => {
    if (!text.trim()) return;
    send("user", "", true).textContent = text;

    const dots = typingDots();
    await sleep(450 + Math.random() * 400);
    dots.remove();

    const match = RESPONSES.find((r) => r.match.test(text));
    const reply = match ? match.reply : FALLBACK;
    const bubble = send("bot", "", true);
    await stream(bubble, reply);
  };

  if (chatForm) {
    chatForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = chatInput.value;
      chatInput.value = "";
      handleUser(v);
    });

    $$(".chat-suggestion").forEach((b) =>
      b.addEventListener("click", () => {
        chatInput.value = b.textContent;
        chatInput.focus();
      })
    );

    // intro
    (async () => {
      await sleep(300);
      const dots = typingDots();
      await sleep(900);
      dots.remove();
      const b = send("bot", "", true);
      await stream(
        b,
        "Hi — this is a tiny in-browser demo, not a real LLM. Answers come from a small dictionary I wrote by hand. Try asking about RAG, evals, fine-tuning, or my background. Pick a suggestion below for a quick start."
      );
    })();
  }

  /* ─────────────────────────────────────────────
     2) TOKENIZER VISUALIZER
     a simplified BPE-ish split: words → subwords by greedy
     longest-suffix-in-vocab, with punctuation handled separately.
     ───────────────────────────────────────────── */

  const VOCAB_PREFIXES = new Set([
    "the", "a", "an", "and", "or", "but", "of", "in", "on", "at", "to", "for",
    "with", "from", "by", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "should",
    "could", "may", "might", "must", "can", "this", "that", "these", "those",
    "i", "you", "he", "she", "we", "they", "it", "my", "your", "our",
    "model", "embed", "embedding", "token", "tokens", "vector", "search",
    "rag", "llm", "ai", "ml", "prompt", "eval", "neural", "network",
    "python", "java", "script", "code", "data", "system", "language",
    "process", "process", "function", "training", "transform", "transformer",
    "attention", "context", "build", "build", "manish", "karki",
  ]);
  const SUFFIXES = ["ing", "ed", "ly", "s", "es", "er", "est", "tion", "ness", "able", "ment", "ize"];
  const COLORS = [
    "#34d39933", "#22d3ee33", "#fbbf2433", "#f8717133", "#a78bfa33",
    "#fb923c33", "#60a5fa33", "#f472b633", "#4ade8033", "#facc1533",
  ];

  const tokenize = (text) => {
    if (!text) return [];
    const tokens = [];
    // split into word/non-word atoms
    const atoms = text.match(/[\w']+|[^\s\w]+|\s+/g) || [];
    for (const atom of atoms) {
      if (/^\s+$/.test(atom)) { tokens.push({ kind: "ws", text: atom }); continue; }
      if (!/[\w']/.test(atom)) {
        // punctuation chunk → each char a token
        for (const c of atom) tokens.push({ kind: "punct", text: c });
        continue;
      }
      // word: try to split into prefix + suffix
      const lower = atom.toLowerCase();
      let consumed = 0;
      while (consumed < lower.length) {
        // find longest known prefix at this position
        let best = "";
        for (const w of VOCAB_PREFIXES) {
          if (lower.startsWith(w, consumed) && w.length > best.length) best = w;
        }
        if (best) {
          tokens.push({ kind: "word", text: atom.slice(consumed, consumed + best.length) });
          consumed += best.length;
          // then check for known suffix
          for (const s of SUFFIXES) {
            if (lower.startsWith(s, consumed)) {
              tokens.push({ kind: "subword", text: "##" + atom.slice(consumed, consumed + s.length) });
              consumed += s.length;
              break;
            }
          }
        } else {
          // fall back: 3-char chunks
          const chunk = Math.min(3, lower.length - consumed);
          tokens.push({ kind: "subword", text: (consumed === 0 ? "" : "##") + atom.slice(consumed, consumed + chunk) });
          consumed += chunk;
        }
      }
    }
    return tokens;
  };

  const tokInput = $("#tok-input");
  const tokOutput = $("#tok-output");
  const tokCount = $("#tok-count");
  const tokChars = $("#tok-chars");
  const tokRatio = $("#tok-ratio");

  const renderTokens = () => {
    if (!tokInput || !tokOutput) return;
    const text = tokInput.value;
    const tokens = tokenize(text);
    const real = tokens.filter((t) => t.kind !== "ws");
    tokOutput.innerHTML = "";
    if (!text.trim()) {
      tokOutput.innerHTML = `<span style="color:var(--text-mute);font-family:var(--mono);font-size:13px">Tokens will appear here.</span>`;
      tokCount.textContent = "0";
      tokChars.textContent = "0";
      tokRatio.textContent = "—";
      return;
    }
    tokens.forEach((t, i) => {
      if (t.kind === "ws") {
        tokOutput.appendChild(document.createTextNode(t.text));
        return;
      }
      const span = document.createElement("span");
      span.className = "tok";
      const realIdx = real.findIndex((x) => x === t);
      span.style.background = COLORS[realIdx % COLORS.length];
      span.textContent = t.text;
      tokOutput.appendChild(span);
    });
    tokCount.textContent = real.length;
    tokChars.textContent = text.length;
    tokRatio.textContent = real.length ? (text.length / real.length).toFixed(2) : "—";
  };
  if (tokInput) {
    tokInput.addEventListener("input", renderTokens);
    renderTokens();
  }

  /* ─────────────────────────────────────────────
     3) EMBEDDING SCATTER PLOT
     pre-computed 2D positions for word clusters,
     hover for tooltip
     ───────────────────────────────────────────── */

  // clusters of related words at hand-picked (x, y) positions.
  // intent: animals cluster, programming languages cluster, food cluster, etc.
  const EMBED_POINTS = [
    // animals (top-left)
    { w: "cat",     x: 0.18, y: 0.22, c: "#34d399" },
    { w: "dog",     x: 0.22, y: 0.18, c: "#34d399" },
    { w: "rabbit",  x: 0.15, y: 0.28, c: "#34d399" },
    { w: "horse",   x: 0.26, y: 0.24, c: "#34d399" },
    { w: "tiger",   x: 0.21, y: 0.32, c: "#34d399" },
    { w: "wolf",    x: 0.28, y: 0.30, c: "#34d399" },
    { w: "lion",    x: 0.19, y: 0.36, c: "#34d399" },
    { w: "fox",     x: 0.30, y: 0.20, c: "#34d399" },
    // programming languages (top-right)
    { w: "python",  x: 0.72, y: 0.20, c: "#22d3ee" },
    { w: "javascript", x: 0.78, y: 0.18, c: "#22d3ee" },
    { w: "rust",    x: 0.84, y: 0.22, c: "#22d3ee" },
    { w: "go",      x: 0.80, y: 0.28, c: "#22d3ee" },
    { w: "java",    x: 0.74, y: 0.30, c: "#22d3ee" },
    { w: "c++",     x: 0.86, y: 0.30, c: "#22d3ee" },
    { w: "ruby",    x: 0.76, y: 0.36, c: "#22d3ee" },
    { w: "php",     x: 0.82, y: 0.36, c: "#22d3ee" },
    // ML / AI terms (middle-right)
    { w: "transformer", x: 0.68, y: 0.50, c: "#a78bfa" },
    { w: "attention",   x: 0.74, y: 0.46, c: "#a78bfa" },
    { w: "embedding",   x: 0.72, y: 0.56, c: "#a78bfa" },
    { w: "gradient",    x: 0.78, y: 0.52, c: "#a78bfa" },
    { w: "neuron",      x: 0.66, y: 0.56, c: "#a78bfa" },
    { w: "vector",      x: 0.80, y: 0.58, c: "#a78bfa" },
    // food (bottom-left)
    { w: "pizza",   x: 0.18, y: 0.68, c: "#fbbf24" },
    { w: "burger",  x: 0.22, y: 0.72, c: "#fbbf24" },
    { w: "pasta",   x: 0.15, y: 0.74, c: "#fbbf24" },
    { w: "sushi",   x: 0.26, y: 0.66, c: "#fbbf24" },
    { w: "momo",    x: 0.30, y: 0.74, c: "#fbbf24" },
    { w: "dal",     x: 0.18, y: 0.78, c: "#fbbf24" },
    { w: "ramen",   x: 0.24, y: 0.82, c: "#fbbf24" },
    // cities (bottom-right)
    { w: "tokyo",    x: 0.70, y: 0.74, c: "#f472b6" },
    { w: "paris",    x: 0.76, y: 0.78, c: "#f472b6" },
    { w: "london",   x: 0.82, y: 0.74, c: "#f472b6" },
    { w: "kathmandu",x: 0.78, y: 0.84, c: "#f472b6" },
    { w: "new york", x: 0.72, y: 0.82, c: "#f472b6" },
    { w: "berlin",   x: 0.86, y: 0.80, c: "#f472b6" },
    // outlier
    { w: "manish",   x: 0.50, y: 0.50, c: "#34d399" },
  ];

  const embed = $("#embed-canvas");
  const tooltip = $("#embed-tooltip");
  if (embed && tooltip) {
    const draw = () => {
      embed.innerHTML = "";
      const r = embed.getBoundingClientRect();
      const w = r.width;
      const h = r.height;

      // background concentric grid + faint cluster ellipses
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("width", w);
      svg.setAttribute("height", h);
      svg.style.position = "absolute";
      svg.style.inset = "0";
      svg.style.pointerEvents = "none";

      // dotted grid
      for (let i = 0; i <= 10; i++) {
        for (let j = 0; j <= 10; j++) {
          const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          c.setAttribute("cx", (i / 10) * w);
          c.setAttribute("cy", (j / 10) * h);
          c.setAttribute("r", 0.7);
          c.setAttribute("fill", "rgba(255,255,255,0.06)");
          svg.appendChild(c);
        }
      }

      // faint cluster halos
      const clusters = {};
      EMBED_POINTS.forEach((p) => {
        if (!clusters[p.c]) clusters[p.c] = [];
        clusters[p.c].push(p);
      });
      Object.entries(clusters).forEach(([color, pts]) => {
        const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
        const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
        const c = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
        c.setAttribute("cx", cx * w);
        c.setAttribute("cy", cy * h);
        c.setAttribute("rx", w * 0.13);
        c.setAttribute("ry", h * 0.17);
        c.setAttribute("fill", color);
        c.setAttribute("opacity", "0.06");
        svg.appendChild(c);
      });

      embed.appendChild(svg);

      // points
      EMBED_POINTS.forEach((p) => {
        const dot = document.createElement("div");
        dot.style.position = "absolute";
        dot.style.left = `${p.x * w}px`;
        dot.style.top = `${p.y * h}px`;
        dot.style.width = "10px";
        dot.style.height = "10px";
        dot.style.background = p.c;
        dot.style.borderRadius = "50%";
        dot.style.transform = "translate(-50%, -50%)";
        dot.style.cursor = "pointer";
        dot.style.transition = "transform .2s cubic-bezier(.34,1.56,.64,1), box-shadow .2s ease";
        dot.style.boxShadow = `0 0 0 0 ${p.c}`;
        dot.title = p.w;
        dot.addEventListener("mouseenter", (e) => {
          dot.style.transform = "translate(-50%, -50%) scale(1.6)";
          dot.style.boxShadow = `0 0 0 6px ${p.c}33`;
          tooltip.textContent = p.w;
          tooltip.style.opacity = "1";
          const rect = embed.getBoundingClientRect();
          tooltip.style.left = `${e.clientX - rect.left + 12}px`;
          tooltip.style.top = `${e.clientY - rect.top - 8}px`;
        });
        dot.addEventListener("mousemove", (e) => {
          const rect = embed.getBoundingClientRect();
          tooltip.style.left = `${e.clientX - rect.left + 12}px`;
          tooltip.style.top = `${e.clientY - rect.top - 8}px`;
        });
        dot.addEventListener("mouseleave", () => {
          dot.style.transform = "translate(-50%, -50%)";
          dot.style.boxShadow = `0 0 0 0 ${p.c}`;
          tooltip.style.opacity = "0";
        });
        embed.appendChild(dot);
      });
      embed.appendChild(tooltip);
    };
    draw();
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(draw, 150);
    });
  }

  /* ─────────────────────────────────────────────
     4) VECTOR SEARCH OVER THE PORTFOLIO
     A tiny TF-IDF + cosine-similarity ranker
     over a hand-built corpus of site content.
     This is basically a mini-RAG retrieval step.
     ───────────────────────────────────────────── */

  const CORPUS = [
    {
      id: "docu-chat",
      title: "docu-chat — RAG over PDFs and markdown",
      url: ROOT + "projects/docu-chat.html",
      kind: "project",
      text: `A retrieval-augmented chatbot that answers questions over a folder of PDFs and markdown notes with citations. Built end-to-end to learn the full RAG loop: ingestion, chunking, embeddings, hybrid search BM25 vector, reranking with cross-encoder BGE, grounded answers with sources. FastAPI LangChain Chroma OpenAI. The three places I focused first: chunk by meaning not token count, hybrid search BM25 plus vector fused with reciprocal rank fusion, cross-encoder reranker over top 20 candidates.`
    },
    {
      id: "prompt-bench",
      title: "prompt-bench — evaluation harness for prompts",
      url: ROOT + "projects/prompt-bench.html",
      kind: "project",
      text: `A small evaluation harness for comparing prompt variants. Scores each variant on accuracy cost and p95 latency across a fixed test set. Built during my internship and used daily. Python pytest sqlite streamlit. LLM-as-judge with rubric and 10 percent manual sample review. Versioning prompts and the judge prompt itself. The biggest accuracy wins came from changes I would never have made by gut feel.`
    },
    {
      id: "neural-from-scratch",
      title: "neural-from-scratch — tiny NN library in NumPy",
      url: ROOT + "projects/neural-from-scratch.html",
      kind: "project",
      text: `A tiny neural network library in pure NumPy. Autograd Tensor with forward and backward closures. Layers linear relu sigmoid tanh softmax dropout batchnorm. Losses MSE cross-entropy. Optimizers SGD momentum Adam. MNIST trainer hits 97 percent test accuracy. 600 lines no dependencies except NumPy. Built to demystify PyTorch backprop. Numerical stability log softmax overflow.`
    },
    {
      id: "shelf",
      title: "shelf — Django bookkeeping app for solo founders",
      url: ROOT + "projects/shelf.html",
      kind: "project",
      text: `A Django app for a freelance client. Invoices expenses recurring billings month-end dashboard. Two years in production used daily. Django 5 PostgreSQL HTMX Alpine Tailwind Caddy droplet. Money cannot be a float DecimalField. Timezones USE_TZ true. Soft delete instead of confirmation modal. Audit logging from day one.`
    },
    {
      id: "kothi",
      title: "kothi — WordPress theme for boutique hotels",
      url: ROOT + "projects/kothi.html",
      kind: "project",
      text: `Custom WordPress theme and booking plugin for a chain of boutique hotels in Nepal. Performance budget 100kb above the fold mobile Lighthouse 98 plus. PHP WordPress ACF custom Gutenberg blocks vanilla JS CSS. AVIF WebP JPEG image pipeline. Direct bookings up 38 percent year over year after launch.`
    },
    {
      id: "about",
      title: "About Manish Karki",
      url: ROOT + "about.html",
      kind: "page",
      text: `Web developer turned AI engineering intern. Started in WordPress at 18 in Pokhara Nepal. Three years building sites for hotels hospitals shops. Pivoted to Python with Flask Django scrapers dashboards. Late 2023 saw the AI wave and never looked back. Now interning at an AI company learning to ship LLM features in production. Not a researcher will not publish papers. Five years of getting software to real users. Based in Kathmandu.`
    },
    {
      id: "principles",
      title: "How I work — principles",
      url: ROOT + "about.html",
      kind: "page",
      text: `Boring tools interesting problems. Make the feedback loop tight. Read the source. Ship to one real user. Eval everything LLM. Be kind to the next person. Build the eval before the prompt. Without a test set you are not iterating you are rearranging deck chairs.`
    },
    {
      id: "skills",
      title: "Stack and tools",
      url: ROOT + "about.html",
      kind: "page",
      text: `Python PyTorch LangChain LlamaIndex Hugging Face OpenAI Anthropic API RAG vector databases Chroma pgvector prompt evaluation Flask Django FastAPI Node React Tailwind PostgreSQL REST PHP WordPress ACF Docker Linux Cloudflare GitHub Actions Cursor Claude Code Neovim tmux zsh macOS Arch Linux.`
    },
    {
      id: "essay-rag-mistake",
      title: "The RAG mistake I made three times",
      url: ROOT + "writing/rag-mistake.html",
      kind: "essay",
      text: `Chunking by tokens not by meaning. Recursive splitter that prefers paragraphs then sentences then tokens. Hybrid search BM25 plus vector with reciprocal rank fusion. Cross-encoder reranker over top 20 candidates. Recall went from 0.71 to 0.89 on the eval set. Build the eval first not third.`
    },
    {
      id: "essay-wordpress",
      title: "WordPress was an apprenticeship",
      url: ROOT + "writing/wordpress-apprenticeship.html",
      kind: "essay",
      text: `Five years of WordPress sites taught me more about shipping software than any framework since. Non-technical authors caching gotchas plugin compatibility decade-old admin patterns. A working site that earns money beats a beautiful repo. Real users do not read modals. The undo button beats the warning dialog.`
    },
    {
      id: "essay-eval",
      title: "Eval-driven prompting",
      url: ROOT + "writing/eval-driven-prompting.html",
      kind: "essay",
      text: `Eval-driven prompting changed my life. Without a test set you are not iterating you are rearranging deck chairs. 30 to 100 fixed cases with categories. Accuracy cost p95 latency. LLM as judge with rubric sample 10 percent manually. Version the judge prompt. Per category breakdowns to catch regressions hidden by aggregate score.`
    },
    {
      id: "contact",
      title: "Contact and availability",
      url: ROOT + "contact.html",
      kind: "page",
      text: `Open to AI engineering roles junior associate or a meaty internship. Remote hybrid or relocation. Email hello at manishkarki dot dev. GitHub manishkarki. LinkedIn in manishkarki. Based in Kathmandu Nepal GMT plus 5 45. Looking for teams shipping LLM-backed features to real users not just prototypes.`
    },
  ];

  // Build TF-IDF index
  const STOPWORDS = new Set("a an the and or but if then so to of in on at by for with as is are was were be been being have has had do does did will would could should may might can not no this that these those it its from".split(" "));
  const tok = (s) =>
    s.toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w && !STOPWORDS.has(w) && w.length > 1);

  const docTerms = CORPUS.map((d) => tok(d.text + " " + d.title));
  const df = {};
  docTerms.forEach((terms) => {
    new Set(terms).forEach((t) => (df[t] = (df[t] || 0) + 1));
  });
  const N = CORPUS.length;
  const idf = (t) => Math.log((1 + N) / (1 + (df[t] || 0))) + 1;

  const tfidfVec = (terms) => {
    const tf = {};
    terms.forEach((t) => (tf[t] = (tf[t] || 0) + 1));
    const v = {};
    Object.entries(tf).forEach(([t, c]) => {
      v[t] = (c / terms.length) * idf(t);
    });
    return v;
  };

  const docVecs = docTerms.map(tfidfVec);

  const cosine = (a, b) => {
    let dot = 0, na = 0, nb = 0;
    for (const [t, av] of Object.entries(a)) {
      na += av * av;
      if (b[t]) dot += av * b[t];
    }
    for (const bv of Object.values(b)) nb += bv * bv;
    return dot && na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
  };

  const search = (q, k = 5) => {
    const qTerms = tok(q);
    if (!qTerms.length) return [];
    const qVec = tfidfVec(qTerms);
    const matchedTerms = new Set(qTerms);
    return CORPUS.map((d, i) => ({
      doc: d,
      score: cosine(qVec, docVecs[i]),
      matched: docTerms[i].filter((t) => matchedTerms.has(t)),
    }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  };

  const snippet = (text, qTerms, max = 180) => {
    const lower = text.toLowerCase();
    let bestIdx = 0;
    for (const t of qTerms) {
      const i = lower.indexOf(t);
      if (i >= 0) { bestIdx = Math.max(0, i - 40); break; }
    }
    let s = text.slice(bestIdx, bestIdx + max);
    if (bestIdx > 0) s = "… " + s;
    if (bestIdx + max < text.length) s = s + " …";
    // bold the query terms
    qTerms.forEach((t) => {
      if (t.length < 2) return;
      const re = new RegExp(`\\b(${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
      s = s.replace(re, "<mark>$1</mark>");
    });
    return s;
  };

  const KIND_LABELS = { project: "project", essay: "essay", page: "page" };

  const vsInput = $("#vs-input");
  const vsResults = $("#vs-results");
  const vsStats = $("#vs-stats");
  const renderSearch = () => {
    if (!vsInput || !vsResults) return;
    const q = vsInput.value.trim();
    if (!q) {
      vsResults.innerHTML = `<div class="vs-empty">Try <em>"how to evaluate prompts"</em>, <em>"hybrid search"</em>, or <em>"WordPress"</em>.</div>`;
      vsStats.textContent = `${CORPUS.length} documents indexed`;
      return;
    }
    const start = performance.now();
    const results = search(q, 5);
    const elapsed = (performance.now() - start).toFixed(1);
    if (!results.length) {
      vsResults.innerHTML = `<div class="vs-empty">No results — try different words. The corpus is small (${CORPUS.length} documents).</div>`;
      vsStats.textContent = `0 results · ${elapsed}ms`;
      return;
    }
    const qTerms = tok(q);
    vsResults.innerHTML = results
      .map(
        (r) => `
        <a class="vs-result" href="${r.doc.url}">
          <div class="vs-result-head">
            <span class="vs-kind vs-kind-${r.doc.kind}">${KIND_LABELS[r.doc.kind] || r.doc.kind}</span>
            <span class="vs-title">${r.doc.title}</span>
            <span class="vs-score">${(r.score * 100).toFixed(1)}</span>
          </div>
          <div class="vs-snippet">${snippet(r.doc.text, qTerms)}</div>
        </a>
      `
      )
      .join("");
    vsStats.textContent = `${results.length} results · ${elapsed}ms · ${CORPUS.length} docs indexed`;
  };
  if (vsInput) {
    vsInput.addEventListener("input", renderSearch);
    renderSearch();
    $$(".vs-suggestion").forEach((b) =>
      b.addEventListener("click", () => {
        vsInput.value = b.textContent.replace(/^["“]|["”]$/g, "");
        renderSearch();
        vsInput.focus();
      })
    );
  }

  /* ─────────────────────────────────────────────
     5) ATTENTION HEATMAP
     A canned but plausible multi-head attention
     visualizer. Hover over a token, see what
     it attends to in the chosen head.
     ───────────────────────────────────────────── */

  const ATT_SENTENCE = ["The", "model", "reads", "every", "token", "and", "decides", "what", "matters"];
  const N_T = ATT_SENTENCE.length;

  // Generate plausible per-head patterns:
  //  head 0: identity-ish (self-attention)
  //  head 1: previous-token bias
  //  head 2: subject ↔ verb bias (positions 1,2)
  //  head 3: long-range, last token attends globally
  const buildHead = (kind) => {
    const m = Array.from({ length: N_T }, () => Array(N_T).fill(0));
    for (let i = 0; i < N_T; i++) {
      for (let j = 0; j <= i; j++) {
        // causal mask
        let s = 0;
        if (kind === 0) s = i === j ? 4 : 0.1;
        else if (kind === 1) s = j === i - 1 ? 3 : (i === j ? 1 : 0.1);
        else if (kind === 2) {
          // subject-verb-ish: tokens 1 ("model") and 2 ("reads") strongly attend to each other
          if ((i === 2 && j === 1) || (i === 1 && j === 1)) s = 3.5;
          else if (j === i) s = 1;
          else s = 0.2 + 0.3 * Math.exp(-Math.abs(i - j) / 2);
        } else {
          // long-range: last token attends globally; others local
          if (i === N_T - 1) s = 1 + Math.sin(j * 1.3) * 0.6 + 0.8;
          else s = j === i ? 1.5 : Math.max(0, 0.5 - Math.abs(i - j) * 0.15);
        }
        m[i][j] = Math.exp(s);
      }
      // softmax over the row (over j <= i)
      const sum = m[i].reduce((a, b) => a + b, 0);
      if (sum > 0) for (let j = 0; j < N_T; j++) m[i][j] /= sum;
    }
    return m;
  };
  const HEADS = [0, 1, 2, 3].map(buildHead);

  const attRow = $("#att-row");
  const attHeads = $("#att-heads");
  const attHint = $("#att-hint");
  if (attRow && attHeads) {
    let currentHead = 0;
    let hoverIdx = N_T - 1;

    const renderTokens = () => {
      attRow.innerHTML = ATT_SENTENCE.map(
        (t, i) =>
          `<button class="att-tok" data-i="${i}" aria-label="Token ${t}">${t}</button>`
      ).join("");
    };

    const colorFor = (w) => {
      // w in [0, 1] → background opacity
      const alpha = Math.min(0.85, 0.05 + w * 1.1);
      return `rgba(52, 211, 153, ${alpha})`;
    };

    const highlight = (rowIdx) => {
      hoverIdx = rowIdx;
      const m = HEADS[currentHead];
      const row = m[rowIdx];
      const max = Math.max(...row);
      attRow.querySelectorAll(".att-tok").forEach((el, j) => {
        const norm = max > 0 ? row[j] / max : 0;
        const blocked = j > rowIdx; // causal mask
        el.style.background = blocked ? "transparent" : colorFor(norm);
        el.style.borderColor = j === rowIdx ? "var(--accent)" : (blocked ? "var(--border)" : "transparent");
        el.style.opacity = blocked ? "0.3" : "1";
        el.style.color = norm > 0.6 ? "#0a0d12" : "var(--text)";
      });
      const top3 = row
        .map((w, j) => ({ w, j }))
        .filter((x) => x.j <= rowIdx)
        .sort((a, b) => b.w - a.w)
        .slice(0, 3)
        .map((x) => `${ATT_SENTENCE[x.j]} <span style="color:var(--text-mute)">(${(x.w * 100).toFixed(0)}%)</span>`)
        .join(", ");
      attHint.innerHTML = `Token <strong style="color:var(--accent)">"${ATT_SENTENCE[rowIdx]}"</strong> attends to: ${top3}`;
    };

    const renderHeads = () => {
      attHeads.innerHTML = ["self", "previous", "subj↔verb", "long-range"]
        .map(
          (label, i) =>
            `<button class="att-head ${i === currentHead ? "active" : ""}" data-h="${i}">head ${i}<span class="hl">${label}</span></button>`
        )
        .join("");
    };

    renderTokens();
    renderHeads();
    highlight(hoverIdx);

    attRow.addEventListener("mouseover", (e) => {
      const b = e.target.closest(".att-tok");
      if (b) highlight(+b.dataset.i);
    });
    attRow.addEventListener("click", (e) => {
      const b = e.target.closest(".att-tok");
      if (b) highlight(+b.dataset.i);
    });
    attHeads.addEventListener("click", (e) => {
      const b = e.target.closest(".att-head");
      if (b) {
        currentHead = +b.dataset.h;
        renderHeads();
        highlight(hoverIdx);
      }
    });
  }
})();
