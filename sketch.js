// variabili globali
let myTable;
let acini = [];           // un oggetto per ogni riga del CSV
let gruppi = [];          // un oggetto per ogni Root/grappolo
let minRis = 0;
let maxRis = 0;
let passo = 40;           // distanza tra gli acini

let hoverAcino = null;
let hoverCategoria = null;
let selezionata = null;   // blocca la categoria con un click

let yLegendaDim = 0;      // posiziona in verticale la legenda

let SFONDO = [247, 242, 244];
let TESTO = [42, 26, 36];


async function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont("sans-serif");

  myTable = await loadTable("assests/aromi_vino.csv", ",", "header");

  leggiDati();
  calcolaLayout();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (myTable === undefined) return;   // se i dati non sono stati ancora caricati
  calcolaLayout();
}

function coloriRoot(nome) {
  if (nome === "Aromas") {
    return ["#5E0B22", "#C2566F"];
  }
  if (nome === "Bouquet") {
    return ["#2E1650", "#A98BD6"];
  }
  return ["#3A2A3F", "#A596AD"];
}

function leggiDati() {

  for (let i = 0; i < myTable.getRowCount(); i++) {

    // nel CSV i numeri hanno il punto come separatore delle migliaia quindi attraverso int() faccio una conversione
    let testo = myTable.getString(i, "Results");
    testo = testo.replaceAll(".", "");

    // ricorda: trim() toglie gli spazi inutili all'inizio e alla fine del testo
    let acino = {
      root: myTable.getString(i, "Root").trim(),
      categoria: myTable.getString(i, "Category").trim(),
      tipo: myTable.getString(i, "Type").trim(),
      aroma: myTable.getString(i, "Aroma").trim(),   // a volte è vuoto
      risultati: int(testo),
      x: 0,
      y: 0,
      r: 0,
      colore: null
    };
    acini.push(acino);
  }

  // cerco il numero minimo e massimo di risultati
  minRis = acini[0].risultati;
  maxRis = acini[0].risultati;
  for (let i = 1; i < acini.length; i++) {
    if (acini[i].risultati < minRis) {
      minRis = acini[i].risultati;
    }
    if (acini[i].risultati > maxRis) {
      maxRis = acini[i].risultati;
    }
  }

  creaGruppi();
}

// raggruppo gli acini per Root, ovvero grappoli
function creaGruppi() {

  let radici = [];
  for (let i = 0; i < acini.length; i++) {
    if (!radici.includes(acini[i].root)) {
      radici.push(acini[i].root);
    }
  }

  for (let i = 0; i < radici.length; i++) {
    let nome = radici[i];
    let suoi = [];        // gli acini di questa Root
    let categorie = [];   // le categorie di questa Root, no ripetizioni

    for (let j = 0; j < acini.length; j++) {
      if (acini[j].root === nome) {
        suoi.push(acini[j]);
        if (!categorie.includes(acini[j].categoria)) {
          categorie.push(acini[j].categoria);
        }
      }
    }

    // colori e sfumature delle categorie
    let colori = coloriRoot(nome);
    let coloriCategorie = [];
    for (let c = 0; c < categorie.length; c++) {
      let t = 0;
      if (categorie.length > 1) {
        t = c / (categorie.length - 1);
      }
      coloriCategorie.push(lerpColor(color(colori[0]), color(colori[1]), t));
    }

    for (let j = 0; j < suoi.length; j++) {
      let posizione = categorie.indexOf(suoi[j].categoria);
      suoi[j].colore = coloriCategorie[posizione];
    }

    gruppi.push({
      nome: nome,
      colore: colori[0],
      acini: suoi,
      categorie: categorie,
      coloriCategorie: coloriCategorie,
      righe: [],
      cx: 0,
      voci: []
    });
  }
}

// calcolo quanti acini in ogni riga
function righeGrappolo(n) {
  // trovo la larghezza della prima riga
  let w = 1;
  while (w * (w + 1) / 2 < n) {
    w = w + 1;
  }

  // a ogni riga compilata, tolgo un acino
  let righe = [];
  let rimasti = n;
  for (let k = w; rimasti > 0; k--) {
    let quanti = min(k, rimasti);
    righe.push(quanti);
    rimasti = rimasti - quanti;
  }
  return righe;
}

// calcolo raggio dell'acino
function raggio(valore) {
  return map(log(valore), log(minRis), log(maxRis), 0.2 * passo, 0.46 * passo);
}

