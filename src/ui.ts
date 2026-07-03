import { CAR_COLORS, type CarColorId } from './common3d'

const NAME_KEY = 'princess-race-name'
const SPEED_KEY = 'princess-race-speed'
const COLOR_KEY = 'princess-race-color'

export type SpeedMode = 'calm' | 'fast'

function el<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T
}

export class UI {
  private hud = el<HTMLDivElement>('hud')
  private heartsEl = el<HTMLDivElement>('hearts')
  private coinCountEl = el<HTMLSpanElement>('coin-count')
  private startScreen = el<HTMLDivElement>('start-screen')
  private gameoverScreen = el<HTMLDivElement>('gameover-screen')
  private pauseScreen = el<HTMLDivElement>('pause-screen')
  private gameoverTitle = el<HTMLHeadingElement>('gameover-title')
  private finalCoinsEl = el<HTMLSpanElement>('final-coins')
  private bestCoinsEl = el<HTMLSpanElement>('best-coins')
  private starsEl = el<HTMLDivElement>('stars')
  private touchControls = el<HTMLDivElement>('touch-controls')
  private muteBtn = el<HTMLButtonElement>('mute-btn')
  private powerEl = el<HTMLDivElement>('power')
  private powerIcon = el<HTMLSpanElement>('power-icon')
  private powerTime = el<HTMLSpanElement>('power-time')
  private nameInput = el<HTMLInputElement>('name-input')
  private bankEl = el<HTMLSpanElement>('bank')
  private garageRow = el<HTMLDivElement>('garage-row')

  onStart: () => void = () => {}
  onRestart: () => void = () => {}
  onLeft: () => void = () => {}
  onRight: () => void = () => {}
  onToggleMute: () => boolean = () => false
  onPause: () => void = () => {}
  onResume: () => void = () => {}
  onHome: () => void = () => {}
  onColorSelect: (id: CarColorId) => void = () => {}

  constructor() {
    el<HTMLButtonElement>('start-btn').addEventListener('click', () => this.onStart())
    el<HTMLButtonElement>('restart-btn').addEventListener('click', () => this.onRestart())
    el<HTMLButtonElement>('pause-btn').addEventListener('click', () => this.onPause())
    el<HTMLButtonElement>('resume-btn').addEventListener('click', () => this.onResume())
    el<HTMLButtonElement>('home-btn').addEventListener('click', () => this.onHome())
    el<HTMLButtonElement>('pause-home-btn').addEventListener('click', () => this.onHome())

    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') this.onLeft()
      else if (e.key === 'ArrowRight' || e.key === 'd') this.onRight()
      else if (e.key === 'p' || e.key === 'Escape') this.onPause()
    })

    // Tap either half of the screen (mobile/tablet)
    window.addEventListener('touchstart', (e) => {
      const target = e.target as HTMLElement
      if (target.closest('button') || target.closest('.overlay') || target.closest('input')) return
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
        if (e.detail !== 0) fn()
      })
    }
    bind('btn-left', () => this.onLeft())
    bind('btn-right', () => this.onRight())

    this.muteBtn.addEventListener('click', () => {
      const muted = this.onToggleMute()
      this.muteBtn.textContent = muted ? '🔇' : '🔊'
    })

    // Name — saved as it is typed
    this.nameInput.value = localStorage.getItem(NAME_KEY) ?? ''
    this.nameInput.addEventListener('input', () => {
      localStorage.setItem(NAME_KEY, this.nameInput.value.trim())
    })

    // Speed mode toggle
    const calm = el<HTMLButtonElement>('speed-calm')
    const fast = el<HTMLButtonElement>('speed-fast')
    const applySpeed = (mode: SpeedMode) => {
      localStorage.setItem(SPEED_KEY, mode)
      calm.classList.toggle('active', mode === 'calm')
      fast.classList.toggle('active', mode === 'fast')
    }
    calm.addEventListener('click', () => applySpeed('calm'))
    fast.addEventListener('click', () => applySpeed('fast'))
    applySpeed(this.speedMode)
  }

  get playerName(): string {
    return (localStorage.getItem(NAME_KEY) ?? '').trim()
  }

  get speedMode(): SpeedMode {
    return localStorage.getItem(SPEED_KEY) === 'calm' ? 'calm' : 'fast'
  }

  get selectedColor(): CarColorId {
    const saved = localStorage.getItem(COLOR_KEY)
    return (CAR_COLORS.some((c) => c.id === saved) ? saved : 'pink') as CarColorId
  }

  /** Rebuild the garage swatches for the current coin bank. */
  renderGarage(bank: number) {
    this.bankEl.textContent = `(ունես ${bank} 🪙)`
    this.garageRow.innerHTML = ''
    for (const color of CAR_COLORS) {
      const locked = bank < color.need
      const btn = document.createElement('button')
      btn.className = 'swatch' + (locked ? ' locked' : '') +
        (color.id === this.selectedColor ? ' selected' : '')
      btn.style.background = `radial-gradient(circle at 35% 30%, #ffffff55, ${color.css} 55%)`
      btn.textContent = locked ? `🔒${color.need}` : ''
      btn.setAttribute('aria-label', color.id)
      if (!locked) {
        btn.addEventListener('click', () => {
          localStorage.setItem(COLOR_KEY, color.id)
          this.onColorSelect(color.id)
          this.renderGarage(bank)
        })
      }
      this.garageRow.appendChild(btn)
    }
  }

  showStart() {
    this.startScreen.classList.remove('hidden')
    this.gameoverScreen.classList.add('hidden')
    this.pauseScreen.classList.add('hidden')
    this.hud.classList.add('hidden')
    this.touchControls.classList.add('hidden')
  }

  showPlaying() {
    this.startScreen.classList.add('hidden')
    this.gameoverScreen.classList.add('hidden')
    this.pauseScreen.classList.add('hidden')
    this.hud.classList.remove('hidden')
    this.touchControls.classList.remove('hidden')
    this.setPower(null, 0)
  }

  showPause() {
    this.pauseScreen.classList.remove('hidden')
  }

  hidePause() {
    this.pauseScreen.classList.add('hidden')
  }

  showGameOver(coins: number, best: number, stars: number) {
    const name = this.playerName
    this.gameoverTitle.textContent = name ? `Ապրե՛ս, ${name}` : 'Ապրե՛ս'
    this.finalCoinsEl.textContent = String(coins)
    this.bestCoinsEl.textContent = String(best)
    const spans = this.starsEl.querySelectorAll('span')
    spans.forEach((s, i) => {
      s.textContent = '⭐'
      s.classList.toggle('earned', i < stars)
    })
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
    void this.coinCountEl.offsetWidth
    this.coinCountEl.classList.add('pop')
  }

  /** Show the active power-up with remaining seconds, or hide with kind=null. */
  setPower(kind: 'magnet' | 'star' | null, seconds: number) {
    if (!kind) {
      this.powerEl.classList.add('hidden')
      return
    }
    this.powerEl.classList.remove('hidden')
    this.powerIcon.textContent = kind === 'magnet' ? '🧲' : '⭐'
    this.powerTime.textContent = String(Math.max(0, Math.ceil(seconds)))
  }
}
