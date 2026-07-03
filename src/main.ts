import { Game } from './game'

const game = new Game(document.getElementById('app')!)
game.start()

// Handy handle for debugging from the browser console
;(window as unknown as { __game: Game }).__game = game

// Offline support (PWA) — only for production builds
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js')
  })
}
