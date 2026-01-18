"use client";
import { Button } from "@/components/ui/button";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Menu } from "lucide-react";
import { useState } from "react";

const Header = () => {
  const { user } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="w-full border-b bg-white">
      <div className="flex items-center justify-between p-4 max-w-7xl mx-auto">
        {/* Logo */}
        <h2 className="text-lg sm:text-xl font-bold">
          <span className="text-primary">Know</span>Mada
        </h2>

        {/* Desktop Nav */}
        <ul className="hidden md:flex gap-8 items-center">
          <li className="text-base hover:text-primary font-medium cursor-pointer">
            <Link href="/">Home</Link>
          </li>
          <li className="text-base hover:text-primary font-medium cursor-pointer">
            <Link href="/pricing">Pricing</Link>
          </li>
        </ul>

        {/* Auth Buttons */}
        <div className="hidden md:block">
          {user ? (
            <UserButton />
          ) : (
            <SignInButton mode="modal">
              <Button>Get Started</Button>
            </SignInButton>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 rounded hover:bg-gray-100"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Mobile Nav */}
      {menuOpen && (
        <div className="md:hidden px-4 pb-4 space-y-3">
          <Link
            href="/"
            className="block text-base font-medium hover:text-primary"
            onClick={() => setMenuOpen(false)}
          >
            Home
          </Link>
          <Link
            href="/pricing"
            className="block text-base font-medium hover:text-primary"
            onClick={() => setMenuOpen(false)}
          >
            Pricing
          </Link>
          {user ? (
            <UserButton />
          ) : (
            <SignInButton mode="modal">
              <Button className="w-full">Get Started</Button>
            </SignInButton>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
