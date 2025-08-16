"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"

const riddles = [
  {
    question: "I'm tall when I'm young, and short when I'm old. What am I?",
    hint: "It melts as it gives light.",
    answers: ["candle"],
  },
  {
    question: "What has keys but can't open locks?",
    hint: "It can make music or type a letter.",
    answers: ["piano", "keyboard"],
  },
  { question: "What must be broken before you can use it?", hint: "Common at breakfast.", answers: ["egg", "an egg"] },
  {
    question: "I come once in a minute, twice in a moment, but never in a thousand years. What am I?",
    hint: "Look at letters.",
    answers: ["letter m", "m"],
  },
  { question: "What has many teeth but can't bite?", hint: "You comb your hair with it.", answers: ["comb"] },
  {
    question: "The more you take away, the more I become. What am I?",
    hint: "You make me when you dig.",
    answers: ["hole"],
  },
  {
    question: "I have one eye but cannot see. What am I?",
    hint: "Use me to sew.",
    answers: ["needle", "sewing needle"],
  },
  {
    question: "What can travel around the world while staying in the same corner?",
    hint: "Put it on an envelope.",
    answers: ["stamp", "postage stamp"],
  },
  { question: "What gets wetter the more it dries?", hint: "You use it after shower.", answers: ["towel"] },
  { question: "What comes down but never goes up?", hint: "You can carry an umbrella for it.", answers: ["rain"] },
  {
    question: "I'm always in front of you but can't be seen. What am I?",
    hint: "It's yet to happen.",
    answers: ["future"],
  },
  { question: "What has a neck but no head?", hint: "You pour liquids from it.", answers: ["bottle"] },
  {
    question: "I have branches, but no leaves, trunk, or fruit. What am I?",
    hint: "You visit it for transactions.",
    answers: ["bank"],
  },
  {
    question: "What can be cracked, made, told and played?",
    hint: "It often makes people laugh.",
    answers: ["joke", "a joke"],
  },
  {
    question: "I'm not alive but I grow; I don't have lungs but I need air. What am I?",
    hint: "Keep water away from me.",
    answers: ["fire"],
  },
  { question: "What has words but never speaks?", hint: "You borrow knowledge from it.", answers: ["book"] },
  {
    question: "The more you take, the more you leave behind. What am I?",
    hint: "Walk and see.",
    answers: ["footsteps", "steps", "footstep"],
  },
  {
    question: "I run but never walk; I have a mouth but never talk. What am I?",
    hint: "Find me in nature.",
    answers: ["river", "stream", "water"],
  },
  {
    question: "I'm light as a feather, yet the strongest person can't hold me for more than a few minutes. What am I?",
    hint: "You breathe me.",
    answers: ["breath", "air"],
  },
  { question: "What has one head, one foot and four legs?", hint: "You use it every night.", answers: ["bed"] },
  {
    question: "What begins with T, ends with T, and has T in it?",
    hint: "Pour me out when it's tea time.",
    answers: ["teapot"],
  },
  {
    question: "What has cities, but no houses; mountains but no trees; and water but no fish?",
    hint: "You can fold me.",
    answers: ["map"],
  },
  {
    question: "I'm so fragile that saying my name breaks me. What am I?",
    hint: "Be quiet.",
    answers: ["silence", "quiet"],
  },
  {
    question: "I am taken before you get it. What am I?",
    hint: "Photographers love me.",
    answers: ["photograph", "photo", "picture", "snapshot"],
  },
  {
    question: "What goes up when the rain comes down?",
    hint: "You put it up to stay dry.",
    answers: ["umbrella", "parasol"],
  },
  { question: "What flies without wings?", hint: "It's often said '___ flies.'", answers: ["time"] },
]

const suddenDeathRiddle = {
  question: "I am an odd number. Take away a letter and I become even. What number am I?",
  hint: "", // No hint for sudden death
  answers: ["7", "seven", "Seven"],
}

type GameState = "lobby" | "playing" | "results" | "suddenDeath"
type Team = "A" | "B"

interface Settings {
  secondsPerQuestion: number
  typoTolerance: boolean
  sfx: boolean
}

