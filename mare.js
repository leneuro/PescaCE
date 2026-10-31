// Maré (Open-Meteo Marine API, variável sea_level_height_msl) e fase da lua (cálculo local).
// A Open-Meteo é gratuita, não precisa de chave e aceita chamadas direto do navegador.
// A altura vem relativa ao nível médio do mar (pode ser negativa). As tábuas da Marinha usam
// outro referencial (nível de redução), então os valores absolutos diferem, mas os horários
// de preia-mar/baixa-mar e a amplitude são comparáveis.

const Mare = (() => {
  const API = "https://marine-api.open-meteo.com/v1/marine";
  const FUSO = "America/Fortaleza";
  // Se o ponto do GPS cair em terra, tenta pontos um pouco mar adentro (no CE/RN o mar fica ao norte/leste).
  const DESLOCAMENTOS = [[0, 0], [0.08, 0], [0.08, 0.08], [0, 0.1], [0.2, 0], [0.2, 0.15], [0.35, 0], [-0.1, 0.2]];

  function somaDias(dataISO, n) {
    const d = new Date(dataISO + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }

  async function buscarJSON(url, ms = 15000) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms);
    try {
      const r = await fetch(url, { signal: ctl.signal });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.json();
    } finally {
      clearTimeout(t);
    }
  }

  async function serie(lat, lon, dataISO) {
    const ini = somaDias(dataISO, -1);
    const fim = somaDias(dataISO, 1);
    let ultimoErro;
    for (const [dLat, dLon] of DESLOCAMENTOS) {
      const la = (lat + dLat).toFixed(4);
      const lo = (lon + dLon).toFixed(4);
      const url = `${API}?latitude=${la}&longitude=${lo}&hourly=sea_level_height_msl&timezone=${encodeURIComponent(FUSO)}&start_date=${ini}&end_date=${fim}&cell_selection=sea`;
      try {
        const j = await buscarJSON(url);
        const v = j?.hourly?.sea_level_height_msl;
        if (Array.isArray(v) && v.filter((x) => x != null).length > 24) {
          return { tempos: j.hourly.time, valores: v, lat: j.latitude, lon: j.longitude };
        }
      } catch (e) {
        ultimoErro = e;
        if (e.name === "AbortError" || !navigator.onLine) break;
      }
    }
    throw ultimoErro || new Error("Sem dados de maré para este ponto");
  }

  // Encontra preia-mares e baixa-mares com interpolação parabólica entre as horas.
  function extremos(valores) {
    const out = [];
    for (let i = 1; i < valores.length - 1; i++) {
      const a = valores[i - 1], b = valores[i], c = valores[i + 1];
      if (a == null || b == null || c == null) continue;
      const max = b >= a && b > c;
      const min = b <= a && b < c;
      if (!max && !min) continue;
      const den = a - 2 * b + c;
      const off = den === 0 ? 0 : (0.5 * (a - c)) / den;
      out.push({ tipo: max ? "preia" : "baixa", t: i + off, h: b - 0.25 * (a - c) * off });
    }
    return out;
  }

  function interp(valores, t) {
    const i = Math.floor(t), f = t - i;
    const a = valores[i], b = valores[i + 1];
    if (a == null) return b;
    if (b == null) return a;
    return a + (b - a) * f;
  }

  const fmtHora = (horasDesdeInicioDoDia) => {
    let m = Math.round(horasDesdeInicioDoDia * 60);
    m = ((m % 1440) + 1440) % 1440;
    return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
  };
  const fmtDur = (horas) => {
    const m = Math.round(Math.abs(horas) * 60);
    const h = Math.floor(m / 60), mm = m % 60;
    return h ? `${h}h${String(mm).padStart(2, "0")}` : `${mm} min`;
  };

  // dataISO "AAAA-MM-DD", hora "HH:MM"
  async function consultar(lat, lon, dataISO, hora) {
    const s = await serie(lat, lon, dataISO);
    const [hh, mm] = hora.split(":").map(Number);
    const t = 24 + hh + mm / 60; // a série começa no dia anterior
    const v = s.valores;
    const ext = extremos(v);
    const altura = interp(v, t);
    const ant = [...ext].reverse().find((e) => e.t <= t);
    const prox = ext.find((e) => e.t > t);

    let fase = "desconhecida";
    if (ant && prox) fase = ant.tipo === "baixa" ? "enchendo" : "vazando";
    else {
      const d = interp(v, t + 0.25) - interp(v, t - 0.25);
      fase = d >= 0 ? "enchendo" : "vazando";
    }
    // "Estofo" (maré parada): até ~40 min de uma preia-mar ou baixa-mar.
    let estofo = null;
    const perto = [ant, prox].filter(Boolean).sort((x, y) => Math.abs(x.t - t) - Math.abs(y.t - t))[0];
    if (perto && Math.abs(perto.t - t) <= 0.67) estofo = perto.tipo;

    const doDia = ext
      .filter((e) => e.t >= 24 && e.t < 48)
      .map((e) => ({ tipo: e.tipo, hora: fmtHora(e.t - 24), h: +e.h.toFixed(2) }));
    const hDia = v.slice(24, 48).filter((x) => x != null);
    const amplitude = hDia.length ? Math.max(...hDia) - Math.min(...hDia) : null;

    const fmtExt = (e) =>
      e && {
        tipo: e.tipo,
        hora: fmtHora(e.t - 24),
        dia: e.t < 24 ? -1 : e.t >= 48 ? 1 : 0,
        h: +e.h.toFixed(2),
        distancia: fmtDur(e.t - t),
      };

    return {
      status: "ok",
      altura: +altura.toFixed(2),
      fase,
      estofo,
      anterior: fmtExt(ant),
      proxima: fmtExt(prox),
      tabua: doDia,
      amplitude: amplitude != null ? +amplitude.toFixed(2) : null,
      serie: v.slice(24, 49).map((x) => (x == null ? null : +x.toFixed(2))), // 00h..24h do dia
      ponto: { lat: s.lat, lon: s.lon },
      fonte: "Open-Meteo Marine (sea_level_height_msl)",
      consultadoEm: new Date().toISOString(),
    };
  }

  // ---------- Lua ----------
  const SINODICO = 29.530588853;
  const LUA_NOVA_REF = Date.UTC(2000, 0, 6, 18, 14) / 86400000; // em dias

  function lua(dataISO, hora) {
    // Horário de Fortaleza = UTC-3 (sem horário de verão)
    const [Y, M, D] = dataISO.split("-").map(Number);
    const [h, m] = hora.split(":").map(Number);
    const dias = Date.UTC(Y, M - 1, D, h + 3, m) / 86400000;
    let idade = (dias - LUA_NOVA_REF) % SINODICO;
    if (idade < 0) idade += SINODICO;
    const ilum = (1 - Math.cos((2 * Math.PI * idade) / SINODICO)) / 2;
    const fases = [
      [1.85, "Lua nova", "🌑"], [5.54, "Lua crescente", "🌒"], [9.23, "Quarto crescente", "🌓"],
      [12.92, "Crescente gibosa", "🌔"], [16.61, "Lua cheia", "🌕"], [20.3, "Minguante gibosa", "🌖"],
      [23.99, "Quarto minguante", "🌗"], [27.68, "Lua minguante", "🌘"], [99, "Lua nova", "🌑"],
    ];
    const [, nome, icone] = fases.find(([lim]) => idade < lim);
    // Sizígia (lua nova/cheia) = maré grande ("maré de lua"); quadratura = maré morta.
    const dSiz = Math.min(idade, Math.abs(idade - SINODICO / 2), SINODICO - idade);
    const tipoMare = dSiz <= 3 ? "Maré grande (de lua)" : dSiz >= 5.4 ? "Maré morta (pequena)" : "Maré média";
    return { nome, icone, idade: +idade.toFixed(1), iluminacao: Math.round(ilum * 100), tipoMare };
  }

  return { consultar, lua, extremos, fmtDur };
})();
