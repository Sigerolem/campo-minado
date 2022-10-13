import { useEffect, useRef, useState } from 'react'
import { DifficultySettings } from '../components/DifficultySettings'
import { EndGameModal } from '../components/EndGameModal'
import { HowToPlay } from '../components/HowToPlay'
import { Tile } from '../components/Tile'
import { countBombsAround, fillArray, listTilesAround, placeBombs, Size, TileType } from '../utils'
import styles from './Home.module.scss'

const difficultySets = {
  easy: {
    size: {
      x: 10,
      y: 10
    },
    bombsAmount: 12
  },
  intermediate: {
    size: {
      x: 18,
      y: 14
    },
    bombsAmount: 35
  },
  hard: {
    size: {
      x: 24,
      y: 20
    },
    bombsAmount: 70
  },
  expert: {
    size: {
      x: 34,
      y: 20
    },
    bombsAmount: 110
  }
}

export type Difficulty = 'easy' | 'intermediate' | 'hard' | 'expert'

export function Home() {
  const difficulty = useRef<Difficulty>('easy')
  const size = useRef<Size>({ x: 10, y: 10 })
  const bombsAmount = useRef(12)
  const bombs = useRef([] as number[])
  const checkedTiles = useRef([] as number[])
  const [tiles, setTiles] = useState(fillArray(size.current))
  const [bombsLeft, setBombsLeft] = useState(10)
  const [timer, setTimer] = useState(0)
  const timerTicking = useRef<number>()
  const pauseTimer = useRef(false)
  const [modal, setModal] = useState(false)
  const endGameSituation = useRef<'won' | 'lost'>('won')

  useEffect(() => {
    if (checkedTiles.current.length === ((size.current.x * size.current.y) - bombsAmount.current)) {
      pauseTimer.current = true
      setTimeout(() => {
        const bestTime = parseInt(localStorage.getItem('bestMineSweeperTime') ?? '0')
        if (timer < bestTime || bestTime === 0) {
          localStorage.setItem('bestMineSweeperTime', String(timer))
        }
        endGameSituation.current = 'won'
        setModal(true)
      }, 400)
    }
    setBombsLeft(bombsAmount.current - tiles.reduce((acc, item) => (item.value === '!' ? ++acc : acc), 0))
  }, [tiles])

  useEffect(() => {
    if (timer !== 0) return
    timerTicking.current = setInterval(() => {
      if (pauseTimer.current) return
      setTimer(prev => prev + 1)
    }, 1000)
  }, [timer])

  function changeDifficulty(newDifficulty: Difficulty) {
    if (difficulty.current === newDifficulty && bombsAmount.current === difficultySets[newDifficulty].bombsAmount) return

    difficulty.current = newDifficulty

    size.current.x = difficultySets[difficulty.current].size.x
    size.current.y = difficultySets[difficulty.current].size.y
    bombsAmount.current = difficultySets[difficulty.current].bombsAmount

    resetGame()
  }

  function setCustomDifficulty(difficultySize: Difficulty, customBombsAmount: number) {
    if (difficulty.current === difficultySize && bombsAmount.current === customBombsAmount) return

    if (difficultySize === 'easy' && customBombsAmount > 89) {
      alert('Too many bombs for the selected size.')
      return
    }

    difficulty.current = difficultySize

    size.current.x = difficultySets[difficulty.current].size.x
    size.current.y = difficultySets[difficulty.current].size.y

    bombsAmount.current = customBombsAmount

    resetGame()
  }

  function resetGame() {
    bombs.current = []
    checkedTiles.current = []
    setTiles(fillArray(size.current))
    clearInterval(timerTicking.current)
    setTimer(0)
  }

  function revealBombs() {
    setTiles(prevTiles => prevTiles.map(tile => (
      bombs.current.includes(tile.id) ? { ...tile, value: 'b', checked: true } : tile
    )))
    setTimeout(() => {
      setModal(true)
      endGameSituation.current = 'lost'
      pauseTimer.current = true
    }, 400)
  }

  function revealNumberOfBombsAround(tileId:number, amountOfBombsAround: number) {
    setTiles(prevTiles => prevTiles.map(prevTile => (
      prevTile.id === tileId
        ? { ...prevTile, value: `${amountOfBombsAround > 0 ? amountOfBombsAround : ''}`, checked: true }
        : prevTile
    )))
  }

  function leftClickRecursive(selectedTile: TileType) {
    checkedTiles.current.push(selectedTile.id)

    const tilesAround = listTilesAround(selectedTile.row, selectedTile.column, size.current)
    const bombsAround = countBombsAround(tilesAround, bombs.current)
    revealNumberOfBombsAround(selectedTile.id, bombsAround)

    if (bombsAround > 0) return

    tilesAround.forEach(tileId => {
      if (checkedTiles.current.includes(tileId) === true || tiles[tileId].checked === true) return
      leftClickRecursive(tiles[tileId])
    })
  }

  function handleLeftClick(selectedTile: TileType) {
    if (bombs.current.length === 0) bombs.current = placeBombs(bombsAmount.current, size.current, selectedTile.id)

    if (selectedTile.checked === true || checkedTiles.current.includes(selectedTile.id)) return

    if (selectedTile.value === '!' || selectedTile.value === '?') return

    if (bombs.current.includes(selectedTile.id)) {
      revealBombs()
      return
    }

    leftClickRecursive(selectedTile)
  }

  function handleRightClick(selectedTile: TileType) {
    if (selectedTile.checked === true || checkedTiles.current.includes(selectedTile.id)) return

    setTiles(prevState => prevState.map(tile => (
      tile.id === selectedTile.id
        ? { ...tile, value: tile.value === '!' ? '?' : tile.value === '?' ? '' : '!' }
        : tile
    )))
  }

  function closeEndGameModal() {
    setModal(false)
    pauseTimer.current = false
    resetGame()
  }

  return (
    <main onContextMenu={(e) => e.preventDefault()} className={styles.main}>
      <header className={styles.header} >
        <div className={styles.headerLine} >
          <div className={styles.bombsLeft} >
            <img src="mine.svg" alt="Mine Image" />
            <strong>{`${bombsLeft}`}</strong>
          </div>
          <div className={styles.timePassed} >
            <strong>{`${timer}`}</strong>
            <img src="wood.svg" alt="Mine Image" />
          </div>
        </div>

        <div className={styles.headerLine} >
          <DifficultySettings changeDifficulty={changeDifficulty} setCustomDifficulty={setCustomDifficulty} />
          <button
            disabled={timer === 0}
            className={styles.restartButton}
            onClick={resetGame}
          >
            Restart
          </button>
          <HowToPlay />
        </div>

      </header>
      <div
      className={styles.grid}
      style={{
        gridTemplateColumns: `repeat(${size.current.x}, 1fr)`,
        marginTop: `calc(${size.current.x - size.current.y} * var(--margin-rotation))`
      }}>
        {tiles.map(item =>
          <Tile leftClick={handleLeftClick} rightClick={handleRightClick} tile={item} key={item.id} />
        )}
      </div>
      <EndGameModal
        showModal={modal}
        situation={endGameSituation.current}
        closeModal={closeEndGameModal}
        time={timer}
      />
    </main>
  )
}
