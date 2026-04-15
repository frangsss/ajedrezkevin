# ajedrezkevin

Ajedrez con temática azul marino profundo — hecho en React + Vite.

## Características

- Tablero completo con todas las reglas (jaque, jaque mate, tablas, promoción automática de peón).
- Dos modos de juego:
  - **Contra persona** — dos jugadores en el mismo tablero.
  - **Contra la máquina** — motor con minimax + poda alpha-beta + piece-square tables.
- Tres niveles de dificultad: Aprendiz, Caballero, Maestro.
- Elección de color cuando jugás contra el bot.
- Animaciones suaves de piezas, indicadores de jugadas legales, resaltado del último movimiento, pulso rojo cuando hay jaque.
- Estética "azul marino profundo" con tipografía Cormorant Garamond + Jost.

## Correr localmente

```bash
npm install
npm run dev
```

Abrí http://localhost:5173

## Build para producción

```bash
npm run build
npm run preview
```

## Estructura

```
ajedrezkevin/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx        # Entry de React
    └── Ajedrez.jsx     # Componente completo: motor, IA y UI
```

Todo el juego vive en un solo componente `Ajedrez.jsx` — motor de ajedrez, IA con minimax y la UI están en un mismo archivo para facilitar lectura y portabilidad.

## Sobre la IA

El motor inline usa minimax con poda alpha-beta, ordenamiento de movimientos (capturas primero estilo MVV-LVA) y piece-square tables para juego posicional. Los tres niveles mapean a profundidades 1, 2 y 3.

Si querés enchufar Stockfish real como Web Worker, reemplazá la llamada a `elegirJugadaIA(...)` en el `useEffect` por un `postMessage` al worker usando la función `generarFEN()` que ya está incluida.
