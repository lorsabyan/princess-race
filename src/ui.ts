function el<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T
}

export class UI {
  private hud = el<HTMLDivElement>('hud')
  private heartsEl = el<HTMLDivElement>('hearts')
  private coinCountEl = el<HTMLSpanElement>('coin-count')
  private startScreen = el<HTMLDivElement>('start-screen')
  private gameoverScreen = el<HTMLDivElement>('gameover-screen')
  private finalCoinsEl = el<HTMLSpanElement>('final-coins')
  private bestCoinsEl = el<HTMLSpanElement>('best-coins')
  private touchControls = el<HTMLDivElement>('touch-controls')
  private muteBtn = el<HTMLButtonElement>('mute-btn')

  onStart: () => void = () => {}
  onRestart: () => void = () => {}
  onLeft: () => void = () => {}
  onRight: () => void = () => {}
  onToggleMute: () => boolean = () => false

  constructor() {
    el<HTMLButtonElement>('start-btn').addEventListener('click', () => this.onStart())
    el<HTMLButtonElement>('restart-btn').addEventListener('click', () => this.onRestart())

    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') this.onLeft()
      else if (e.key === 'ArrowRight' || e.key === 'd') this.onRight()
    })

    // Tap either half of the screen (mobile/tablet)
    window.addEventListener('touchstart', (e) => {
      const target = e.target as HTMLElement
      if (target.closest('button') || target.closest('.overlay')) return
      const x = e.touches[0].clientX
      if (x < window.innerWidth / 2) this.onLeft()
      else this.onRight()
    }, { passive: true })

    const bind = (id: string, fn: () => void) => {
      el<HTMLButtonElement>(id).addEventListener('touchstart', (e) => {
        e.stopPropagation()
        fn()
      }, { passive: true })
      el<HTMLButtonElement>(id).addEventListener('click', (e) => {
        // Click fires on desktop; touchstart already handled touch
        if (e.detail !== 0) fn()
      })
    }
    bind('btn-left', () => this.onLeft())
    bind('btn-right', () => this.onRight())

    this.muteBtn.addEventListener('click', () => {
      const muted = this.onToggleMute()
      this.muteBtn.textContent = muted ? '🔇' : '🔊'
    })
  }

  showStart() {
    this.startScreen.classList.remove('hidden')
    this.gameoverScreen.classList.add('hidden')
    this.hud.classList.add('hidden')
    this.touchControls.classList.add('hidden')
  }

  showPlaying() {
    this.startScreen.classList.add('hidden')
    this.gameoverScreen.classList.add('hidden')
    this.hud.classList.remove('hidden')
    this.touchControls.classList.remove('hidden')
  }

  showGameOver(coins: number, best: number) {
    this.finalCoinsEl.textContent = String(coins)
    this.bestCoinsEl.textContent = String(best)
    this.gameoverScreen.classList.remove('hidden')
    this.touchControls.classList.add('hidden')
  }

  setHearts(hearts: number, max: number) {
    this.heartsEl.innerHTML = Array.from({ length: max }, (_, i) =>
      `<span class="${i < hearts ? '' : 'lost'}">💗</span>`
    ).join('')
  }

  setCoins(coins: number) {
    this.coinCountEl.textContent = String(coins)
    this.coinCountEl.classList.remove('pop')
    // Restart the pop animation
    void this.coinCountEl.offsetWidth
    this.coinCountEl.classList.add('pop')
  }
}
