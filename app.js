(() => {
  "use strict";

  const CHAVE = "pesca.registros.v1";
  const REF_SEM_GPS = { lat: -3.7146, lon: -38.4767, nome: "Fortaleza (Mucuripe)" };
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const semAcento = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const num = (x, d = 1) => Number(x).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
  const pad = (n) => String(n).padStart(2, "0");

  // ---------- Estado ----------
  const est = { hora: null, minuto: null, especie: null, qtd: 1, filtro: "todos", busca: "" };
  let registros = carregar();
  const buscandoMare = new Set();
  let pos = null; // { lat, lon, acc, t }
  let local = null; // { nome, lat, lon }

  function carregar() {
    try { return JSON.parse(localStorage.getItem(CHAVE) || "[]"); } catch (e) { return []; }
  }
  function gravar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(registros)); }
    catch (e) { toast("Memória do celular cheia: não foi possível salvar."); }
  }

  function agora() { return new Date(); }
  function hojeISO() { const d = agora(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
  function dataLonga(iso) {
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  }
  function rotuloDia(iso) {
    const hoje = hojeISO();
    const ontem = new Date(); ontem.setDate(ontem.getDate() - 1);
    const ontemISO = `${ontem.getFullYear()}-${pad(ontem.getMonth() + 1)}-${pad(ontem.getDate())}`;
    if (iso === hoje) return "Hoje · " + dataLonga(iso);
    if (iso === ontemISO) return "Ontem · " + dataLonga(iso);
    return dataLonga(iso) + " de " + iso.slice(0, 4);
  }

  // ---------- Toast ----------
  let tToast;
  function toast(msg, ms = 2800) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("mostra");
    clearTimeout(tToast);
    tToast = setTimeout(() => t.classList.remove("mostra"), ms);
  }

  // ---------- Silhueta (quando a foto não carrega) ----------
  function silhueta(cor) {
    return `<svg viewBox="0 0 120 60" aria-hidden="true"><path fill="${cor}" opacity=".55" d="M8 30c14-17 40-24 64-18 9 2 17 7 24 12l16-12c2-1 4 0 3 2l-6 16 6 16c1 2-1 3-3 2L96 36c-7 5-15 10-24 12C48 54 22 47 8 30z"/><circle cx="26" cy="27" r="3.2" fill="#fff"/></svg>`;
  }
  function imgPeixe(id, grupo, alt) {
    const f = Fotos.de(id);
    const cor = (GRUPOS[grupo] || {}).cor || "#145a73";
    if (f && f.url) {
      return `<img src="${esc(f.url)}" alt="${esc(alt)}" loading="lazy" onerror="this.replaceWith(document.createRange().createContextualFragment(this.dataset.fb))" data-fb="${esc(silhueta(cor))}">`;
    }
    return silhueta(cor);
  }

  // ---------- Hora ----------
  function montarHoras() {
    const g = $("#grade-horas");
    const h = agora().getHours();
    g.innerHTML = Array.from({ length: 24 }, (_, i) => {
      const noite = i < 5 || i >= 18;
      const sel = est.hora === i ? " sel" : "";
      return `<button type="button" class="hora${noite ? " noite" : ""}${sel}" data-h="${i}" ${i > h ? "disabled" : ""} aria-pressed="${est.hora === i}">${pad(i)}h</button>`;
    }).join("");
    montarMinutos();
  }
  function montarMinutos() {
    const d = agora();
    const g = $("#grade-min");
    g.innerHTML = [0, 10, 20, 30, 40, 50].map((m) => {
      const futuro = est.hora === d.getHours() && m > d.getMinutes();
      return `<button type="button" class="min${est.minuto === m ? " sel" : ""}" data-m="${m}" ${futuro ? "disabled" : ""} aria-pressed="${est.minuto === m}">${pad(m)}</button>`;
    }).join("");
  }
  $("#grade-horas").addEventListener("click", (e) => {
    const b = e.target.closest(".hora");
    if (!b || b.disabled) return;
    est.hora = +b.dataset.h;
    if (est.minuto == null) est.minuto = 0;
    const d = agora();
    if (est.hora === d.getHours() && est.minuto > d.getMinutes()) est.minuto = Math.floor(d.getMinutes() / 10) * 10;
    montarHoras();
    atualizarResumoSel();
  });
  $("#grade-min").addEventListener("click", (e) => {
    const b = e.target.closest(".min");
    if (!b || b.disabled) return;
    est.minuto = +b.dataset.m;
    if (est.hora == null) est.hora = agora().getHours();
    montarHoras();
    atualizarResumoSel();
  });
  $("#btn-agora").addEventListener("click", () => {
    const d = agora();
    est.hora = d.getHours();
    est.minuto = Math.floor(d.getMinutes() / 10) * 10;
    montarHoras();
    atualizarResumoSel();
  });

  // ---------- Peixes ----------
  function montarFiltros() {
    const ops = [["todos", "Todos"], ...Object.entries(GRUPOS).map(([k, g]) => [k, g.nome])];
    $("#filtros").innerHTML = ops.map(([k, n]) =>
      `<button type="button" role="tab" class="filtro${est.filtro === k ? " sel" : ""}" data-f="${k}" aria-selected="${est.filtro === k}">${esc(n)}</button>`).join("");
  }
  $("#filtros").addEventListener("click", (e) => {
    const b = e.target.closest(".filtro");
    if (!b) return;
    est.filtro = b.dataset.f;
    montarFiltros();
    montarPeixes();
  });
  $("#busca").addEventListener("input", (e) => {
    est.busca = semAcento(e.target.value.trim());
    montarPeixes();
  });

  function montarPeixes() {
    const lista = ESPECIES.filter((e) => {
      if (est.filtro !== "todos" && e.grupo !== est.filtro) return false;
      if (!est.busca) return true;
      return semAcento(`${e.nome} ${e.outros} ${e.cientifico}`).includes(est.busca);
    });
    const cards = lista.map((e) => {
      const g = GRUPOS[e.grupo];
      return `<button type="button" class="peixe${est.especie === e.id ? " sel" : ""}" data-id="${e.id}" aria-pressed="${est.especie === e.id}">
        <div class="foto">${imgPeixe(e.id, e.grupo, e.nome)}<span class="marca-grupo" style="background:${g.cor}" title="${esc(g.nome)}"></span><span class="check">✓</span></div>
        <div class="info"><div class="nome">${esc(e.nome)}</div><div class="apelido">${esc(e.outros)}</div><div class="cient">${esc(e.cientifico)}</div></div>
      </button>`;
    });
    if (!lista.length) cards.push(`<div class="vazio">Nenhum peixe encontrado. Use “Outro peixe”.</div>`);
    cards.push(`<button type="button" class="peixe outro${est.especie === "outro" ? " sel" : ""}" data-id="outro" aria-pressed="${est.especie === "outro"}">
      <div class="foto">＋<span class="check">✓</span></div>
      <div class="info"><div class="nome">Outro peixe</div><div class="apelido">Digitar o nome</div></div></button>`);
    $("#grade-peixes").innerHTML = cards.join("");
  }
  $("#grade-peixes").addEventListener("click", (e) => {
    const b = e.target.closest(".peixe");
    if (!b) return;
    est.especie = est.especie === b.dataset.id ? null : b.dataset.id;
    $("#campo-outro").hidden = est.especie !== "outro";
    montarPeixes();
    atualizarResumoSel();
    if (est.especie === "outro") $("#nome-outro").focus();
  });
  $("#nome-outro").addEventListener("input", atualizarResumoSel);

  // ---------- Quantidade ----------
  function mudarQtd(d) {
    est.qtd = Math.max(1, Math.min(999, est.qtd + d));
    $("#qtd").textContent = est.qtd;
    atualizarResumoSel();
  }
  $("#qtd-menos").addEventListener("click", () => mudarQtd(-1));
  $("#qtd-mais").addEventListener("click", () => mudarQtd(1));

  function nomeSelecionado() {
    if (est.especie === "outro") return $("#nome-outro").value.trim();
    const e = ESPECIES.find((x) => x.id === est.especie);
    return e ? e.nome : "";
  }
  function atualizarResumoSel() {
    const nome = nomeSelecionado();
    const temHora = est.hora != null && est.minuto != null;
    const ok = temHora && nome;
    $("#btn-salvar").disabled = !ok;
    const partes = [];
    partes.push(temHora ? `<b>${pad(est.hora)}:${pad(est.minuto)}</b>` : "escolha a hora");
    partes.push(nome ? `<b>${esc(est.qtd > 1 ? est.qtd + "× " : "")}${esc(nome)}</b>` : "escolha o peixe");
    $("#resumo-sel").innerHTML = partes.join(" · ");
  }

  // ---------- GPS ----------
  function chipGPS(estado, texto) {
    const c = $("#chip-gps");
    c.classList.remove("ok", "erro");
    if (estado) c.classList.add(estado);
    $("#gps-texto").textContent = texto;
  }
  function distKm(a, b) {
    const R = 6371, r = Math.PI / 180;
    const dLa = (b.lat - a.lat) * r, dLo = (b.lon - a.lon) * r;
    const x = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  async function nomeDoLugar(lat, lon) {
    if (local && distKm(local, { lat, lon }) < 2) return local.nome;
    if (!navigator.onLine) return null;
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=14&accept-language=pt-BR&lat=${lat}&lon=${lon}`);
      const j = await r.json();
      const a = j.address || {};
      const lugar = a.village || a.suburb || a.town || a.city_district || a.hamlet || a.city || a.municipality;
      const cidade = a.city || a.town || a.municipality;
      const uf = (a["ISO3166-2-lvl4"] || "").replace("BR-", "");
      let nome = lugar && cidade && lugar !== cidade ? `${lugar}, ${cidade}` : lugar || cidade || j.name;
      if (!nome) return null;
      if (uf) nome += ` – ${uf}`;
      local = { nome, lat, lon };
      return nome;
    } catch (e) { return null; }
  }
  function aoPosicionar(p) {
    pos = { lat: p.coords.latitude, lon: p.coords.longitude, acc: Math.round(p.coords.accuracy), t: Date.now() };
    chipGPS("ok", local ? local.nome : `${pos.lat.toFixed(3)}, ${pos.lon.toFixed(3)}`);
    nomeDoLugar(pos.lat, pos.lon).then((n) => n && chipGPS("ok", n));
  }
  function erroGPS(e) {
    if (pos) return;
    const msg = e && e.code === 1 ? "GPS bloqueado" : "Sem GPS";
    chipGPS("erro", msg);
  }
  let vigia = null;
  function iniciarGPS() {
    if (!("geolocation" in navigator)) { chipGPS("erro", "Sem GPS"); return; }
    if (vigia != null) navigator.geolocation.clearWatch(vigia);
    chipGPS(null, "Localizando…");
    vigia = navigator.geolocation.watchPosition(aoPosicionar, erroGPS, { enableHighAccuracy: true, maximumAge: 60000, timeout: 30000 });
  }
  function posicaoAgora() {
    return new Promise((ok) => {
      if (pos && Date.now() - pos.t < 5 * 60000) return ok(pos);
      if (!("geolocation" in navigator)) return ok(null);
      navigator.geolocation.getCurrentPosition(
        (p) => { aoPosicionar(p); ok(pos); },
        () => ok(pos),
        { enableHighAccuracy: true, maximumAge: 60000, timeout: 12000 }
      );
    });
  }
  $("#chip-gps").addEventListener("click", () => {
    if ($("#chip-gps").classList.contains("erro")) {
      toast("Permita o acesso à localização nas configurações do navegador.", 4000);
    }
    iniciarGPS();
  });

  // ---------- Salvar ----------
  $("#btn-salvar").addEventListener("click", async () => {
    const nome = nomeSelecionado();
    if (est.hora == null || est.minuto == null || !nome) return;
    const btn = $("#btn-salvar");
    btn.disabled = true;
    btn.textContent = "Pegando localização…";
    const p = await posicaoAgora();
    const esp = ESPECIES.find((x) => x.id === est.especie);
    const pesoTxt = $("#peso").value.replace(",", ".");
    const peso = parseFloat(pesoTxt);
    const data = hojeISO();
    const hora = `${pad(est.hora)}:${pad(est.minuto)}`;
    const reg = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      data, hora,
      especieId: esp ? esp.id : "outro",
      nome,
      cientifico: esp ? esp.cientifico : "",
      grupo: esp ? esp.grupo : "",
      qtd: est.qtd,
      pesoKg: isFinite(peso) && peso > 0 ? +peso.toFixed(2) : null,
      local: p ? { lat: +p.lat.toFixed(5), lon: +p.lon.toFixed(5), acc: p.acc, nome: local && distKm(local, p) < 2 ? local.nome : null } : null,
      lua: Mare.lua(data, hora),
      mare: { status: "pendente" },
      criadoEm: new Date().toISOString(),
    };
    registros.push(reg);
    gravar();
    // limpar seleção (mantém a hora para registrar outro peixe do mesmo momento)
    est.especie = null; est.qtd = 1;
    $("#qtd").textContent = "1"; $("#peso").value = ""; $("#nome-outro").value = "";
    $("#campo-outro").hidden = true; $("#busca").value = ""; est.busca = "";
    montarPeixes();
    btn.textContent = "Salvar pesca";
    atualizarResumoSel();
    atualizarContador();
    toast(p ? `${nome} salvo às ${hora}! Buscando a maré…` : `${nome} salvo às ${hora} (sem GPS).`);
    renderLista();
    buscarMare(reg);
  });

  // ---------- Maré ----------
  async function buscarMare(reg) {
    if (buscandoMare.has(reg.id)) return;
    if (!navigator.onLine) { reg.mare = { status: "pendente" }; gravar(); renderLista(); return; }
    buscandoMare.add(reg.id);
    renderLista();
    const ref = reg.local || REF_SEM_GPS;
    try {
      const m = await Mare.consultar(ref.lat, ref.lon, reg.data, reg.hora);
      if (!reg.local) m.referencia = REF_SEM_GPS.nome;
      reg.mare = m;
    } catch (e) {
      reg.mare = { status: navigator.onLine ? "erro" : "pendente", erro: String(e.message || e) };
    }
    if (reg.local && !reg.local.nome) reg.local.nome = await nomeDoLugar(reg.local.lat, reg.local.lon);
    buscandoMare.delete(reg.id);
    gravar();
    renderLista();
  }
  function processarPendentes() {
    registros.filter((r) => r.mare.status !== "ok").forEach(buscarMare);
  }

  // ---------- Histórico ----------
  function atualizarContador() {
    const c = $("#contador");
    c.hidden = !registros.length;
    c.textContent = registros.length;
  }

  function textoFase(m) {
    if (m.estofo) return { cls: "estofo", txt: m.estofo === "preia" ? "⏸ Estofo de preia-mar" : "⏸ Estofo de baixa-mar" };
    if (m.fase === "enchendo") return { cls: "enchendo", txt: "↑ Maré enchendo" };
    if (m.fase === "vazando") return { cls: "vazando", txt: "↓ Maré vazando" };
    return { cls: "", txt: "Maré" };
  }
  const nomeExt = (t) => (t === "preia" ? "preia-mar" : "baixa-mar");
  const sinal = (h) => (h > 0 ? "+" : h < 0 ? "−" : "") + num(Math.abs(h), 2);

  function grafico(m, hora) {
    const s = m.serie || [];
    const vals = s.filter((x) => x != null);
    if (vals.length < 6) return "";
    const W = 340, H = 145, pl = 30, pr = 12, pt = 20, pb = 36;
    const mn = Math.min(...vals), mx = Math.max(...vals);
    const fy = (v) => pt + (H - pt - pb) * (1 - (v - mn) / ((mx - mn) || 1));
    const fx = (t) => pl + (W - pl - pr) * (t / 24);
    let d = "", areaD = "";
    s.forEach((v, i) => { if (v == null) return; d += (d ? "L" : "M") + fx(i).toFixed(1) + " " + fy(v).toFixed(1); });
    areaD = d + `L${fx(s.length - 1).toFixed(1)} ${H - pb}L${fx(0)} ${H - pb}Z`;
    const [hh, mm] = hora.split(":").map(Number);
    const tc = hh + mm / 60;
    const yc = fy(m.altura);
    const marcas = [0, 6, 12, 18, 24].map((h) => `<text x="${fx(h)}" y="${H - 5}" font-size="10" text-anchor="middle" fill="#4b5d66">${pad(h % 24)}h</text>`).join("");
    const ext = (m.tabua || []).map((e) => {
      const [a, b] = e.hora.split(":").map(Number);
      const x = fx(a + b / 60), y = fy(e.h);
      const cor = e.tipo === "preia" ? "#1d7fb0" : "#c07a18";
      return `<circle cx="${x}" cy="${y}" r="3" fill="${cor}"/><text x="${x}" y="${e.tipo === "preia" ? y - 6 : y + 13}" font-size="9.5" text-anchor="middle" fill="${cor}" font-weight="700">${e.hora}</text>`;
    }).join("");
    return `<svg class="grafico-mare" viewBox="0 0 ${W} ${H}" role="img" aria-label="Curva da maré do dia">
      <text x="2" y="${fy(mx) + 3}" font-size="9.5" fill="#4b5d66">${sinal(mx)}</text>
      <text x="2" y="${fy(mn) + 3}" font-size="9.5" fill="#4b5d66">${sinal(mn)}</text>
      <line x1="${pl}" x2="${W - pr}" y1="${H - pb}" y2="${H - pb}" stroke="#d9e2e5"/>
      <path d="${areaD}" fill="#e3f1f4"/>
      <path d="${d}" fill="none" stroke="#145a73" stroke-width="2"/>
      ${ext}
      <line x1="${fx(tc)}" x2="${fx(tc)}" y1="${pt - 4}" y2="${H - pb}" stroke="#e2603b" stroke-width="1.5" stroke-dasharray="3 3"/>
      <circle cx="${fx(tc)}" cy="${yc}" r="5.5" fill="#e2603b" stroke="#fff" stroke-width="2"/>
      ${marcas}
    </svg>`;
  }

  function tagsMare(r) {
    if (buscandoMare.has(r.id)) return `<span class="tag pendente">⏳ Buscando maré…</span>`;
    const m = r.mare || {};
    if (m.status === "pendente") return `<span class="tag pendente">⏳ Maré pendente (sem internet)</span>`;
    if (m.status === "erro") return `<span class="tag erro">⚠ Maré indisponível</span>`;
    if (m.status !== "ok") return "";
    const f = textoFase(m);
    let t = `<span class="tag ${f.cls}">${f.txt}</span>`;
    if (m.proxima && !m.estofo) t += `<span class="tag">${nomeExt(m.proxima.tipo)} às ${m.proxima.hora}${m.proxima.dia === 1 ? " (amanhã)" : ""}</span>`;
    return t;
  }

  function detalhe(r) {
    const m = r.mare || {};
    let h = "";
    if (m.status === "ok") {
      h += grafico(m, r.hora);
      h += `<div class="det-linha"><span>Altura na hora da pesca</span><span><b>${sinal(m.altura)} m</b> (nível médio)</span></div>`;
      if (m.anterior) h += `<div class="det-linha"><span>Última ${nomeExt(m.anterior.tipo)}</span><span>${m.anterior.hora}${m.anterior.dia === -1 ? " (ontem)" : ""} · há ${m.anterior.distancia}</span></div>`;
      if (m.proxima) h += `<div class="det-linha"><span>Próxima ${nomeExt(m.proxima.tipo)}</span><span>${m.proxima.hora}${m.proxima.dia === 1 ? " (amanhã)" : ""} · em ${m.proxima.distancia}</span></div>`;
      if (m.amplitude != null) h += `<div class="det-linha"><span>Amplitude do dia</span><span>${num(m.amplitude, 2)} m</span></div>`;
      if (m.tabua && m.tabua.length) {
        h += `<table class="tabua"><thead><tr><th>Tábua do dia</th><th>Hora</th><th>Altura</th></tr></thead><tbody>` +
          m.tabua.map((e) => `<tr><td>${e.tipo === "preia" ? "🔵 Preia-mar" : "🟠 Baixa-mar"}</td><td>${e.hora}</td><td>${sinal(e.h)} m</td></tr>`).join("") +
          `</tbody></table>`;
      }
      if (m.referencia) h += `<p class="nota">Sem GPS nesta pesca: maré calculada para ${esc(m.referencia)}.</p>`;
    } else if (m.status === "erro") {
      h += `<p class="nota">Não foi possível buscar a maré (${esc(m.erro || "erro")}). Toque em “Buscar maré de novo”.</p>`;
    }
    const l = r.lua;
    if (l) h += `<div class="det-linha"><span>Lua</span><span>${l.icone} ${l.nome} · ${l.iluminacao}% iluminada</span></div>
      <div class="det-linha"><span>Tipo de maré</span><span>${l.tipoMare}</span></div>`;
    if (r.local) {
      h += `<div class="det-linha"><span>Local</span><span>${esc(r.local.nome || "")}${r.local.nome ? "<br>" : ""}${r.local.lat}, ${r.local.lon} <small>(±${r.local.acc} m)</small></span></div>`;
    } else {
      h += `<div class="det-linha"><span>Local</span><span>Sem GPS</span></div>`;
    }
    if (r.pesoKg) h += `<div class="det-linha"><span>Peso total</span><span>${num(r.pesoKg, 1)} kg</span></div>`;
    h += `<div class="reg-botoes">`;
    if (r.local) h += `<a href="https://www.google.com/maps?q=${r.local.lat},${r.local.lon}" target="_blank" rel="noopener">🗺 Ver no mapa</a>`;
    h += `<button type="button" data-acao="mare" data-id="${r.id}">↻ Buscar maré de novo</button>`;
    h += `<button type="button" class="apagar" data-acao="apagar" data-id="${r.id}">Apagar</button></div>`;
    if (m.status === "ok") h += `<p class="nota">Maré estimada por modelo oceânico (Open-Meteo), altura em relação ao nível médio do mar. Pode diferir alguns minutos da tábua oficial da Marinha.</p>`;
    return h;
  }

  const abertos = new Set();
  function renderLista() {
    atualizarContador();
    const lista = $("#lista");
    if (!registros.length) {
      $("#resumo").innerHTML = "";
      lista.innerHTML = `<div class="lista-vazia"><div class="grande">🎣</div><p>Nenhuma pesca registrada ainda.<br>Toque em <b>Registrar</b> para começar.</p></div>`;
      return;
    }
    renderResumo();
    const ord = [...registros].sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora) || b.criadoEm.localeCompare(a.criadoEm));
    let html = "", dia = "";
    ord.forEach((r) => {
      if (r.data !== dia) { dia = r.data; html += `<div class="dia-titulo">${esc(rotuloDia(dia))}</div>`; }
      const sub = [`${r.qtd} ${r.qtd > 1 ? "peixes" : "peixe"}`];
      if (r.pesoKg) sub.push(`${num(r.pesoKg, 1)} kg`);
      if (r.local && r.local.nome) sub.push(r.local.nome);
      else if (!r.local) sub.push("sem GPS");
      const aberto = abertos.has(r.id);
      html += `<article class="registro">
        <div class="reg-topo">
          <div class="reg-foto">${imgPeixe(r.especieId, r.grupo, r.nome)}</div>
          <div class="reg-titulo"><div class="n">${esc(r.nome)}</div><div class="s">${esc(sub.join(" · "))}</div></div>
          <div class="reg-hora">${r.hora}</div>
        </div>
        <div class="reg-mare">${tagsMare(r)}${r.lua ? `<span class="tag">${r.lua.icone} ${r.lua.nome}</span>` : ""}</div>
        <div class="reg-detalhe" ${aberto ? "" : "hidden"}>${aberto ? detalhe(r) : ""}</div>
        <button type="button" class="reg-abrir" data-acao="abrir" data-id="${r.id}">${aberto ? "Fechar detalhes ▲" : "Ver maré e detalhes ▼"}</button>
      </article>`;
    });
    lista.innerHTML = html;
  }

  function renderResumo() {
    const total = registros.reduce((s, r) => s + r.qtd, 0);
    const porEsp = {};
    registros.forEach((r) => (porEsp[r.nome] = (porEsp[r.nome] || 0) + r.qtd));
    const top = Object.entries(porEsp).sort((a, b) => b[1] - a[1])[0];
    const dias = new Set(registros.map((r) => r.data)).size;
    const f = { enchendo: 0, vazando: 0, estofo: 0 };
    registros.forEach((r) => {
      if (r.mare && r.mare.status === "ok") f[r.mare.estofo ? "estofo" : r.mare.fase] = (f[r.mare.estofo ? "estofo" : r.mare.fase] || 0) + r.qtd;
    });
    const tf = f.enchendo + f.vazando + f.estofo;
    let barra = "";
    if (tf) {
      const p = (x) => Math.round((100 * x) / tf);
      barra = `<div class="barra-mare">Seus peixes por maré
        <div class="trilha"><span style="width:${p(f.enchendo)}%;background:#1d7fb0"></span><span style="width:${p(f.vazando)}%;background:#c07a18"></span><span style="width:${p(f.estofo)}%;background:#6a72b8"></span></div>
        <div class="leg"><span><i style="background:#1d7fb0"></i>Enchendo ${p(f.enchendo)}%</span><span><i style="background:#c07a18"></i>Vazando ${p(f.vazando)}%</span><span><i style="background:#6a72b8"></i>Estofo ${p(f.estofo)}%</span></div></div>`;
    }
    $("#resumo").innerHTML = `
      <div class="kpi"><div class="v">${total}</div><div class="r">peixes</div></div>
      <div class="kpi"><div class="v">${dias}</div><div class="r">${dias > 1 ? "dias de pesca" : "dia de pesca"}</div></div>
      <div class="kpi"><div class="v" style="font-size:16px">${esc(top ? top[0] : "—")}</div><div class="r">mais pescado</div></div>
      ${barra}`;
  }

  $("#lista").addEventListener("click", (e) => {
    const b = e.target.closest("[data-acao]");
    if (!b) return;
    const r = registros.find((x) => x.id === b.dataset.id);
    if (!r) return;
    if (b.dataset.acao === "abrir") {
      abertos.has(r.id) ? abertos.delete(r.id) : abertos.add(r.id);
      renderLista();
    } else if (b.dataset.acao === "mare") {
      if (!navigator.onLine) return toast("Sem internet agora. Tente quando tiver sinal.");
      buscarMare(r);
    } else if (b.dataset.acao === "apagar") {
      if (!confirm(`Apagar ${r.nome} das ${r.hora}?`)) return;
      registros = registros.filter((x) => x.id !== r.id);
      gravar();
      renderLista();
      toast("Registro apagado.");
    }
  });

  // ---------- Exportar / compartilhar ----------
  $("#btn-csv").addEventListener("click", () => {
    if (!registros.length) return toast("Ainda não há pescas para baixar.");
    const cab = ["data", "hora", "peixe", "nome_cientifico", "quantidade", "peso_kg", "latitude", "longitude", "precisao_gps_m", "local",
      "mare_fase", "mare_altura_m", "mare_anterior", "mare_proxima", "amplitude_dia_m", "lua", "tipo_mare"];
    const dec = (x, d = 2) => (x == null || x === "" ? "" : num(x, d));
    const linhas = [...registros].sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora)).map((r) => {
      const m = r.mare && r.mare.status === "ok" ? r.mare : null;
      return [
        r.data.split("-").reverse().join("/"), r.hora, r.nome, r.cientifico, r.qtd, dec(r.pesoKg, 1),
        r.local ? dec(r.local.lat, 5) : "", r.local ? dec(r.local.lon, 5) : "", r.local ? r.local.acc : "", r.local ? r.local.nome || "" : "",
        m ? (m.estofo ? `estofo de ${nomeExt(m.estofo)}` : m.fase) : "", m ? dec(m.altura) : "",
        m && m.anterior ? `${nomeExt(m.anterior.tipo)} ${m.anterior.hora}` : "", m && m.proxima ? `${nomeExt(m.proxima.tipo)} ${m.proxima.hora}` : "",
        m ? dec(m.amplitude) : "", r.lua ? r.lua.nome : "", r.lua ? r.lua.tipoMare : "",
      ];
    });
    const csv = "﻿" + [cab, ...linhas].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `diario-de-pesca-${hojeISO()}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  });

  $("#btn-compartilhar").addEventListener("click", async () => {
    if (!registros.length) return toast("Ainda não há pescas para compartilhar.");
    const ultimoDia = registros.map((r) => r.data).sort().pop();
    const doDia = registros.filter((r) => r.data === ultimoDia).sort((a, b) => a.hora.localeCompare(b.hora));
    const linhas = doDia.map((r) => {
      const m = r.mare && r.mare.status === "ok" ? r.mare : null;
      const mt = m ? ` – ${m.estofo ? "estofo de " + nomeExt(m.estofo) : "maré " + m.fase}` : "";
      return `• ${r.hora} ${r.qtd > 1 ? r.qtd + "× " : ""}${r.nome}${r.pesoKg ? ` (${num(r.pesoKg, 1)} kg)` : ""}${mt}`;
    });
    const lugar = doDia.find((r) => r.local && r.local.nome);
    const lua = doDia[0].lua;
    const texto = `🎣 Pesca de ${dataLonga(ultimoDia)}${lugar ? " em " + lugar.local.nome : ""}\n${lua ? lua.icone + " " + lua.nome + "\n" : ""}${linhas.join("\n")}`;
    try {
      if (navigator.share) await navigator.share({ title: "Diário de Pesca", text: texto });
      else { await navigator.clipboard.writeText(texto); toast("Resumo copiado. Cole no WhatsApp."); }
    } catch (e) {}
  });

  // ---------- Abas ----------
  document.querySelectorAll(".aba").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll(".aba").forEach((x) => x.classList.toggle("ativa", x === b));
    document.querySelectorAll(".tela").forEach((t) => t.classList.toggle("ativa", t.id === b.dataset.tela));
    $("#barra-salvar").classList.toggle("oculta", b.dataset.tela !== "tela-registrar");
    if (b.dataset.tela === "tela-historico") { renderLista(); renderCreditos(); }
    window.scrollTo(0, 0);
  }));

  function renderCreditos() {
    const itens = ESPECIES.map((e) => {
      const f = Fotos.de(e.id);
      if (!f) return `<li>${esc(e.nome)}: sem foto (ilustração do app)</li>`;
      const lic = f.licencaUrl ? `<a href="${esc(f.licencaUrl)}" target="_blank" rel="noopener">${esc(f.licenca)}</a>` : esc(f.licenca);
      const fonte = f.fonte ? ` · <a href="${esc(f.fonte)}" target="_blank" rel="noopener">fonte</a>` : "";
      return `<li><b>${esc(e.nome)}</b> (<i>${esc(e.cientifico)}</i>): ${esc(f.autor)}${lic ? ", " + lic : ""}${fonte}</li>`;
    });
    $("#lista-creditos").innerHTML = itens.join("");
  }

  // ---------- Online / offline ----------
  function statusRede() {
    $("#aviso-offline").hidden = navigator.onLine;
    if (navigator.onLine) processarPendentes();
  }
  window.addEventListener("online", statusRede);
  window.addEventListener("offline", statusRede);

  // ---------- Início ----------
  const cabData = () => { const s = dataLonga(hojeISO()); return s.charAt(0).toUpperCase() + s.slice(1); };
  $("#hoje").textContent = cabData();
  montarHoras();
  montarFiltros();
  montarPeixes();
  atualizarResumoSel();
  atualizarContador();
  renderLista();
  iniciarGPS();
  statusRede();
  Fotos.carregar(ESPECIES, () => { montarPeixes(); renderLista(); renderCreditos(); });
  setInterval(() => { $("#hoje").textContent = cabData(); montarHoras(); }, 60000);

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
