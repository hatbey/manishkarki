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
})();
