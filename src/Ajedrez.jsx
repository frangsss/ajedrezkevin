import React, { useState, useMemo, useEffect, useRef } from "react";

/* ============================================================
   MOTOR DE AJEDREZ
   ============================================================ */

let PIECE_ID = 0;

class Pieza {
  constructor(color, tipo) {
    this.id = ++PIECE_ID;
    this.color = color;
    this.tipo = tipo;
    this.haMovido = false;
  }
  caminoLibre(o, d, b) {
    const sf = o.r === d.r ? 0 : d.r > o.r ? 1 : -1;
    const sc = o.c === d.c ? 0 : d.c > o.c ? 1 : -1;
    let r = o.r + sf, c = o.c + sc;
    while (r !== d.r || c !== d.c) {
      if (b[r][c]) return false;
      r += sf; c += sc;
    }
    return true;
  }
}

class Peon extends Pieza {
  constructor(c) { super(c, "peon"); }
  puedeMover(o, d, b) {
    const dir = this.color === "blanco" ? -1 : 1;
    const df = d.r - o.r;
    const dc = Math.abs(d.c - o.c);
    const dest = b[d.r][d.c];
    if (dc === 0) {
      if (df === dir && !dest) return true;
      if (!this.haMovido && df === 2 * dir && !dest && !b[o.r + dir][o.c]) return true;
    }
    if (dc === 1 && df === dir && dest && dest.color !== this.color) return true;
    return false;
  }
}

class Torre extends Pieza {
  constructor(c) { super(c, "torre"); }
  puedeMover(o, d, b) {
    if ((o.r !== d.r && o.c !== d.c) || (o.r === d.r && o.c === d.c)) return false;
    if (!this.caminoLibre(o, d, b)) return false;
    const t = b[d.r][d.c];
    return !t || t.color !== this.color;
  }
}

class Caballo extends Pieza {
  constructor(c) { super(c, "caballo"); }
  puedeMover(o, d, b) {
    const df = Math.abs(d.r - o.r), dc = Math.abs(d.c - o.c);
    if (!((df === 2 && dc === 1) || (df === 1 && dc === 2))) return false;
    const t = b[d.r][d.c];
    return !t || t.color !== this.color;
  }
}

class Alfil extends Pieza {
  constructor(c) { super(c, "alfil"); }
  puedeMover(o, d, b) {
    const df = Math.abs(d.r - o.r), dc = Math.abs(d.c - o.c);
    if (df !== dc || df === 0) return false;
    if (!this.caminoLibre(o, d, b)) return false;
    const t = b[d.r][d.c];
    return !t || t.color !== this.color;
  }
}

class Reina extends Pieza {
  constructor(c) { super(c, "reina"); }
  puedeMover(o, d, b) {
    const df = Math.abs(d.r - o.r), dc = Math.abs(d.c - o.c);
    const recto = o.r === d.r || o.c === d.c;
    const diag = df === dc;
    if (!(recto || diag) || (df === 0 && dc === 0)) return false;
    if (!this.caminoLibre(o, d, b)) return false;
    const t = b[d.r][d.c];
    return !t || t.color !== this.color;
  }
}

class Rey extends Pieza {
  constructor(c) { super(c, "rey"); }
  puedeMover(o, d, b) {
    const df = Math.abs(d.r - o.r), dc = Math.abs(d.c - o.c);
    if (df <= 1 && dc <= 1 && df + dc > 0) {
      const t = b[d.r][d.c];
      return !t || t.color !== this.color;
    }
    return false;
  }
}

function tableroInicial() {
  const b = Array.from({ length: 8 }, () => Array(8).fill(null));
  const orden = [Torre, Caballo, Alfil, Reina, Rey, Alfil, Caballo, Torre];
  for (let i = 0; i < 8; i++) {
    b[0][i] = new orden[i]("negro");
    b[1][i] = new Peon("negro");
    b[6][i] = new Peon("blanco");
    b[7][i] = new orden[i]("blanco");
  }
  return b;
}

function clonar(b) {
  return b.map((fila) =>
    fila.map((p) => {
      if (!p) return null;
      const np = new p.constructor(p.color);
      np.id = p.id;
      np.haMovido = p.haMovido;
      return np;
    })
  );
}

function hallarRey(color, b) {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = b[r][c];
      if (p && p.color === color && p.tipo === "rey") return { r, c };
    }
  return null;
}

function bajoAtaque(pos, enemigoColor, b) {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = b[r][c];
      if (p && p.color === enemigoColor && p.puedeMover({ r, c }, pos, b)) return true;
    }
  return false;
}

function esSuicida(o, d, b, color) {
  const sim = clonar(b);
  sim[d.r][d.c] = sim[o.r][o.c];
  sim[o.r][o.c] = null;
  const rey = hallarRey(color, sim);
  if (!rey) return false;
  const enemigo = color === "blanco" ? "negro" : "blanco";
  return bajoAtaque(rey, enemigo, sim);
}

function movimientosLegales(o, b, color) {
  const p = b[o.r][o.c];
  if (!p || p.color !== color) return [];
  const out = [];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const d = { r, c };
      if (p.puedeMover(o, d, b) && !esSuicida(o, d, b, color)) out.push(d);
    }
  return out;
}

function tieneMovimientos(color, b) {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = b[r][c];
      if (p && p.color === color && movimientosLegales({ r, c }, b, color).length > 0) return true;
    }
  return false;
}

function enJaque(color, b) {
  const rey = hallarRey(color, b);
  if (!rey) return false;
  const enemigo = color === "blanco" ? "negro" : "blanco";
  return bajoAtaque(rey, enemigo, b);
}

// Generador FEN (para cuando enchufes Stockfish posta en tu proyecto real)
function generarFEN(tablero, turno) {
  let fen = "";
  for (let f = 0; f < 8; f++) {
    let vacias = 0;
    for (let c = 0; c < 8; c++) {
      const p = tablero[f][c];
      if (!p) { vacias++; continue; }
      if (vacias > 0) { fen += vacias; vacias = 0; }
      const letras = { peon:"p", torre:"r", caballo:"n", alfil:"b", reina:"q", rey:"k" };
      const l = letras[p.tipo];
      fen += p.color === "blanco" ? l.toUpperCase() : l;
    }
    if (vacias > 0) fen += vacias;
    if (f < 7) fen += "/";
  }
  return `${fen} ${turno === "blanco" ? "w" : "b"} KQkq - 0 1`;
}

