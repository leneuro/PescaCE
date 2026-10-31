// Fotos dos peixes com licença livre, buscadas no Wikipedia (imagem principal do verbete,
// filtrada com pilicense=free) e com autor/licença lidos do Wikimedia Commons.
// O resultado fica guardado no celular por 30 dias e as imagens ficam no cache para uso offline.

const Fotos = (() => {
  const CHAVE = "pesca.fotos.v1";
  const VALIDADE = 30 * 24 * 3600 * 1000;
  let dados = {};

  function lerCache() {
    try {
      const c = JSON.parse(localStorage.getItem(CHAVE) || "null");
      if (c && Date.now() - c.ts < VALIDADE) return c.dados;
    } catch (e) {}
    return null;
  }
  function salvarCache() {
    try { localStorage.setItem(CHAVE, JSON.stringify({ ts: Date.now(), dados })); } catch (e) {}
  }

  async function json(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }

  async function imagensDoWiki(dominio, especies) {
    const titulos = especies.map((e) => e.cientifico).join("|");
    const url = `https://${dominio}/w/api.php?action=query&format=json&origin=*&redirects=1` +
      `&prop=pageimages&piprop=thumbnail|name&pithumbsize=480&pilicense=free&titles=${encodeURIComponent(titulos)}`;
    const j = await json(url);
    const q = j.query || {};
    const mapa = {};
    (q.normalized || []).forEach((n) => (mapa[n.from] = n.to));
    (q.redirects || []).forEach((r) => (mapa[r.from] = r.to));
    const resolver = (t) => { let x = t, i = 0; while (mapa[x] && i++ < 5) x = mapa[x]; return x; };
    const porTitulo = {};
    Object.values(q.pages || {}).forEach((p) => (porTitulo[p.title] = p));
    const achados = {};
    especies.forEach((e) => {
      const p = porTitulo[resolver(e.cientifico)];
      if (p && p.thumbnail && p.pageimage) {
        achados[e.id] = {
          url: p.thumbnail.source,
          arquivo: p.pageimage,
          pagina: `https://${dominio}/wiki/${encodeURIComponent(p.title.replace(/ /g, "_"))}`,
        };
      }
    });
    return achados;
  }

  const limparHTML = (s) => {
    const d = document.createElement("div");
    d.innerHTML = s || "";
    return d.textContent.replace(/\s+/g, " ").trim();
  };

  async function creditos(lista) {
    if (!lista.length) return {};
    const titulos = lista.map((a) => "File:" + a).join("|");
    const url = "https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&prop=imageinfo" +
      "&iiprop=extmetadata&iiextmetadatafilter=Artist|LicenseShortName|LicenseUrl&titles=" + encodeURIComponent(titulos);
    const j = await json(url);
    const q = j.query || {};
    const mapa = {};
    (q.normalized || []).forEach((n) => (mapa[n.to] = n.from));
    const out = {};
    Object.values(q.pages || {}).forEach((p) => {
      const m = p.imageinfo && p.imageinfo[0] && p.imageinfo[0].extmetadata;
      if (!m) return;
      const nome = (mapa[p.title] || p.title).replace(/^File:/, "").replace(/ /g, "_");
      out[nome] = {
        autor: limparHTML(m.Artist && m.Artist.value) || "Autor desconhecido",
        licenca: (m.LicenseShortName && m.LicenseShortName.value) || "",
        licencaUrl: (m.LicenseUrl && m.LicenseUrl.value) || "",
        commons: "https://commons.wikimedia.org/wiki/" + encodeURIComponent(p.title.replace(/ /g, "_")),
      };
    });
    return out;
  }

  async function carregar(especies, aoAtualizar) {
    // Fotos locais definidas no arquivo especies.js têm prioridade
    especies.filter((e) => e.foto).forEach((e) => {
      dados[e.id] = { url: e.foto, autor: e.credito || "", licenca: "", local: true };
    });
    const cache = lerCache();
    if (cache) {
      dados = { ...cache, ...dados };
      aoAtualizar();
      return;
    }
    if (!navigator.onLine) return;
    try {
      const faltando = especies.filter((e) => !e.foto);
      const en = await imagensDoWiki("en.wikipedia.org", faltando);
      const resto = faltando.filter((e) => !en[e.id]);
      const pt = resto.length ? await imagensDoWiki("pt.wikipedia.org", resto).catch(() => ({})) : {};
      const achados = { ...en, ...pt };
      const arquivos = [...new Set(Object.values(achados).map((a) => a.arquivo))];
      const cred = {};
      for (let i = 0; i < arquivos.length; i += 40) {
        Object.assign(cred, await creditos(arquivos.slice(i, i + 40)).catch(() => ({})));
      }
      Object.entries(achados).forEach(([id, a]) => {
        const c = cred[a.arquivo.replace(/ /g, "_")] || {};
        dados[id] = {
          url: a.url,
          autor: c.autor || "ver página da foto",
          licenca: c.licenca || "licença livre",
          licencaUrl: c.licencaUrl || "",
          fonte: c.commons || a.pagina,
        };
      });
      salvarCache();
      aoAtualizar();
    } catch (e) {
      console.warn("Não foi possível carregar as fotos:", e);
    }
  }

  const de = (id) => dados[id];
  const todos = () => dados;

  return { carregar, de, todos };
})();
