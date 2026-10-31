// Espécies mais comuns na pesca do litoral do Ceará e do Rio Grande do Norte.
// "wiki" é o nome científico usado para buscar a foto (licença livre) no Wikipedia/Wikimedia Commons.
// Para trocar a foto de uma espécie, coloque um arquivo em fotos/<id>.jpg e preencha "foto" e "credito".
//   Ex.: foto: "fotos/ariaco.jpg", credito: "Autor, CC BY-SA 4.0"

const GRUPOS = {
  pedra: { nome: "Pedra e recife", cor: "#b5532f" },
  corrida: { nome: "Corrida e alto-mar", cor: "#1f6f9c" },
  costa: { nome: "Praia, estuário e mangue", cor: "#5b7f2a" },
};

const ESPECIES = [
  // ---- Pedra e recife ----
  { id: "ariaco", nome: "Ariacó", outros: "vermelho, ariocó", cientifico: "Lutjanus synagris", grupo: "pedra" },
  { id: "cioba", nome: "Cioba", outros: "vermelho-cioba", cientifico: "Lutjanus analis", grupo: "pedra" },
  { id: "dentao", nome: "Dentão", outros: "vermelho-dentão", cientifico: "Lutjanus jocu", grupo: "pedra" },
  { id: "guaiuba", nome: "Guaiúba", outros: "cioba-amarela", cientifico: "Ocyurus chrysurus", grupo: "pedra" },
  { id: "pargo", nome: "Pargo", outros: "pargo-verdadeiro", cientifico: "Lutjanus purpureus", grupo: "pedra" },
  { id: "biquara", nome: "Biquara", outros: "corcoroca", cientifico: "Haemulon plumierii", grupo: "pedra" },
  { id: "sapuruna", nome: "Sapuruna", outros: "xira", cientifico: "Haemulon aurolineatum", grupo: "pedra" },
  { id: "sirigado", nome: "Sirigado", outros: "badejo", cientifico: "Mycteroperca bonaci", grupo: "pedra" },
  { id: "garoupa", nome: "Garoupa", outros: "garoupa-de-são-tomé", cientifico: "Epinephelus morio", grupo: "pedra" },
  { id: "saramunete", nome: "Saramunete", outros: "trilha", cientifico: "Pseudupeneus maculatus", grupo: "pedra" },
  { id: "cangulo", nome: "Cangulo", outros: "cangulo-rei, peroá", cientifico: "Balistes vetula", grupo: "pedra" },
  { id: "mariquita", nome: "Mariquita", outros: "jaguaraçá", cientifico: "Holocentrus adscensionis", grupo: "pedra" },

  // ---- Corrida e alto-mar ----
  { id: "serra", nome: "Serra", outros: "sororoca", cientifico: "Scomberomorus brasiliensis", grupo: "corrida" },
  { id: "cavala", nome: "Cavala", outros: "cavala-verdadeira", cientifico: "Scomberomorus cavalla", grupo: "corrida" },
  { id: "guarajuba", nome: "Guarajuba", outros: "garajuba", cientifico: "Carangoides bartholomaei", grupo: "corrida" },
  { id: "xareu", nome: "Xaréu", outros: "xaréu-branco", cientifico: "Caranx hippos", grupo: "corrida" },
  { id: "guaracimbora", nome: "Guaracimbora", outros: "garacimbora, xaréu-roncador", cientifico: "Caranx latus", grupo: "corrida" },
  { id: "arabaiana", nome: "Arabaiana", outros: "olho-de-boi", cientifico: "Seriola dumerili", grupo: "corrida" },
  { id: "dourado", nome: "Dourado", outros: "dourado-do-mar", cientifico: "Coryphaena hippurus", grupo: "corrida" },
  { id: "albacora", nome: "Albacora", outros: "albacora-laje, atum", cientifico: "Thunnus albacares", grupo: "corrida" },
  { id: "bonito", nome: "Bonito", outros: "bonito-pintado", cientifico: "Euthynnus alletteratus", grupo: "corrida" },
  { id: "bicuda", nome: "Bicuda", outros: "barracuda, goirana", cientifico: "Sphyraena barracuda", grupo: "corrida" },

  // ---- Praia, estuário e mangue ----
  { id: "camurupim", nome: "Camurupim", outros: "pirapema, tarpão", cientifico: "Megalops atlanticus", grupo: "costa" },
  { id: "robalo", nome: "Camurim", outros: "robalo", cientifico: "Centropomus undecimalis", grupo: "costa" },
  { id: "tainha", nome: "Tainha", outros: "saúna", cientifico: "Mugil curema", grupo: "costa" },
  { id: "carapeba", nome: "Carapeba", outros: "carapeva", cientifico: "Diapterus rhombeus", grupo: "costa" },
  { id: "pescada", nome: "Pescada-amarela", outros: "pescada", cientifico: "Cynoscion acoupa", grupo: "costa" },
  { id: "bagre", nome: "Bagre", outros: "bagre-bandeira", cientifico: "Bagre marinus", grupo: "costa" },
  { id: "sardinha", nome: "Sardinha", outros: "sardinha-laje", cientifico: "Opisthonema oglinum", grupo: "costa" },
  { id: "agulha", nome: "Agulha", outros: "agulha-preta", cientifico: "Hemiramphus brasiliensis", grupo: "costa" },
  { id: "palombeta", nome: "Palombeta", outros: "folha-de-mangue", cientifico: "Chloroscombrus chrysurus", grupo: "costa" },
  { id: "galo", nome: "Peixe-galo", outros: "galo-de-penacho", cientifico: "Selene vomer", grupo: "costa" },
  { id: "ubarana", nome: "Ubarana", outros: "urubarana", cientifico: "Elops saurus", grupo: "costa" },
  { id: "pampo", nome: "Sernambiguara", outros: "pampo, garabebel", cientifico: "Trachinotus falcatus", grupo: "costa" },
];