/* ============================================================
   MOTOR DE IA (minimax + alpha-beta + PST)

   NOTA PARA FRAN: en tu proyecto real con Controladorjuego.js
   seguís usando el Web Worker de Stockfish posta. Acá armé un
   motor inline porque el Worker no corre en el sandbox del
   artifact. Para enchufar Stockfish real en lugar de este,
   reemplazá la llamada a `elegirJugadaIA(...)` por:
     motor.postMessage(`position fen ${generarFEN(tablero, turno)}`);
     motor.postMessage('go depth 10');
   y escuchás el 'bestmove' en motor.onmessage como ya tenés.
   ============================================================ */

const VALORES = { peon: 100, caballo: 320, alfil: 330, torre: 500, reina: 900, rey: 20000 };

// Tablas posicionales (perspectiva de blancas; para negras se refleja la fila)
const PST = {
  peon: [
    [ 0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [ 5,  5, 10, 25, 25, 10,  5,  5],
    [ 0,  0,  0, 20, 20,  0,  0,  0],
    [ 5, -5,-10,  0,  0,-10, -5,  5],
    [ 5, 10, 10,-20,-20, 10, 10,  5],
    [ 0,  0,  0,  0,  0,  0,  0,  0],
  ],
  caballo: [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50],
  ],
  alfil: [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20],
  ],
  torre: [
    [ 0,  0,  0,  0,  0,  0,  0,  0],
    [ 5, 10, 10, 10, 10, 10, 10,  5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [ 0,  0,  0,  5,  5,  0,  0,  0],
  ],
  reina: [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [ -5,  0,  5,  5,  5,  5,  0, -5],
    [  0,  0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  0,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20],
  ],
  rey: [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [ 20, 20,  0,  0,  0,  0, 20, 20],
    [ 20, 30, 10,  0,  0, 10, 30, 20],
  ],
};

function pstValor(tipo, color, r, c) {
  const t = PST[tipo];
  const fr = color === "blanco" ? r : 7 - r;
  return t[fr][c];
}

function evaluar(b) {
  let score = 0;
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = b[r][c];
      if (!p) continue;
      const val = VALORES[p.tipo] + pstValor(p.tipo, p.color, r, c);
      score += p.color === "blanco" ? val : -val;
    }
  return score;
}

function generarMovimientos(color, b) {
  const out = [];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = b[r][c];
      if (p && p.color === color) {
        const mvs = movimientosLegales({ r, c }, b, color);
        for (const d of mvs) out.push({ from: { r, c }, to: d });
      }
    }
  return out;
}

function ordenarMovimientos(moves, b) {
  return moves.sort((a, b2) => {
    const va = b[a.to.r][a.to.c] ? VALORES[b[a.to.r][a.to.c].tipo] : 0;
    const vb = b[b2.to.r][b2.to.c] ? VALORES[b[b2.to.r][b2.to.c].tipo] : 0;
    return vb - va;
  });
}

function aplicarEnMotor(b, from, to) {
  const nb = clonar(b);
  const p = nb[from.r][from.c];
  nb[to.r][to.c] = p;
  nb[from.r][from.c] = null;
  if (p) p.haMovido = true;
  if (p && p.tipo === "peon" && (to.r === 0 || to.r === 7)) {
    const q = new Reina(p.color);
    q.id = p.id;
    q.haMovido = true;
    nb[to.r][to.c] = q;
  }
  return nb;
}

function minimax(b, profundidad, alpha, beta, turno) {
  if (profundidad === 0) return evaluar(b);
  let moves = generarMovimientos(turno, b);
  if (moves.length === 0) {
    if (enJaque(turno, b)) {
      const mate = 100000 + profundidad * 10;
      return turno === "blanco" ? -mate : mate;
    }
    return 0;
  }
  moves = ordenarMovimientos(moves, b);
  const siguiente = turno === "blanco" ? "negro" : "blanco";
  if (turno === "blanco") {
    let best = -Infinity;
    for (const m of moves) {
      const nb = aplicarEnMotor(b, m.from, m.to);
      const s = minimax(nb, profundidad - 1, alpha, beta, siguiente);
      if (s > best) best = s;
      if (s > alpha) alpha = s;
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      const nb = aplicarEnMotor(b, m.from, m.to);
      const s = minimax(nb, profundidad - 1, alpha, beta, siguiente);
      if (s < best) best = s;
      if (s < beta) beta = s;
      if (beta <= alpha) break;
    }
    return best;
  }
}

function elegirJugadaIA(b, color, profundidad) {
  let moves = generarMovimientos(color, b);
  if (moves.length === 0) return null;
  for (let i = moves.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [moves[i], moves[j]] = [moves[j], moves[i]];
  }
  moves = ordenarMovimientos(moves, b);
  const siguiente = color === "blanco" ? "negro" : "blanco";
  let best = moves[0];
  let mejorScore = color === "blanco" ? -Infinity : Infinity;
  for (const m of moves) {
    const nb = aplicarEnMotor(b, m.from, m.to);
    const s = minimax(nb, profundidad - 1, -Infinity, Infinity, siguiente);
    if (color === "blanco" ? s > mejorScore : s < mejorScore) {
      mejorScore = s;
      best = m;
    }
  }
  return best;
}

/* ============================================================
   CONSTANTES
   ============================================================ */

const GLYPHS = {
  peon: "♟", torre: "♜", caballo: "♞", alfil: "♝", reina: "♛", rey: "♚",
};
const VAL_UI = { peon: 1, caballo: 3, alfil: 3, torre: 5, reina: 9, rey: 0 };
const FILAS = ["a", "b", "c", "d", "e", "f", "g", "h"];

const NIVELES = [
  { id: 1, nombre: "Aprendiz", desc: "Piensa una jugada adelante", depth: 1 },
  { id: 2, nombre: "Caballero", desc: "Piensa dos jugadas adelante", depth: 2 },
  { id: 3, nombre: "Maestro", desc: "Piensa tres jugadas adelante", depth: 3 },
];

/* ============================================================
   COMPONENTE PRINCIPAL
   ============================================================ */

