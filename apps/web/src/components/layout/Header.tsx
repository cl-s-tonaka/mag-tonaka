import { Bot } from 'lucide-react'
import { Link } from 'react-router-dom'

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link to="/" className="flex items-center space-x-2">
          <Bot className="h-6 w-6" />
          <span className="font-bold">Dynamic Agents</span>
        </Link>
        <div className="flex flex-1 items-center justify-end space-x-4">
          {/* Future: Add user menu, notifications, etc. */}
        </div>
      </div>
    </header>
  )
}