interface GameData {
  gameState: GameState
  currentRound: number
  currentTeam: Team
  progressA: number
  progressB: number
  scoreA: number
  scoreB: number
  hintsUsedA: number
  hintsUsedB: number
  usedHintThisRound: boolean
  timerSecondsRemaining: number
  settings: Settings
  teamAName: string
  teamBName: string
  isPaused: boolean
  showHint: boolean
  userAnswer: string
  showCorrectAnswer: string
  animationState: "none" | "correct-fast" | "correct-slow" | "wrong" | "timeout" | "winner"
  teamAAttempted: boolean
  teamBAttempted: boolean
  bothTeamsAttempted: boolean
}

function levenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1)
    .fill(null)
    .map(() => Array(a.length + 1).fill(null))

  for (let i = 0; i <= a.length; i++) matrix[0][i] = i
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[j][i] = Math.min(matrix[j][i - 1] + 1, matrix[j - 1][i] + 1, matrix[j - 1][i - 1] + indicator)
    }
  }

  return matrix[b.length][a.length]
}

function checkAnswer(userInput: string, acceptedAnswers: string[], typoTolerance: boolean): boolean {
  const normalized = userInput.trim().toLowerCase().replace(/\s+/g, " ")
  if (!normalized || normalized.match(/^[^\w\s]*$/)) return false

  for (const answer of acceptedAnswers) {
    const normalizedAnswer = answer.trim().toLowerCase().replace(/\s+/g, " ")
    if (normalized === normalizedAnswer) return true

    if (typoTolerance) {
      const maxLen = Math.max(normalized.length, normalizedAnswer.length)
      const distance = levenshteinDistance(normalized, normalizedAnswer)
      const similarity = 1 - distance / maxLen
      if (similarity >= 0.85) return true
    }
  }

  return false
}

