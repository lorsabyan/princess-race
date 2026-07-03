import { Game } from './game'

const game = new Game(document.getElementById('app')!)
game.start()

// Handy handle for debugging from the browser console
;(window as unknown as { __game: Game }).__game = game