function calcolaLayout() {
  let margine = 40;
  let yStelo = 165;       // da dove parte il gambo
  let colTot = 0;         // larghezza totale in colonne
  let maxRighe = 0;       // numero di righe del grappolo più alto
  let maxCat = 0;         // numero di categorie del grappolo con più categorie

  for (let i = 0; i < gruppi.length; i++) {
    let g = gruppi[i];
    g.righe = righeGrappolo(g.acini.length);
    colTot = colTot + g.righe[0] + 1.5;
    maxRighe = max(maxRighe, g.righe.length);
    maxCat = max(maxCat, g.categorie.length);
  }

  let passoL = (width - 2 * margine) / colTot;
  let spazioFisso = yStelo + 30 + maxCat * 20 + 40 + 60;
  let passoA = (height - spazioFisso) / (0.8 + (maxRighe - 1) * 0.87 + 1);
  passo = constrain(min(passoL, passoA), 18, 70);

  let y0 = yStelo + 0.8 * passo;
  let x = (width - colTot * passo) / 2;
  randomSeed(7);

  // posizione di ogni acino
  for (let i = 0; i < gruppi.length; i++) {
    let g = gruppi[i];
    let larghezza = (g.righe[0] + 1.5) * passo;
    g.cx = x + larghezza / 2;   // centro del grappolo
    x = x + larghezza;

    let n = 0;
    for (let r = 0; r < g.righe.length; r++) {
      let quanti = g.righe[r];
      for (let c = 0; c < quanti; c++) {
        let a = g.acini[n];
        a.x = g.cx + (c - (quanti - 1) / 2) * passo + random(-0.06, 0.06) * passo;
        a.y = y0 + r * 0.87 * passo + random(-0.06, 0.06) * passo;
        a.r = raggio(a.risultati);
        n = n + 1;
      }
    }
  }

  // sotto ogni grappolo posiziono le voci della legenda
  let yLista = y0 + (maxRighe - 1) * 0.87 * passo + passo + 30;
  for (let i = 0; i < gruppi.length; i++) {
    let g = gruppi[i];
    g.voci = [];
    for (let c = 0; c < g.categorie.length; c++) {
      g.voci.push({
        categoria: g.categorie[c],
        x: g.cx - 75,
        y: yLista + c * 20,
        colore: g.coloriCategorie[c]
      });
    }
  }
  yLegendaDim = yLista + maxCat * 20 + 40;
}

function draw() {
  if (myTable === undefined) return;   // dati non ancora caricati

  background(SFONDO);
  disegnaTitolo();
  aggiornaHover();

  let attiva = null;
  if (hoverCategoria !== null) {
    attiva = hoverCategoria;
  } else if (selezionata !== null) {
    attiva = selezionata;
  }

  for (let i = 0; i < gruppi.length; i++) {
    disegnaGrappolo(gruppi[i], attiva);
  }
  disegnaLegendaDimensione();

  if (hoverAcino !== null) {
    disegnaTooltip(hoverAcino);
  }

  if (hoverCategoria !== null) {
    cursor(HAND);
  } else {
    cursor(ARROW);
  }
}

function disegnaTitolo() {
  noStroke();
  fill(TESTO);
  textAlign(LEFT, BASELINE);
  textStyle(BOLD);
  textSize(28);
  text("Il Grappolo degli Aromi del vino", 40, 55);

  textStyle(NORMAL);
  textSize(14);
  textAlign(LEFT, TOP);
  text("Ogni acino è una voce del dataset. Il colore indica la categoria, " +
       "la dimensione il numero di risultati.",
       40, 68, width - 80, 40);
}

