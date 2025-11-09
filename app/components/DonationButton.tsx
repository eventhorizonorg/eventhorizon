'use client'

import { useState } from 'react'
import Image from 'next/image'

export default function DonationButton() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [customAmount, setCustomAmount] = useState('5')
  const [isLoading, setIsLoading] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const handleCustomAmount = async () => {
    const amount = parseFloat(customAmount)
    
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/donations/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100) // Convert to cents
        })
      })

      const data = await response.json()
      
      if (data.status === 'success' && data.url) {
        window.location.href = data.url
      } else {
        alert(data.message || 'Failed to create checkout session')
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Error creating checkout:', error)
      alert('An error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (!isModalOpen) {
        setIsModalOpen(true)
      }
    }
    if (event.key === 'Escape' && isModalOpen) {
      setIsModalOpen(false)
    }
  }

  const handleModalKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsModalOpen(false)
    }
  }

  return (
    <>
      {/* Floating Coffee Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed bottom-4 right-4 z-50 w-10 h-10 transition-all duration-300 flex items-center justify-center group hover:scale-110 ${isHovered ? 'animate-shake-hover' : ''}`}
        aria-label="Support Event Horizon with a donation"
        tabIndex={0}
      >
        <Image
          src="/coffee-icon.png"
          alt=""
          width={20}
          height={20}
          className="brightness-0 invert opacity-50 group-hover:opacity-100 transition-all duration-300"
          style={{ filter: 'brightness(0) invert(1)' }}
          aria-hidden="true"
        />
      </button>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          onClick={() => setIsModalOpen(false)}
          onKeyDown={handleModalKeyDown}
          role="dialog"
          aria-modal="true"
          aria-labelledby="donation-modal-title"
        >
          <div
            className="fixed bottom-16 right-4 z-50 bg-black/95 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: 'modalSlideUp 0.3s ease-out',
              transformOrigin: 'bottom right'
            }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <h2
                id="donation-modal-title"
                className="text-2xl font-bold text-white flex items-center gap-2"
              >
                <span>☕</span>
                Donate a Coffee!
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setIsModalOpen(false)
                  }
                }}
                className="text-white/60 hover:text-white transition-colors p-1"
                aria-label="Close donation modal"
                tabIndex={0}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Message */}
            <div className="mb-6">
              <p className="text-white/80 text-sm leading-relaxed mb-3">
                Hello, my name is Daniel and this was a project that first started off as a hackathon project which now acts as an informative page for news and interests.
              </p>
              <p className="text-white/80 text-sm leading-relaxed mb-3">
                For now, I am currently working with a list of geopolitical Telegram channels. However, if you would like me to add more channels for this project to watch and plot on the map, feel free to{' '}
                <a
                  href="mailto:danielsunyuan@gmail.com"
                  className="text-amber-400 hover:text-amber-300 underline transition-colors"
                >
                  email me
                </a>
                .
              </p>
              <p className="text-white/80 text-sm leading-relaxed">
                If you find it useful or interesting, feel free to buy me a coffee to support the project.
              </p>
            </div>

            {/* Custom Amount */}
            <div className="mb-6">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleCustomAmount()
                      }
                    }}
                    placeholder="5.00"
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    tabIndex={0}
                  />
                </div>
                <button
                  onClick={handleCustomAmount}
                  disabled={isLoading || !customAmount || parseFloat(customAmount) <= 0}
                  className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-medium px-6 py-3 rounded-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  tabIndex={0}
                >
                  {isLoading ? 'Processing...' : 'Donate'}
                </button>
              </div>
            </div>

            {/* Footer with GitHub Link */}
            <div className="flex flex-col items-center gap-2">
              <a
                href="https://github.com/danielsunyuan"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-white text-sm transition-colors flex items-center gap-1"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub
              </a>
              <p className="text-white/50 text-xs text-center">
                Secure payment powered by Stripe
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