export default function Ajedrez() {
  const [pantalla, setPantalla] = useState("menu");
  const [modo, setModo] = useState(null);
  const [nivel, setNivel] = useState(2);
  const [colorJugador, setColorJugador] = useState("blanco");

  const [tablero, setTablero] = useState(() => tableroInicial());
  const [turno, setTurno] = useState("blanco");
  const [sel, setSel] = useState(null);
  const [ultimo, setUltimo] = useState(null);
  const [capturadas, setCapturadas] = useState({ blanco: [], negro: [] });
  const [historial, setHistorial] = useState([]);
  const [fin, setFin] = useState(null);
  const [ready, setReady] = useState(false);
  const [pensandoIA, setPensandoIA] = useState(false);

  const iaMoveRef = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 50);
    return () => clearTimeout(t);
  }, []);

  const legales = useMemo(
    () => (sel ? movimientosLegales(sel, tablero, turno) : []),
    [sel, tablero, turno]
  );

  const casillaJaque = useMemo(
    () => (enJaque(turno, tablero) ? hallarRey(turno, tablero) : null),
    [tablero, turno]
  );

  const piezasRender = [];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (tablero[r][c]) piezasRender.push({ pieza: tablero[r][c], r, c });

  const esTurnoIA = modo === "bot" && turno !== colorJugador && !fin;

  useEffect(() => {
    if (pantalla !== "juego") return;
    if (!esTurnoIA) return;
    if (iaMoveRef.current) return;

    iaMoveRef.current = true;
    setPensandoIA(true);

    const timer = setTimeout(() => {
      const prof = NIVELES.find((n) => n.id === nivel)?.depth || 2;
      const jugada = elegirJugadaIA(tablero, turno, prof);
      if (jugada) {
        ejecutarMovimiento(jugada.from, jugada.to);
      }
      setPensandoIA(false);
      iaMoveRef.current = false;
    }, 450);

    return () => {
      clearTimeout(timer);
      iaMoveRef.current = false;
    };
    // eslint-disable-next-line
  }, [esTurnoIA, pantalla]);

  function ejecutarMovimiento(from, to) {
    setTablero((prev) => {
      const nuevo = clonar(prev);
      const mover = nuevo[from.r][from.c];
      if (!mover) return prev;
      const destino = nuevo[to.r][to.c];
      if (destino) {
        setCapturadas((pc) => ({
          ...pc,
          [destino.color]: [...pc[destino.color], destino.tipo],
        }));
      }
      nuevo[to.r][to.c] = mover;
      nuevo[from.r][from.c] = null;
      mover.haMovido = true;
      if (mover.tipo === "peon" && (to.r === 0 || to.r === 7)) {
        const q = new Reina(mover.color);
        q.id = mover.id;
        q.haMovido = true;
        nuevo[to.r][to.c] = q;
      }
      const sig = turno === "blanco" ? "negro" : "blanco";
      const notacion = `${GLYPHS[mover.tipo]} ${FILAS[from.c]}${8 - from.r}→${FILAS[to.c]}${8 - to.r}`;
      setUltimo({ from, to });
      setSel(null);
      setHistorial((h) => [...h, { notacion, color: turno }]);
      setTurno(sig);
      if (!tieneMovimientos(sig, nuevo)) {
        setFin(
          enJaque(sig, nuevo)
            ? { tipo: "mate", ganador: turno }
            : { tipo: "tablas" }
        );
      }
      return nuevo;
    });
  }

  function click(r, c) {
    if (fin) return;
    if (pensandoIA) return;
    if (modo === "bot" && turno !== colorJugador) return;

    const p = tablero[r][c];
    if (!sel) {
      if (p && p.color === turno) setSel({ r, c });
      return;
    }
    if (sel.r === r && sel.c === c) {
      setSel(null);
      return;
    }
    if (p && p.color === turno) {
      setSel({ r, c });
      return;
    }
    const legal = legales.some((m) => m.r === r && m.c === c);
    if (!legal) {
      setSel(null);
      return;
    }
    ejecutarMovimiento(sel, { r, c });
  }

  function iniciarJuego(modoElegido) {
    setModo(modoElegido);
    setTablero(tableroInicial());
    setTurno("blanco");
    setSel(null);
    setUltimo(null);
    setCapturadas({ blanco: [], negro: [] });
    setHistorial([]);
    setFin(null);
    setPensandoIA(false);
    iaMoveRef.current = false;
    setPantalla("juego");
  }

  function reiniciar() {
    setTablero(tableroInicial());
    setTurno("blanco");
    setSel(null);
    setUltimo(null);
    setCapturadas({ blanco: [], negro: [] });
    setHistorial([]);
    setFin(null);
    setPensandoIA(false);
    iaMoveRef.current = false;
  }

  function volverAlMenu() {
    setPantalla("menu");
    reiniciar();
  }

  const matB = capturadas.negro.reduce((s, t) => s + VAL_UI[t], 0);
  const matN = capturadas.blanco.reduce((s, t) => s + VAL_UI[t], 0);
  const ventaja = matB - matN;

  /* ─────────── PANTALLA DE MENÚ ─────────── */
  if (pantalla === "menu") {
    return (
      <div className={`app-root ${ready ? "ready" : ""}`}>
        <style>{CSS}</style>
        <div className="bg-grain" />
        <div className="bg-glow" />
        <div className="bg-vignette" />

        <div className="menu-wrap">
          <header className="menu-header">
            <div className="header-line" />
            <h1 className="app-title">AJEDREZ</h1>
            <p className="app-subtitle">— azul marino profundo —</p>
            <div className="header-line" />
          </header>

          <p className="menu-instruccion">Elija su modo de juego</p>

          <div className="mode-cards">
            <button
              className={`mode-card ${modo === "humano" ? "selected" : ""}`}
              onClick={() => setModo("humano")}
            >
              <div className="mode-ornament" />
              <div className="mode-icon">♚ ♚</div>
              <div className="mode-title">Contra persona</div>
              <div className="mode-desc">
                Dos jugadores<br />compartiendo el tablero
              </div>
              <div className="mode-ornament bottom" />
            </button>

            <button
              className={`mode-card ${modo === "bot" ? "selected" : ""}`}
              onClick={() => setModo("bot")}
            >
              <div className="mode-ornament" />
              <div className="mode-icon">♛</div>
              <div className="mode-title">Contra la máquina</div>
              <div className="mode-desc">
                Desafíe al motor<br />en tres niveles
              </div>
              <div className="mode-ornament bottom" />
            </button>
          </div>

          {modo === "bot" && (
            <div className="bot-options">
              <div className="option-group">
                <div className="option-label">NIVEL</div>
                <div className="option-row">
                  {NIVELES.map((n) => (
                    <button
                      key={n.id}
                      className={`option-btn ${nivel === n.id ? "active" : ""}`}
                      onClick={() => setNivel(n.id)}
                    >
                      <div className="opt-name">{n.nombre}</div>
                      <div className="opt-desc">{n.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="option-group">
                <div className="option-label">SU COLOR</div>
                <div className="option-row color-row">
                  <button
                    className={`option-btn color-btn ${colorJugador === "blanco" ? "active" : ""}`}
                    onClick={() => setColorJugador("blanco")}
                  >
                    <div className="color-glyph white">♚</div>
                    <div className="opt-name">Blancas</div>
                    <div className="opt-desc">Juega primero</div>
                  </button>
                  <button
                    className={`option-btn color-btn ${colorJugador === "negro" ? "active" : ""}`}
                    onClick={() => setColorJugador("negro")}
                  >
                    <div className="color-glyph black">♚</div>
                    <div className="opt-name">Negras</div>
                    <div className="opt-desc">Responde al ataque</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {modo && (
            <button className="reset-btn big" onClick={() => iniciarJuego(modo)}>
              <span>Comenzar partida</span>
            </button>
          )}

          <footer className="app-footer menu-footer">
            <div className="footer-line" />
            <p>◆ Hecho by Kevin Borre◆</p>
          </footer>
        </div>
      </div>
    );
  }

  /* ─────────── PANTALLA DE JUEGO ─────────── */
  const labelJugador = (color) => {
    if (modo === "humano") return color === "blanco" ? "BLANCAS" : "NEGRAS";
    if (color === colorJugador) return "VOS";
    return `MÁQUINA · ${NIVELES.find((n) => n.id === nivel).nombre.toUpperCase()}`;
  };

  const statusJugador = (color) => {
    if (fin) return "Partida terminada";
    if (turno !== color) return "En espera";
    if (modo === "bot" && color !== colorJugador) return "Pensando su jugada…";
    return "Su turno — mueva una pieza";
  };

  return (
    <div className={`app-root ${ready ? "ready" : ""}`}>
      <style>{CSS}</style>
      <div className="bg-grain" />
      <div className="bg-glow" />
      <div className="bg-vignette" />

      <div className="app-container">
        <header className="app-header">
          <div className="header-line" />
          <h1 className="app-title">AJEDREZ</h1>
          <p className="app-subtitle">
            {modo === "humano"
              ? "— partida entre dos jugadores —"
              : `— desafío contra ${NIVELES.find((n) => n.id === nivel).nombre.toLowerCase()} —`}
          </p>
          <div className="header-line" />
        </header>

        <main className="main-grid">
          <aside className="side-panel">
            <div className={`player-card ${turno === "negro" ? "active" : ""}`}>
              <div className="player-ornament" />
              <div className="player-label">{labelJugador("negro")}</div>
              <div className="player-dot" />
              <div className="player-status">{statusJugador("negro")}</div>
              {modo === "bot" && turno === "negro" && colorJugador === "blanco" && pensandoIA && (
                <div className="thinking-dots"><span /><span /><span /></div>
              )}
            </div>
            <div className="captured-zone">
              <div className="captured-label">Piezas capturadas</div>
              <div className="captured-pieces">
                {capturadas.blanco.length === 0 && <span className="captured-empty">—</span>}
                {capturadas.blanco.map((t, i) => (
                  <span key={i} className="captured-piece white-cap">{GLYPHS[t]}</span>
                ))}
              </div>
              {ventaja < 0 && <div className="advantage">+{-ventaja}</div>}
            </div>
          </aside>

          <div className="board-outer">
            <div className="board-frame">
              <div className="board">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={`rl-${i}`} className="rank-label" style={{ top: `${i * 12.5 + 6.25}%` }}>
                    {8 - i}
                  </div>
                ))}
                {FILAS.map((f, i) => (
                  <div key={`fl-${i}`} className="file-label" style={{ left: `${i * 12.5 + 6.25}%` }}>
                    {f}
                  </div>
                ))}

                {Array.from({ length: 64 }).map((_, i) => {
                  const r = Math.floor(i / 8);
                  const c = i % 8;
                  const clara = (r + c) % 2 === 0;
                  const isSel = sel && sel.r === r && sel.c === c;
                  const isLast =
                    ultimo &&
                    ((ultimo.from.r === r && ultimo.from.c === c) ||
                      (ultimo.to.r === r && ultimo.to.c === c));
                  const hint = legales.some((m) => m.r === r && m.c === c);
                  const captura = hint && tablero[r][c];
                  const esJaque = casillaJaque && casillaJaque.r === r && casillaJaque.c === c;

                  return (
                    <div
                      key={`sq-${r}-${c}`}
                      className={[
                        "square",
                        clara ? "light" : "dark",
                        isSel ? "selected" : "",
                        isLast ? "last-move" : "",
                        esJaque ? "in-check" : "",
                      ].join(" ")}
                      style={{ left: `${c * 12.5}%`, top: `${r * 12.5}%` }}
                      onClick={() => click(r, c)}
                    >
                      {hint && !captura && <div className="move-dot" />}
                      {hint && captura && <div className="move-ring" />}
                    </div>
                  );
                })}

                {piezasRender.map(({ pieza, r, c }) => (
                  <div
                    key={pieza.id}
                    className={`piece piece-${pieza.color}`}
                    style={{ left: `${c * 12.5}%`, top: `${r * 12.5}%` }}
                    onClick={() => click(r, c)}
                  >
                    <span className="piece-glyph">{GLYPHS[pieza.tipo]}</span>
                  </div>
                ))}

                {pensandoIA && <div className="thinking-overlay" />}
              </div>
            </div>
          </div>

          <aside className="side-panel">
            <div className={`player-card ${turno === "blanco" ? "active" : ""}`}>
              <div className="player-ornament" />
              <div className="player-label">{labelJugador("blanco")}</div>
              <div className="player-dot" />
              <div className="player-status">{statusJugador("blanco")}</div>
              {modo === "bot" && turno === "blanco" && colorJugador === "negro" && pensandoIA && (
                <div className="thinking-dots"><span /><span /><span /></div>
              )}
            </div>
            <div className="captured-zone">
              <div className="captured-label">Piezas capturadas</div>
              <div className="captured-pieces">
                {capturadas.negro.length === 0 && <span className="captured-empty">—</span>}
                {capturadas.negro.map((t, i) => (
                  <span key={i} className="captured-piece black-cap">{GLYPHS[t]}</span>
                ))}
              </div>
              {ventaja > 0 && <div className="advantage">+{ventaja}</div>}
            </div>
          </aside>
        </main>

        <section className="bottom-row">
          <div className="history-panel">
            <div className="history-title">REGISTRO DE JUGADAS</div>
            <div className="history-list">
              {historial.length === 0 && (
                <div className="history-empty"><em>La partida aún no ha comenzado…</em></div>
              )}
              {historial.map((h, i) => (
                <div key={i} className={`history-entry ${h.color}`}>
                  <span className="history-num">{Math.floor(i / 2) + 1}.</span>
                  <span className="history-move">{h.notacion}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bottom-buttons">
            <button className="reset-btn" onClick={reiniciar}>
              <span>Reiniciar</span>
            </button>
            <button className="reset-btn ghost" onClick={volverAlMenu}>
              <span>← Menú</span>
            </button>
          </div>
        </section>

        <footer className="app-footer">
          <div className="footer-line" />
          <p>◆ Hecho con obsesión por el detalle ◆</p>
        </footer>
      </div>

      {fin && (
        <div className="game-over-overlay" onClick={reiniciar}>
          <div className="game-over-card" onClick={(e) => e.stopPropagation()}>
            <div className="go-ornament top" />
            <div className="go-crown">♛</div>
            <div className="go-type">
              {fin.tipo === "mate" ? "Jaque Mate" : "Tablas"}
            </div>
            <div className="go-winner">
              {fin.tipo === "mate"
                ? modo === "bot"
                  ? fin.ganador === colorJugador
                    ? "Victoria suya — ha vencido al motor"
                    : "La máquina lo ha vencido"
                  : `Victoria para las ${fin.ganador === "blanco" ? "blancas" : "negras"}`
                : "Rey ahogado — sin movimientos legales"}
            </div>
            <div className="go-buttons">
              <button className="reset-btn inverted" onClick={reiniciar}>
                <span>Nueva partida</span>
              </button>
              <button className="reset-btn ghost" onClick={volverAlMenu}>
                <span>← Menú</span>
              </button>
            </div>
            <div className="go-ornament bottom" />
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   CSS
   ============================================================ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500&family=Jost:wght@300;400;500;600&display=swap');

.app-root {
  --bg-deep: #030814;
  --bg-raise: #081125;
  --gold: #5b8fd9;
  --gold-bright: #8fb8ee;
  --gold-soft: rgba(91, 143, 217, 0.3);
  --ivory: #dce5f2;
  --ivory-dim: #6a7a95;
  --piece-white: #eaf1fc;
  --piece-black: #08101f;
  --accent-red: #c5452e;

  position: relative;
  min-height: 100vh;
  background: radial-gradient(ellipse at 50% 40%, #0c1a35 0%, #030814 70%);
  font-family: 'Jost', sans-serif;
  color: var(--ivory);
  padding: 40px 24px 24px;
  overflow-x: hidden;
  opacity: 0;
  transition: opacity 1.2s ease;
}
.app-root.ready { opacity: 1; }

.bg-grain {
  position: fixed; inset: 0; pointer-events: none;
  opacity: 0.04; mix-blend-mode: overlay; z-index: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E");
}
.bg-glow {
  position: fixed; top: 45%; left: 50%;
  transform: translate(-50%, -50%);
  width: 1000px; height: 1000px;
  background: radial-gradient(circle, rgba(91,143,217,0.1) 0%, transparent 55%);
  pointer-events: none; filter: blur(60px); z-index: 0;
}
.bg-vignette {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background: radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%);
}

.app-container, .menu-wrap {
  position: relative; z-index: 1;
  max-width: 1280px; margin: 0 auto;
}
.menu-wrap {
  max-width: 1000px;
  display: flex; flex-direction: column; align-items: center;
  padding: 20px 0 60px;
}

.app-header, .menu-header {
  text-align: center; margin-bottom: 48px;
  animation: fade-up 1.2s cubic-bezier(0.2, 0.6, 0.3, 1) both;
}
.menu-header { margin-bottom: 18px; }
.header-line {
  width: 120px; height: 1px; margin: 0 auto 20px;
  background: linear-gradient(90deg, transparent, var(--gold), transparent);
}
.header-line + .header-line { margin: 18px auto 0; }
.app-title {
  font-family: 'Cormorant Garamond', serif;
  font-weight: 300;
  font-size: clamp(3rem, 8vw, 5.5rem);
  letter-spacing: 0.38em;
  margin: 0;
  background: linear-gradient(180deg, #eaf1fc 0%, var(--gold) 55%, #1f3a6a 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 0 40px rgba(91, 143, 217, 0.25));
  padding-left: 0.38em;
}
.app-subtitle {
  font-family: 'Cormorant Garamond', serif;
  font-style: italic; font-weight: 400;
  font-size: 1.1rem; letter-spacing: 0.15em;
  color: var(--ivory-dim); margin: 8px 0 0;
}

.menu-instruccion {
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 1.4rem;
  color: var(--ivory);
  letter-spacing: 0.05em;
  margin: 0 0 36px;
  animation: fade-in 1.2s ease 0.4s both;
}

.mode-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px;
  width: 100%;
  max-width: 760px;
  margin-bottom: 40px;
  animation: fade-up 1.2s ease 0.5s both;
}
@media (max-width: 680px) {
  .mode-cards { grid-template-columns: 1fr; }
}

.mode-card {
  position: relative;
  padding: 48px 32px 42px;
  background: linear-gradient(180deg, rgba(91,143,217,0.04), rgba(0,0,0,0.3));
  border: 1px solid rgba(91, 143, 217, 0.22);
  color: var(--ivory);
  cursor: pointer;
  font-family: 'Jost', sans-serif;
  transition: all 0.5s cubic-bezier(0.3, 0.6, 0.3, 1);
  overflow: hidden;
  text-align: center;
}
.mode-card::before {
  content: '';
  position: absolute; inset: 0;
  background: radial-gradient(circle at 50% 0%, rgba(91,143,217,0.15), transparent 70%);
  opacity: 0;
  transition: opacity 0.5s ease;
}
.mode-card:hover::before, .mode-card.selected::before { opacity: 1; }
.mode-card:hover {
  transform: translateY(-4px);
  border-color: rgba(91, 143, 217, 0.5);
  box-shadow: 0 20px 50px rgba(0,0,0,0.5), 0 0 40px rgba(91,143,217,0.15);
}
.mode-card.selected {
  border-color: var(--gold);
  box-shadow: 0 0 50px rgba(91,143,217,0.25), inset 0 0 30px rgba(91,143,217,0.06);
  transform: translateY(-4px);
}
.mode-ornament {
  position: absolute; left: 50%; top: 18px;
  transform: translateX(-50%);
  width: 50%; height: 1px;
  background: linear-gradient(90deg, transparent, var(--gold), transparent);
  opacity: 0.5;
}
.mode-ornament.bottom { top: auto; bottom: 18px; }
.mode-icon {
  font-size: 3rem;
  color: var(--gold);
  margin-bottom: 20px;
  text-shadow: 0 0 24px var(--gold-soft), 0 0 40px rgba(91,143,217,0.2);
  letter-spacing: 0.2em;
}
.mode-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 1.8rem;
  font-weight: 400;
  letter-spacing: 0.12em;
  margin-bottom: 14px;
  color: var(--ivory);
}
.mode-card.selected .mode-title {
  background: linear-gradient(180deg, var(--ivory), var(--gold));
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.mode-desc {
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 1rem;
  color: var(--ivory-dim);
  line-height: 1.5;
}

.bot-options {
  width: 100%;
  max-width: 760px;
  display: flex; flex-direction: column;
  gap: 28px;
  margin-bottom: 36px;
  padding: 32px;
  border: 1px solid rgba(91,143,217,0.18);
  background: linear-gradient(180deg, rgba(91,143,217,0.02), transparent);
  animation: fade-up 0.6s cubic-bezier(0.3, 0.6, 0.3, 1) both;
}
.option-group { display: flex; flex-direction: column; gap: 14px; }
.option-label {
  font-size: 0.72rem;
  letter-spacing: 0.3em;
  color: var(--gold);
  font-weight: 500;
  text-align: center;
}
.option-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}
.option-row.color-row {
  grid-template-columns: repeat(2, 1fr);
}
@media (max-width: 600px) {
  .option-row { grid-template-columns: 1fr; }
}

.option-btn {
  padding: 16px 14px;
  background: transparent;
  border: 1px solid rgba(91,143,217,0.18);
  color: var(--ivory);
  font-family: 'Jost', sans-serif;
  cursor: pointer;
  transition: all 0.35s ease;
  text-align: center;
}
.option-btn:hover {
  border-color: rgba(91,143,217,0.45);
  background: rgba(91,143,217,0.05);
}
.option-btn.active {
  border-color: var(--gold);
  background: rgba(91,143,217,0.08);
  box-shadow: 0 0 24px rgba(91,143,217,0.18);
}
.opt-name {
  font-family: 'Cormorant Garamond', serif;
  font-size: 1.2rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  margin-bottom: 4px;
}
.option-btn.active .opt-name {
  color: var(--gold);
}
.opt-desc {
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 0.82rem;
  color: var(--ivory-dim);
}

.color-btn { padding: 20px 14px; }
.color-glyph {
  font-size: 2.2rem;
  margin-bottom: 8px;
  line-height: 1;
}
.color-glyph.white { color: var(--piece-white); text-shadow: 0 0 12px rgba(220,229,242,0.5), 0 2px 4px rgba(0,0,0,0.6); }
.color-glyph.black { color: var(--piece-black); text-shadow: 0 2px 6px rgba(0,0,0,0.9), 0 0 2px rgba(91,143,217,0.3); }

.main-grid {
  display: grid;
  grid-template-columns: 220px 1fr 220px;
  gap: 32px;
  align-items: start;
}
@media (max-width: 960px) {
  .main-grid { grid-template-columns: 1fr; gap: 20px; }
  .side-panel { flex-direction: row !important; }
  .side-panel > * { flex: 1; }
}

.side-panel {
  display: flex; flex-direction: column; gap: 20px;
  animation: fade-in 1.4s ease 0.3s both;
}
.player-card {
  position: relative;
  padding: 22px 20px;
  border: 1px solid rgba(91, 143, 217, 0.18);
  background: linear-gradient(180deg, rgba(91,143,217,0.04), transparent 80%);
  transition: all 0.6s cubic-bezier(0.3, 0.6, 0.3, 1);
  overflow: hidden;
}
.player-card::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(135deg, transparent 0%, rgba(91,143,217,0.08) 50%, transparent 100%);
  transform: translateX(-100%);
  transition: transform 1.2s ease;
}
.player-card.active::before { transform: translateX(100%); }
.player-card.active {
  border-color: var(--gold);
  box-shadow:
    0 0 50px rgba(91, 143, 217, 0.18),
    inset 0 0 30px rgba(91, 143, 217, 0.06);
}
.player-ornament {
  position: absolute; top: 0; left: 50%; transform: translateX(-50%);
  width: 40px; height: 1px;
  background: linear-gradient(90deg, transparent, var(--gold), transparent);
}
.player-label {
  font-family: 'Cormorant Garamond', serif;
  font-size: 1.05rem;
  font-weight: 500;
  letter-spacing: 0.22em;
  color: var(--ivory);
}
.player-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: rgba(91, 143, 217, 0.25);
  margin: 12px 0;
  transition: all 0.5s ease;
}
.player-card.active .player-dot {
  background: var(--gold);
  box-shadow: 0 0 14px var(--gold), 0 0 28px rgba(91,143,217,0.5);
  animation: dot-pulse 2s ease-in-out infinite;
}
.player-status {
  font-size: 0.78rem;
  font-style: italic;
  color: var(--ivory-dim);
  letter-spacing: 0.04em;
}

.thinking-dots {
  display: flex; gap: 4px;
  margin-top: 10px;
}
.thinking-dots span {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--gold);
  opacity: 0.3;
  animation: thinking 1.4s ease-in-out infinite;
}
.thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
.thinking-dots span:nth-child(3) { animation-delay: 0.4s; }

.captured-zone {
  position: relative;
  padding: 16px 18px;
  border: 1px solid rgba(91, 143, 217, 0.12);
  min-height: 90px;
  background: linear-gradient(180deg, transparent, rgba(0,0,0,0.2));
}
.captured-label {
  font-size: 0.68rem;
  letter-spacing: 0.25em;
  color: var(--ivory-dim);
  text-transform: uppercase;
  margin-bottom: 12px;
}
.captured-pieces {
  display: flex; flex-wrap: wrap; gap: 2px;
  font-size: 1.7rem; line-height: 1;
}
.captured-empty { color: var(--ivory-dim); opacity: 0.4; font-size: 1.2rem; }
.captured-piece.white-cap {
  color: var(--piece-white);
  text-shadow: 0 0 8px rgba(220,229,242,0.4), 0 1px 2px rgba(0,0,0,0.6);
}
.captured-piece.black-cap {
  color: #1a2845;
  text-shadow: 0 1px 1px rgba(91,143,217,0.25), 0 1px 2px rgba(0,0,0,0.8);
}
.advantage {
  position: absolute; top: 14px; right: 18px;
  font-family: 'Cormorant Garamond', serif;
  font-size: 1rem; font-weight: 500;
  color: var(--gold);
  letter-spacing: 0.02em;
}

.board-outer {
  display: flex; justify-content: center; align-items: center;
  animation: fade-in 1.2s ease 0.2s both;
}
.board-frame {
  position: relative;
  padding: 36px 40px 44px;
  background:
    radial-gradient(ellipse at 30% 20%, #142545 0%, transparent 60%),
    linear-gradient(135deg, #0c1a35 0%, #040914 100%);
  border: 1px solid rgba(91, 143, 217, 0.4);
  box-shadow:
    0 50px 120px rgba(0,0,0,0.8),
    0 0 80px rgba(91,143,217,0.08),
    inset 0 1px 0 rgba(91,143,217,0.2),
    inset 0 -1px 0 rgba(0,0,0,0.5);
}
.board-frame::before {
  content: ''; position: absolute; inset: 14px;
  border: 1px solid rgba(91, 143, 217, 0.22);
  pointer-events: none;
}
.board-frame::after {
  content: '♛'; position: absolute;
  top: -16px; left: 50%; transform: translateX(-50%);
  font-size: 22px; color: var(--gold);
  background: radial-gradient(ellipse, #030814 40%, transparent 70%);
  padding: 0 14px;
  text-shadow: 0 0 14px var(--gold-soft), 0 0 28px rgba(91,143,217,0.3);
}
.board {
  position: relative;
  width: min(64vh, 560px);
  height: min(64vh, 560px);
  box-shadow: inset 0 0 0 1px rgba(91,143,217,0.25);
}
@media (max-width: 960px) {
  .board { width: min(86vw, 480px); height: min(86vw, 480px); }
}

.square {
  position: absolute;
  width: 12.5%; height: 12.5%;
  cursor: pointer;
  transition: box-shadow 0.3s ease;
}
.square.light {
  background: linear-gradient(135deg, #2a3f66 0%, #1d2d4d 50%, #16233d 100%);
}
.square.dark {
  background: linear-gradient(135deg, #0e1a31 0%, #08111f 50%, #040811 100%);
}
.square::before {
  content: ''; position: absolute; inset: 0;
  background: radial-gradient(circle at 30% 30%, rgba(200,220,255,0.04), transparent 70%);
  pointer-events: none;
}
.square.last-move {
  box-shadow: inset 0 0 0 3px rgba(91,143,217,0.45), inset 0 0 30px rgba(91,143,217,0.18);
}
.square.selected { z-index: 1; animation: sel-pulse 2.2s ease-in-out infinite; }
.square.in-check { z-index: 1; animation: check-pulse 1.1s ease-in-out infinite; }

.move-dot {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 28%; height: 28%;
  border-radius: 50%;
  background: radial-gradient(circle, var(--gold-bright) 0%, var(--gold) 40%, transparent 75%);
  box-shadow: 0 0 20px rgba(91,143,217,0.55), 0 0 40px rgba(91,143,217,0.25);
  pointer-events: none;
  animation: dot-anim 1.8s ease-in-out infinite;
}
.move-ring {
  position: absolute; top: 6%; left: 6%;
  width: 88%; height: 88%;
  border-radius: 50%;
  border: 3px solid var(--gold);
  box-shadow: 0 0 24px rgba(91,143,217,0.5), inset 0 0 18px rgba(91,143,217,0.3);
  pointer-events: none;
  animation: ring-anim 1.8s ease-in-out infinite;
}

.thinking-overlay {
  position: absolute; inset: 0;
  pointer-events: none;
  background: radial-gradient(circle at center, transparent 40%, rgba(0,0,0,0.25) 100%);
  animation: fade-in 0.4s ease;
  z-index: 3;
}

.piece {
  position: absolute;
  width: 12.5%; height: 12.5%;
  display: flex; align-items: center; justify-content: center;
  transition:
    left 0.45s cubic-bezier(0.65, 0, 0.35, 1),
    top 0.45s cubic-bezier(0.65, 0, 0.35, 1);
  pointer-events: none;
  z-index: 2;
}
.piece-glyph {
  font-size: min(7.2vh, 58px);
  line-height: 1;
  cursor: pointer;
  pointer-events: auto;
  transition: transform 0.2s ease, filter 0.3s ease;
  user-select: none;
}
.piece-glyph:hover { transform: scale(1.1) translateY(-2px); }

.piece-blanco .piece-glyph {
  color: var(--piece-white);
  text-shadow:
    0 0 1px #f0f6ff,
    0 2px 4px rgba(0,0,0,0.85),
    0 0 18px rgba(220,229,242,0.45),
    0 0 32px rgba(220,229,242,0.2);
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.6));
}
.piece-negro .piece-glyph {
  color: var(--piece-black);
  text-shadow:
    0 1px 0 rgba(91,143,217,0.5),
    0 2px 6px rgba(0,0,0,0.95),
    0 0 14px rgba(0,0,0,0.8);
  filter:
    drop-shadow(0 4px 8px rgba(0,0,0,0.75))
    drop-shadow(0 0 2px rgba(91,143,217,0.25));
}

.rank-label, .file-label {
  position: absolute;
  font-family: 'Cormorant Garamond', serif;
  font-size: 14px;
  font-style: italic;
  color: var(--gold);
  opacity: 0.65;
  pointer-events: none;
  letter-spacing: 0.05em;
}
.rank-label { left: -22px; transform: translateY(-50%); }
.file-label { bottom: -26px; transform: translateX(-50%); }

.bottom-row {
  margin-top: 40px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 28px;
  align-items: stretch;
  animation: fade-up 1.4s ease 0.5s both;
}
@media (max-width: 960px) {
  .bottom-row { grid-template-columns: 1fr; }
}
.history-panel {
  border: 1px solid rgba(91, 143, 217, 0.18);
  padding: 20px 24px;
  background: linear-gradient(180deg, rgba(91,143,217,0.03), transparent 80%);
  max-height: 170px;
  overflow-y: auto;
  position: relative;
}
.history-panel::before {
  content: ''; position: absolute;
  top: 0; left: 50%; transform: translateX(-50%);
  width: 60%; height: 1px;
  background: linear-gradient(90deg, transparent, var(--gold), transparent);
}
.history-title {
  font-size: 0.72rem;
  letter-spacing: 0.3em;
  color: var(--gold);
  margin-bottom: 14px;
  font-weight: 500;
}
.history-list {
  display: flex; flex-wrap: wrap;
  gap: 12px 20px;
  font-family: 'Cormorant Garamond', serif;
  font-size: 1.1rem;
}
.history-empty {
  color: var(--ivory-dim);
  font-family: 'Cormorant Garamond', serif;
  font-size: 1rem;
}
.history-entry { display: flex; gap: 7px; align-items: baseline; }
.history-num {
  color: var(--ivory-dim);
  font-size: 0.85rem;
  font-family: 'Jost', sans-serif;
}
.history-entry.blanco .history-move { color: var(--piece-white); }
.history-entry.negro .history-move { color: var(--gold); }

.bottom-buttons {
  display: flex; flex-direction: column; gap: 12px;
}

.reset-btn {
  position: relative;
  padding: 18px 38px;
  background: transparent;
  border: 1px solid var(--gold);
  color: var(--gold);
  font-family: 'Cormorant Garamond', serif;
  font-size: 1.05rem;
  font-weight: 500;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  cursor: pointer;
  transition: color 0.4s ease, box-shadow 0.4s ease, transform 0.2s ease;
  overflow: hidden;
}
.reset-btn.big {
  padding: 22px 56px;
  font-size: 1.2rem;
  margin-top: 12px;
  animation: fade-up 0.8s ease 0.2s both;
}
.reset-btn.ghost {
  border-color: rgba(91,143,217,0.35);
  color: var(--ivory-dim);
  font-size: 0.85rem;
  padding: 14px 28px;
  letter-spacing: 0.2em;
}
.reset-btn::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(135deg, var(--gold-bright), var(--gold));
  transform: translateY(101%);
  transition: transform 0.45s cubic-bezier(0.7, 0, 0.3, 1);
}
.reset-btn.ghost::before {
  background: rgba(91,143,217,0.12);
}
.reset-btn span { position: relative; z-index: 1; }
.reset-btn:hover {
  color: var(--bg-deep);
  box-shadow: 0 0 40px rgba(91, 143, 217, 0.5), 0 0 80px rgba(91,143,217,0.15);
}
.reset-btn.ghost:hover {
  color: var(--gold);
  box-shadow: 0 0 20px rgba(91,143,217,0.2);
}
.reset-btn:hover::before { transform: translateY(0); }
.reset-btn:active { transform: scale(0.98); }

.game-over-overlay {
  position: fixed; inset: 0;
  background: rgba(4, 8, 16, 0.88);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
  animation: fade-in 0.6s ease;
}
.game-over-card {
  position: relative;
  padding: 70px 90px 60px;
  background:
    radial-gradient(ellipse at 50% 0%, rgba(91,143,217,0.15), transparent 60%),
    linear-gradient(180deg, #0c1a35 0%, #030814 100%);
  border: 1px solid var(--gold);
  text-align: center;
  max-width: 90vw;
  box-shadow:
    0 0 100px rgba(91, 143, 217, 0.35),
    0 60px 140px rgba(0,0,0,0.9),
    inset 0 1px 0 rgba(91,143,217,0.3);
  animation: card-in 0.9s cubic-bezier(0.2, 0.7, 0.3, 1);
}
.go-ornament {
  position: absolute; left: 50%; transform: translateX(-50%);
  width: 70%; height: 1px;
  background: linear-gradient(90deg, transparent, var(--gold), transparent);
}
.go-ornament.top { top: 26px; }
.go-ornament.bottom { bottom: 26px; }
.go-crown {
  font-size: 2.4rem;
  color: var(--gold);
  text-shadow: 0 0 30px var(--gold), 0 0 60px rgba(91,143,217,0.5);
  margin-bottom: 10px;
  animation: crown-float 3s ease-in-out infinite;
}
.go-type {
  font-family: 'Cormorant Garamond', serif;
  font-size: clamp(2.8rem, 7vw, 4.5rem);
  font-weight: 400;
  letter-spacing: 0.08em;
  background: linear-gradient(180deg, #eaf1fc, var(--gold) 60%, #1f3a6a);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  margin: 14px 0 12px;
  filter: drop-shadow(0 0 30px rgba(91,143,217,0.4));
}
.go-winner {
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 1.35rem;
  color: var(--ivory-dim);
  margin-bottom: 30px;
  letter-spacing: 0.04em;
}
.go-buttons {
  display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;
}

.app-footer {
  margin-top: 48px;
  text-align: center;
  color: var(--ivory-dim);
  font-family: 'Cormorant Garamond', serif;
  font-size: 0.9rem;
  font-style: italic;
  letter-spacing: 0.15em;
  opacity: 0.6;
}
.menu-footer { margin-top: 60px; }
.footer-line {
  width: 60px; height: 1px; margin: 0 auto 14px;
  background: linear-gradient(90deg, transparent, var(--gold), transparent);
}
.app-footer p { margin: 0; }

@keyframes fade-up {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes dot-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.5); opacity: 0.6; }
}
@keyframes thinking {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.3); box-shadow: 0 0 10px var(--gold); }
}
@keyframes sel-pulse {
  0%, 100% {
    box-shadow:
      inset 0 0 0 3px var(--gold),
      inset 0 0 40px rgba(143, 184, 238, 0.28),
      0 0 30px rgba(91,143,217,0.3);
  }
  50% {
    box-shadow:
      inset 0 0 0 3px var(--gold-bright),
      inset 0 0 60px rgba(143, 184, 238, 0.45),
      0 0 50px rgba(91,143,217,0.5);
  }
}
@keyframes check-pulse {
  0%, 100% {
    box-shadow:
      inset 0 0 0 3px var(--accent-red),
      inset 0 0 45px rgba(197, 69, 46, 0.55),
      0 0 40px rgba(197, 69, 46, 0.3);
  }
  50% {
    box-shadow:
      inset 0 0 0 4px #ff6040,
      inset 0 0 70px rgba(255, 96, 64, 0.75),
      0 0 60px rgba(255, 96, 64, 0.5);
  }
}
@keyframes dot-anim {
  0%, 100% { opacity: 0.9; }
  50% { opacity: 1; box-shadow: 0 0 28px rgba(91,143,217,0.75), 0 0 50px rgba(91,143,217,0.35); }
}
@keyframes ring-anim {
  0%, 100% { transform: scale(1); opacity: 0.85; }
  50% { transform: scale(1.05); opacity: 1; }
}
@keyframes card-in {
  from { opacity: 0; transform: scale(0.85) translateY(30px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes crown-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.history-panel::-webkit-scrollbar { width: 6px; }
.history-panel::-webkit-scrollbar-track { background: transparent; }
.history-panel::-webkit-scrollbar-thumb {
  background: rgba(91,143,217,0.3);
  border-radius: 3px;
}
.history-panel::-webkit-scrollbar-thumb:hover { background: var(--gold); }
`;