function disegnaGrappolo(g, attiva) {
  // nome del grappolo
  noStroke();
  fill(g.colore);
  textAlign(CENTER, BASELINE);
  textStyle(BOLD);
  textSize(20);
  text(g.nome, g.cx, 150);

  // gambo
  stroke(107, 90, 102);
  strokeWeight(3);
  line(g.cx, 165, g.cx, g.acini[0].y);

  // acini
  for (let i = 0; i < g.acini.length; i++) {
    let a = g.acini[i];

    let spento = false;
    if (attiva !== null && a.categoria !== attiva) {
      spento = true;
    }
    let trasparenza = 255;
    if (spento) {
      trasparenza = 50;
    }

    if (a === hoverAcino) {
      stroke(TESTO);
      strokeWeight(2);
    } else {
      noStroke();
    }
    fillConAlpha(a.colore, trasparenza);
    circle(a.x, a.y, a.r * 2);
  }

  // legenda delle categorie
  textAlign(LEFT, CENTER);
  textSize(12);
  for (let i = 0; i < g.voci.length; i++) {
    let v = g.voci[i];

    let trasparenza = 255;
    if (attiva !== null && v.categoria !== attiva) {
      trasparenza = 70;
    }

    noStroke();
    fillConAlpha(v.colore, trasparenza);
    circle(v.x + 5, v.y, 10);
    fill(TESTO[0], TESTO[1], TESTO[2], trasparenza);
    text(v.categoria, v.x + 16, v.y);
  }
}

function disegnaLegendaDimensione() {
  let x = 40;
  let y = yLegendaDim;
  let valori = [100000, 1000000, 10000000];

  noStroke();
  textAlign(LEFT, CENTER);
  textSize(12);
  textStyle(NORMAL);

  fill(TESTO);
  text("Numero di risultati:", x, y);
  x = x + textWidth("Numero di risultati:") + 20;

  // un cerchio di esempio per ogni valore
  for (let i = 0; i < valori.length; i++) {
    let r = raggio(valori[i]);
    let etichetta = formattaNumero(valori[i]);

    fill(150, 120, 145, 200);
    circle(x + r, y, r * 2);
    fill(TESTO);
    text(etichetta, x + 2 * r + 8, y);

    x = x + 2 * r + 8 + textWidth(etichetta) + 24;
  }
}

function disegnaTooltip(a) {
  // se Aroma è vuoto uso Type come nome
  let nome = a.tipo;
  let percorso = a.root + "  ›  " + a.categoria + "  ›  " + a.tipo;
  if (a.aroma !== "") {
    nome = a.aroma;
    percorso = percorso + "  ›  " + a.aroma;
  }
  let risultati = formattaNumero(a.risultati) + " risultati";

  // larghezza del riquadro in base al testo più lungo
  textSize(13);
  textStyle(NORMAL);
  let w = max(textWidth(nome) * 1.2, textWidth(percorso), textWidth(risultati)) + 24;
  let h = 72;

  let x = min(mouseX + 16, width - w - 10);
  let y = min(mouseY + 16, height - h - 10);

  noStroke();
  fill(TESTO[0], TESTO[1], TESTO[2], 240);
  rect(x, y, w, h, 8);

  textAlign(LEFT, TOP);
  fill(255);
  textStyle(BOLD);
  textSize(14);
  text(nome, x + 12, y + 10);

  textStyle(NORMAL);
  textSize(12);
  fill(220, 200, 215);
  text(percorso, x + 12, y + 31);
  fill(255);
  text(risultati, x + 12, y + 50);
}

function aggiornaHover() {
  hoverAcino = null;
  hoverCategoria = null;

  for (let i = 0; i < acini.length; i++) {
    let a = acini[i];
    if (dist(mouseX, mouseY, a.x, a.y) < a.r) {
      hoverAcino = a;
    }
  }
  if (hoverAcino !== null) {
    hoverCategoria = hoverAcino.categoria;
    return;
  }

  for (let i = 0; i < gruppi.length; i++) {
    let g = gruppi[i];
    for (let j = 0; j < g.voci.length; j++) {
      let v = g.voci[j];
      if (mouseX > v.x - 10 && mouseX < v.x + 170 && abs(mouseY - v.y) < 10) {
        hoverCategoria = v.categoria;
      }
    }
  }
}

function mousePressed() {
  if (hoverCategoria !== null) {
    if (selezionata === hoverCategoria) {
      selezionata = null;              // secondo click: sblocca
    } else {
      selezionata = hoverCategoria;    // primo click: blocca
    }
  } else {
    selezionata = null;                // click nel vuoto: sblocca
  }
}

// fill() con un colore già creato ma con trasparenza a scelta
function fillConAlpha(c, alfa) {
  fill(red(c), green(c), blue(c), alfa);
}

// scrive i numeri con il punto delle migliaia: 5040000 -> "5.040.000"
// nfc() mette le virgole (5,040,000), poi le sostituisco con i punti
function formattaNumero(numero) {
  return nfc(numero).replaceAll(",", ".");
}