export default function RiddleRally() {
  const [game, setGame] = useState<GameData>({
    gameState: "lobby",
    currentRound: 0,
    currentTeam: "A",
    progressA: 0,
    progressB: 0,
    scoreA: 0,
    scoreB: 0,
    hintsUsedA: 0,
    hintsUsedB: 0,
    usedHintThisRound: false,
    timerSecondsRemaining: 60,
    settings: { secondsPerQuestion: 60, typoTolerance: false, sfx: true },
    teamAName: "Team A",
    teamBName: "Team B",
    isPaused: false,
    showHint: false,
    userAnswer: "",
    showCorrectAnswer: "",
    animationState: "none",
    teamAAttempted: false,
    teamBAttempted: false,
    bothTeamsAttempted: false,
  })

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const currentRiddle = game.gameState === "suddenDeath" ? suddenDeathRiddle : riddles[game.currentRound]

  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    timerRef.current = setInterval(() => {
      setGame((prev) => {
        if (prev.isPaused || (prev.gameState !== "playing" && prev.gameState !== "suddenDeath")) {
          return prev
        }

        const newTime = prev.timerSecondsRemaining - 1
        if (newTime <= 0) {
          return {
            ...prev,
            timerSecondsRemaining: 0,
            animationState: "timeout",
          }
        }
        return { ...prev, timerSecondsRemaining: newTime }
      })
    }, 1000)
  }, []) // Removed dependencies to prevent circular updates

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, []) // Removed dependencies to prevent circular updates

  const clearAnimationTimeout = useCallback(() => {
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current)
      animationTimeoutRef.current = null
    }
  }, [])

  const nextRound = useCallback(() => {
    stopTimer()
    clearAnimationTimeout()
    setGame((prev) => {
      const newRound = prev.currentRound + 1
      const newTeam: Team = newRound % 2 === 0 ? "A" : "B"

      if (newRound >= 26) {
        if (prev.progressA === prev.progressB) {
          return {
            ...prev,
            gameState: "suddenDeath",
            currentTeam: "A",
            timerSecondsRemaining: 30,
            usedHintThisRound: false,
            showHint: false,
            userAnswer: "",
            showCorrectAnswer: "",
            animationState: "none",
            teamAAttempted: false,
            teamBAttempted: false,
            bothTeamsAttempted: false,
          }
        } else {
          return {
            ...prev,
            gameState: "results",
            animationState: "winner",
          }
        }
      }

      return {
        ...prev,
        currentRound: newRound,
        currentTeam: newTeam,
        timerSecondsRemaining: prev.settings.secondsPerQuestion,
        usedHintThisRound: false,
        showHint: false,
        userAnswer: "",
        showCorrectAnswer: "",
        animationState: "none",
        teamAAttempted: false,
        teamBAttempted: false,
        bothTeamsAttempted: false,
      }
    })
  }, [stopTimer, clearAnimationTimeout])

  const switchTeamSameQuestion = useCallback(() => {
    stopTimer()
    clearAnimationTimeout()
    setGame((prev) => {
      const newTeam: Team = prev.currentTeam === "A" ? "B" : "A"
      const teamAAttempted = prev.currentTeam === "A" ? true : prev.teamAAttempted
      const teamBAttempted = prev.currentTeam === "B" ? true : prev.teamBAttempted
      const bothAttempted = teamAAttempted && teamBAttempted

      return {
        ...prev,
        currentTeam: newTeam,
        teamAAttempted,
        teamBAttempted,
        bothTeamsAttempted: bothAttempted,
        timerSecondsRemaining: prev.settings.secondsPerQuestion,
        usedHintThisRound: false,
        showHint: false,
        userAnswer: "",
        showCorrectAnswer: bothAttempted ? `📚 Answer: ${currentRiddle?.answers[0] || "N/A"}` : "",
        animationState: "none",
      }
    })
  }, [stopTimer, clearAnimationTimeout, currentRiddle])

  const handleSubmit = useCallback(() => {
    if (!game.userAnswer.trim() || !currentRiddle) return

    const isCorrect = checkAnswer(game.userAnswer, currentRiddle.answers, game.settings.typoTolerance)

    if (isCorrect) {
      const baseProgressPerQuestion = 100 / 26 // ~3.85%
      const moveAmount = game.usedHintThisRound ? baseProgressPerQuestion * 0.5 : baseProgressPerQuestion
      const animationType = game.usedHintThisRound ? "correct-slow" : "correct-fast"

      setGame((prev) => ({
        ...prev,
        progressA: prev.currentTeam === "A" ? Math.min(100, prev.progressA + moveAmount) : prev.progressA,
        progressB: prev.currentTeam === "B" ? Math.min(100, prev.progressB + moveAmount) : prev.progressB,
        scoreA: prev.currentTeam === "A" ? prev.scoreA + 1 : prev.scoreA,
        scoreB: prev.currentTeam === "B" ? prev.scoreB + 1 : prev.scoreB,
        hintsUsedA: prev.usedHintThisRound && prev.currentTeam === "A" ? prev.hintsUsedA + 1 : prev.hintsUsedA,
        hintsUsedB: prev.usedHintThisRound && prev.currentTeam === "B" ? prev.hintsUsedB + 1 : prev.hintsUsedB,
        animationState: animationType,
        showCorrectAnswer: game.usedHintThisRound ? "✅ Correct! (Reduced speed)" : "✅ Correct! (Full speed)",
      }))

      if (game.gameState === "suddenDeath") {
        clearAnimationTimeout()
        animationTimeoutRef.current = setTimeout(() => {
          setGame((prev) => ({
            ...prev,
            gameState: "results",
            animationState: "winner",
            showCorrectAnswer: `🏆 ${prev.currentTeam === "A" ? prev.teamAName : prev.teamBName} wins Sudden Death!`,
          }))
        }, 800)
        return
      }

      clearAnimationTimeout()
      animationTimeoutRef.current = setTimeout(() => {
        nextRound()
      }, 800)
    } else {
      if (game.gameState === "suddenDeath") {
        setGame((prev) => ({
          ...prev,
          animationState: "wrong",
          showCorrectAnswer: "❌ Wrong Answer - Keep trying!",
          userAnswer: "", // Clear input for next attempt
        }))

        clearAnimationTimeout()
        animationTimeoutRef.current = setTimeout(() => {
          setGame((prev) => ({ ...prev, animationState: "none", showCorrectAnswer: "" }))
        }, 1200)
        return
      }

      const willBothHaveAttempted =
        (game.currentTeam === "A" && game.teamBAttempted) || (game.currentTeam === "B" && game.teamAAttempted)

      setGame((prev) => ({
        ...prev,
        animationState: "wrong",
        showCorrectAnswer: willBothHaveAttempted
          ? `❌ Both teams failed - Answer: ${currentRiddle?.answers[0] || "N/A"}`
          : `❌ Wrong Answer - Passing to ${prev.currentTeam === "A" ? prev.teamBName : prev.teamAName}`,
      }))

      clearAnimationTimeout()
      animationTimeoutRef.current = setTimeout(() => {
        if (willBothHaveAttempted) {
          nextRound()
        } else {
          switchTeamSameQuestion()
        }
      }, 1200)
    }

    stopTimer()
  }, [
    game.userAnswer,
    game.usedHintThisRound,
    game.settings.typoTolerance,
    game.gameState,
    game.teamAAttempted,
    game.teamBAttempted,
    game.currentTeam,
    currentRiddle,
    stopTimer,
    nextRound,
    switchTeamSameQuestion,
    clearAnimationTimeout,
  ])

  const handleTimeout = useCallback(() => {
    if (game.gameState === "suddenDeath") {
      setGame((prev) => ({
        ...prev,
        animationState: "timeout",
        showCorrectAnswer: "⏳ Time's Up - But you can keep trying!",
        timerSecondsRemaining: 30, // Reset timer for continued attempts
        userAnswer: "", // Clear input
      }))

      clearAnimationTimeout()
      animationTimeoutRef.current = setTimeout(() => {
        setGame((prev) => ({ ...prev, animationState: "none", showCorrectAnswer: "" }))
        startTimer() // Restart timer
      }, 1200)
      return
    }

    const willBothHaveAttempted =
      (game.currentTeam === "A" && game.teamBAttempted) || (game.currentTeam === "B" && game.teamAAttempted)

    setGame((prev) => ({
      ...prev,
      animationState: "timeout",
      showCorrectAnswer: willBothHaveAttempted
        ? `⏳ Both teams timed out - Answer: ${currentRiddle?.answers[0] || "N/A"}`
        : `⏳ Time's Up - Passing to ${prev.currentTeam === "A" ? prev.teamBName : prev.teamAName}`,
    }))

    clearAnimationTimeout()
    animationTimeoutRef.current = setTimeout(() => {
      if (willBothHaveAttempted) {
        nextRound()
      } else {
        switchTeamSameQuestion()
      }
    }, 1200)
  }, [
    game.gameState,
    game.teamAAttempted,
    game.teamBAttempted,
    game.currentTeam,
    currentRiddle,
    nextRound,
    switchTeamSameQuestion,
    clearAnimationTimeout,
    startTimer,
  ])

  const showHint = useCallback(() => {
    setGame((prev) => ({ ...prev, showHint: true, usedHintThisRound: true }))
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit],
  )

  useEffect(() => {
    if (game.timerSecondsRemaining === 0 && game.animationState === "timeout") {
      handleTimeout()
    }
  }, [game.timerSecondsRemaining, game.animationState, handleTimeout])

  useEffect(() => {
    if (game.gameState === "playing" || game.gameState === "suddenDeath") {
      // Small delay to ensure state is settled
      const timeoutId = setTimeout(() => {
        startTimer()
      }, 100)

      return () => {
        clearTimeout(timeoutId)
        stopTimer()
      }
    } else {
      stopTimer()
    }
  }, [game.gameState, game.currentRound, game.currentTeam]) // Removed startTimer and stopTimer from dependencies

  useEffect(() => {
    return () => {
      stopTimer()
      clearAnimationTimeout()
    }
  }, [stopTimer, clearAnimationTimeout])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (game.gameState !== "playing" && game.gameState !== "suddenDeath") return

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      } else if (e.key.toLowerCase() === "h" && e.ctrlKey) {
        e.preventDefault()
        if (game.gameState !== "suddenDeath") {
          setGame((prev) => ({ ...prev, showHint: !prev.showHint, usedHintThisRound: true }))
        }
      } else if (e.key === " " && e.ctrlKey) {
        e.preventDefault()
        setGame((prev) => ({ ...prev, isPaused: !prev.isPaused }))
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [game.gameState, handleSubmit])

  const startGame = () => {
    setGame((prev) => ({
      ...prev,
      gameState: "playing",
      currentRound: 0,
      currentTeam: "A",
      progressA: 0,
      progressB: 0,
      scoreA: 0,
      scoreB: 0,
      hintsUsedA: 0,
      hintsUsedB: 0,
      timerSecondsRemaining: prev.settings.secondsPerQuestion,
      animationState: "none",
      teamAAttempted: false,
      teamBAttempted: false,
      bothTeamsAttempted: false,
      userAnswer: "",
      showCorrectAnswer: "",
      usedHintThisRound: false,
    }))
  }

  const resetGame = () => {
    stopTimer()
    clearAnimationTimeout()
    setGame((prev) => ({
      ...prev,
      gameState: "lobby",
      currentRound: 0,
      currentTeam: "A",
      progressA: 0,
      progressB: 0,
      scoreA: 0,
      scoreB: 0,
      hintsUsedA: 0,
      hintsUsedB: 0,
      usedHintThisRound: false,
      timerSecondsRemaining: prev.settings.secondsPerQuestion,
      isPaused: false,
      showHint: false,
      userAnswer: "",
      showCorrectAnswer: "",
      animationState: "none",
      teamAAttempted: false,
      teamBAttempted: false,
      bothTeamsAttempted: false,
    }))
  }

  if (game.gameState === "lobby") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center text-3xl animate-pulse">
                🏁
              </div>
              <h1 className="text-6xl font-bold bg-gradient-to-r from-orange-400 via-red-400 to-orange-500 bg-clip-text text-transparent">
                ʀɪᴅᴅʟᴇ ʀᴀʟʟʏ
              </h1>
            </div>
            <p className="text-xl text-gray-300 mb-2">Lets Make a Race!!</p>
            <div className="flex items-center justify-center gap-2 text-orange-400">
              <span className="text-2xl">🏎️</span>
              <span className="font-semibold">26 Rounds of Mental Racing</span>
              <span className="text-2xl">🏎️</span>
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                <h3 className="text-2xl font-bold text-orange-400 mb-4 flex items-center gap-2">
                  <span className="text-3xl">🏎️</span>
                  Team Setup
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Team A Name</label>
                    <input
                      type="text"
                      value={game.teamAName}
                      onChange={(e) => setGame((prev) => ({ ...prev, teamAName: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Enter Team A name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Team B Name</label>
                    <input
                      type="text"
                      value={game.teamBName}
                      onChange={(e) => setGame((prev) => ({ ...prev, teamBName: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Enter Team B name"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                <h3 className="text-2xl font-bold text-orange-400 mb-4 flex items-center gap-2">
                  <span className="text-3xl">⚙️</span>
                  Race Settings
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Time per Question</label>
                    <select
                      value={game.settings.secondsPerQuestion}
                      onChange={(e) =>
                        setGame((prev) => ({
                          ...prev,
                          settings: { ...prev.settings, secondsPerQuestion: Number.parseInt(e.target.value) },
                        }))
                      }
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value={30}>30 seconds</option>
                      <option value={45}>45 seconds</option>
                      <option value={60}>60 seconds</option>
                      <option value={90}>90 seconds</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Typo Tolerance</span>
                    <button
                      onClick={() =>
                        setGame((prev) => ({
                          ...prev,
                          settings: { ...prev.settings, typoTolerance: !prev.settings.typoTolerance },
                        }))
                      }
                      className={`w-12 h-6 rounded-full transition-colors ${
                        game.settings.typoTolerance ? "bg-orange-500" : "bg-gray-600"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full transition-transform ${
                          game.settings.typoTolerance ? "translate-x-6" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={startGame}
                className="px-12 py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold text-xl rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center gap-3 mx-auto"
              >
                <span className="text-2xl">🏁</span>
                START RACE
                <span className="text-2xl">🏁</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (game.gameState === "playing" || game.gameState === "suddenDeath") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
        {/* Race Track */}
        <div className="relative h-64 bg-gradient-to-b from-gray-700 to-gray-800 border-b-4 border-orange-500">
          <img
            src="/race-track-bg.png"
            alt="Race track background"
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />

          {/* Team A Track */}
          <div className="absolute top-8 left-0 right-0 h-20">
            <div className="relative h-full bg-gradient-to-r from-gray-600 to-gray-700 border-2 border-gray-500">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/30 border-dashed"></div>

              <div
                className={`absolute top-1/2 -translate-y-1/2 text-4xl transition-all duration-700 ease-out ${
                  game.animationState === "correct-fast" && game.currentTeam === "A"
                    ? "scale-105"
                    : game.animationState === "correct-slow" && game.currentTeam === "A"
                      ? "scale-100 opacity-90"
                      : game.animationState === "wrong" && game.currentTeam === "A"
                        ? "opacity-50"
                        : game.animationState === "timeout" && game.currentTeam === "A"
                          ? "opacity-60"
                          : "scale-100"
                }`}
                style={{
                  right: `calc(${Math.max(0, Math.min(95, game.progressA))}% - 20px)`,
                  transform: "translateY(-50%)",
                }}
              >
                <div className="flex items-center">
                  🏎️
                  {(game.animationState === "correct-fast" || game.animationState === "correct-slow") &&
                    game.currentTeam === "A" && (
                      <span
                        className={`ml-1 transition-opacity duration-500 ${
                          game.animationState === "correct-fast" ? "text-2xl opacity-100" : "text-xl opacity-70"
                        }`}
                      >
                        💨
                      </span>
                    )}
                </div>
              </div>

              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-2xl">🏁</div>
              <div className="absolute left-2 top-1/2 -translate-y-1/2 text-2xl">🏆</div>
              <div className="absolute right-2 bottom-1 text-xs font-bold text-yellow-400">START</div>
              <div className="absolute left-2 bottom-1 text-xs font-bold text-yellow-400">FINISH</div>
              <div className="absolute left-2 top-1 text-sm font-bold text-yellow-400">{game.teamAName}</div>
            </div>
          </div>

          {/* Team B Track */}
          <div className="absolute bottom-8 left-0 right-0 h-20">
            <div className="relative h-full bg-gradient-to-r from-gray-600 to-gray-700 border-2 border-gray-500">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/30 border-dashed"></div>

              <div
                className={`absolute top-1/2 -translate-y-1/2 text-4xl transition-all duration-700 ease-out ${
                  game.animationState === "correct-fast" && game.currentTeam === "B"
                    ? "scale-105"
                    : game.animationState === "correct-slow" && game.currentTeam === "B"
                      ? "scale-100 opacity-90"
                      : game.animationState === "wrong" && game.currentTeam === "B"
                        ? "opacity-50"
                        : game.animationState === "timeout" && game.currentTeam === "B"
                          ? "opacity-60"
                          : "scale-100"
                }`}
                style={{
                  right: `calc(${Math.max(0, Math.min(95, game.progressB))}% - 20px)`,
                  transform: "translateY(-50%)",
                }}
              >
                <div className="flex items-center">
                  🏎️
                  {(game.animationState === "correct-fast" || game.animationState === "correct-slow") &&
                    game.currentTeam === "B" && (
                      <span
                        className={`ml-1 transition-opacity duration-500 ${
                          game.animationState === "correct-fast" ? "text-2xl opacity-100" : "text-xl opacity-70"
                        }`}
                      >
                        💨
                      </span>
                    )}
                </div>
              </div>

              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-2xl">🏁</div>
              <div className="absolute left-2 top-1/2 -translate-y-1/2 text-2xl">🏆</div>
              <div className="absolute right-2 bottom-1 text-xs font-bold text-red-400">START</div>
              <div className="absolute left-2 bottom-1 text-xs font-bold text-red-400">FINISH</div>
              <div className="absolute left-2 top-1 text-sm font-bold text-red-400">{game.teamBName}</div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          {/* Game Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-orange-400">
                {game.gameState === "suddenDeath" ? "⚡ SUDDEN DEATH ⚡" : `Round ${game.currentRound + 1}/26`}
              </h2>
              <p className="text-gray-300">
                {game.gameState === "suddenDeath" ? (
                  <span className="font-bold text-red-400">🔥 First correct answer wins! 🔥</span>
                ) : (
                  <>
                    Current Turn:{" "}
                    <span className="font-bold text-orange-400">
                      {game.currentTeam === "A" ? game.teamAName : game.teamBName}
                    </span>
                  </>
                )}
              </p>
            </div>

            {/* Timer */}
            <div className="text-center">
              <div
                className={`text-4xl font-bold mb-2 ${
                  game.timerSecondsRemaining <= 10 ? "text-red-400 animate-pulse" : "text-orange-400"
                }`}
              >
                {game.timerSecondsRemaining}s
              </div>
              <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${
                    game.timerSecondsRemaining <= 10 ? "bg-red-500" : "bg-orange-500"
                  }`}
                  style={{
                    width: `${(game.timerSecondsRemaining / (game.gameState === "suddenDeath" ? 30 : game.settings.secondsPerQuestion)) * 100}%`,
                  }}
                />
              </div>
            </div>

            {game.gameState !== "suddenDeath" && (
              <div className="text-right">
                <div className="text-sm text-gray-400 mb-1">Attempts</div>
                <div className="flex gap-2">
                  <span className={`px-2 py-1 rounded text-xs ${game.teamAAttempted ? "bg-red-600" : "bg-gray-600"}`}>
                    {game.teamAName}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs ${game.teamBAttempted ? "bg-red-600" : "bg-gray-600"}`}>
                    {game.teamBName}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Question Section */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8 mb-6">
              <h3 className="text-2xl font-bold text-orange-400 mb-4">🧩 {currentRiddle?.question}</h3>

              {game.showHint && (
                <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-4 mb-4">
                  <p className="text-blue-300">
                    💡 <strong>Hint:</strong> {currentRiddle?.hint}
                  </p>
                </div>
              )}

              {game.gameState === "suddenDeath" && (
                <div className="bg-red-900/30 border border-red-600 rounded-lg p-4 mb-4">
                  <p className="text-red-300 text-center font-bold">
                    ⚡ SUDDEN DEATH: No hints available! First team to answer correctly wins the entire race! ⚡
                  </p>
                </div>
              )}

              <div className="flex gap-4 mb-4">
                <input
                  ref={inputRef}
                  type="text"
                  value={game.userAnswer}
                  onChange={(e) => setGame((prev) => ({ ...prev, userAnswer: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSubmit()
                    }
                  }}
                  className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg"
                  placeholder="Enter your answer..."
                  disabled={game.isPaused}
                />
                <button
                  onClick={handleSubmit}
                  disabled={!game.userAnswer.trim() || game.isPaused}
                  className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-lg transition-all duration-200"
                >
                  Submit
                </button>
              </div>

              {game.gameState !== "suddenDeath" && (
                <button
                  onClick={showHint}
                  disabled={game.showHint || game.usedHintThisRound || game.isPaused}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors duration-200"
                >
                  💡 Show Hint (Reduces Speed)
                </button>
              )}

              {game.showCorrectAnswer && (
                <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                  <p className="text-lg font-semibold">{game.showCorrectAnswer}</p>
                </div>
              )}
            </div>

            {/* Scoreboard */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                <h4 className="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-2">🏎️ {game.teamAName}</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Progress:</span>
                    <span className="font-bold">{game.progressA}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Correct Answers:</span>
                    <span className="font-bold">{game.scoreA}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Hints Used:</span>
                    <span className="font-bold">{game.hintsUsedA}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                <h4 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">🏎️ {game.teamBName}</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Progress:</span>
                    <span className="font-bold">{game.progressB}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Correct Answers:</span>
                    <span className="font-bold">{game.scoreB}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Hints Used:</span>
                    <span className="font-bold">{game.hintsUsedB}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (game.gameState === "results") {
    const winner = game.progressA > game.progressB ? "A" : game.progressB > game.progressA ? "B" : "tie"
    const winnerName = winner === "A" ? game.teamAName : winner === "B" ? game.teamBName : "It's a tie!"

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white flex items-center justify-center">
        <div className="text-center max-w-2xl mx-auto px-4">
          <div className="mb-8">
            <div className="text-8xl mb-4">🏆</div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-400 via-red-400 to-orange-500 bg-clip-text text-transparent mb-4">
              RACE COMPLETE!
            </h1>
            {winner !== "tie" ? (
              <p className="text-3xl font-bold text-orange-400">🎉 {winnerName} Wins! 🎉</p>
            ) : (
              <p className="text-3xl font-bold text-orange-400">🤝 Perfect Tie! 🤝</p>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
              <h3 className="text-2xl font-bold text-yellow-400 mb-4">{game.teamAName}</h3>
              <div className="space-y-2 text-lg">
                <div>
                  Progress: <span className="font-bold">{game.progressA}%</span>
                </div>
                <div>
                  Correct: <span className="font-bold">{game.scoreA}/26</span>
                </div>
                <div>
                  Hints: <span className="font-bold">{game.hintsUsedA}</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
              <h3 className="text-2xl font-bold text-red-400 mb-4">{game.teamBName}</h3>
              <div className="space-y-2 text-lg">
                <div>
                  Progress: <span className="font-bold">{game.progressB}%</span>
                </div>
                <div>
                  Correct: <span className="font-bold">{game.scoreB}/26</span>
                </div>
                <div>
                  Hints: <span className="font-bold">{game.hintsUsedB}</span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={resetGame}
            className="px-12 py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold text-xl rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            🏁 Race Again
          </button>
        </div>
      </div>
    )
  }

  return null
}
