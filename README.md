# 🎣 Diário de Pesca CE/RN

Aplicativo web para o pescador registrar o que pescou, na hora em que pescou, no litoral do **Ceará** e do **Rio Grande do Norte**. Funciona no navegador do celular, sem instalar nada (mas dá para "adicionar à tela inicial" e usar como app).

## O que ele faz

1. **Hora** – o pescador toca na hora (00h–23h) e nos minutos (de 10 em 10). A **data é automática** (hoje).
2. **Peixe** – escolhe a espécie numa grade com fotos (34 espécies comuns no CE/RN, separadas em *Pedra e recife*, *Corrida e alto-mar* e *Praia, estuário e mangue*), ou digita outro nome.
3. **Quantidade e peso** (peso é opcional).
4. Ao salvar, o app:
   - pega a **localização pelo GPS** do celular e o nome do lugar (OpenStreetMap);
   - busca **online a maré daquele momento**: altura, se estava **enchendo, vazando ou no estofo**, a última e a próxima preia-mar/baixa-mar, a amplitude e a **tábua do dia** com gráfico;
   - calcula a **fase da lua** e se era **maré grande (de lua)**, média ou **maré morta**.
5. **Minhas pescas** – histórico por dia, resumo (total, peixe mais pescado, % de peixes em maré enchendo/vazando), **planilha CSV** (abre no Excel/Google Planilhas) e **compartilhar** o resumo do dia (WhatsApp).

**Sem internet no mar?** A pesca é salva com hora e GPS (o GPS funciona sem internet). A maré fica "pendente" e é buscada sozinha quando o celular voltar a ter sinal.

Os registros ficam guardados **no próprio celular** (armazenamento do navegador). Não há servidor nem cadastro. Para não perder os dados, baixe a planilha de vez em quando.

## Publicar no GitHub Pages (grátis)

1. Crie um repositório no GitHub (ex.: `diario-de-pesca`), público.
2. Envie **todos os arquivos desta pasta** para a raiz do repositório (botão *Add file → Upload files*, arraste tudo, todos ficam soltos, sem pastas).
3. Vá em **Settings → Pages**. Em *Build and deployment*, escolha **Deploy from a branch**, branch **main**, pasta **/ (root)** e salve.
4. Em 1–2 minutos o app estará em `https://SEU-USUARIO.github.io/diario-de-pesca/`.
5. Abra esse link no celular, permita a **localização** quando o navegador pedir e, se quiser, use **"Adicionar à tela inicial"**.

> O GPS só funciona em sites `https://` — o GitHub Pages já é https. Abrindo o `index.html` direto do computador o GPS pode não funcionar.

## De onde vêm os dados

| Dado | Fonte | Observação |
|---|---|---|
| Maré | [Open-Meteo Marine API](https://open-meteo.com/en/docs/marine-weather-api), variável `sea_level_height_msl` | Gratuita, sem chave. É um **modelo oceânico** (inclui maré astronômica). A altura é em relação ao **nível médio do mar** (por isso pode ser negativa); a tábua da Marinha usa o nível de redução, então os números absolutos diferem, mas horários e amplitude são comparáveis. Licença CC BY 4.0. |
| Localização | GPS do celular | Precisão mostrada em metros. |
| Nome do lugar | [Nominatim / OpenStreetMap](https://nominatim.org/) | Opcional; se falhar, ficam só as coordenadas. |
| Fotos dos peixes | Wikipedia + Wikimedia Commons | Só imagens com **licença livre** (`pilicense=free`). Autor e licença de cada foto aparecem em *Minhas pescas → Créditos das fotos*. |
| Lua | Cálculo no próprio app | Sem internet. |

## Personalizar

- **Espécies**: edite `especies.js`. Cada peixe tem `nome`, `outros` (apelidos regionais, usados na busca), `cientifico` (usado para achar a foto) e `grupo`.
- **Trocar uma foto**: coloque a imagem em `fotos/nome.jpg` e, na espécie, adicione `foto: "fotos/nome.jpg", credito: "Autor, licença"`.
- **Cores**: no começo de `estilo.css`.
- Ao mudar arquivos, troque `VERSAO` em `sw.js` (ex.: `pesca-v2`) para os celulares pegarem a versão nova.

## Arquivos

```
index.html            tela do app
estilo.css            visual
especies.js           lista de peixes
mare.js               maré (Open-Meteo) e fase da lua
fotos.js              fotos livres + créditos
app.js                funcionamento (hora, GPS, salvar, histórico, planilha)
sw.js                 funciona offline
manifest.webmanifest  "adicionar à tela inicial"
icone.svg / icone-*.png
```
