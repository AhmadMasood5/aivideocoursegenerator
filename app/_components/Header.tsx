"use client";
import { Button } from "@/components/ui/button";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";

const Header = () => {
  const { user } = useUser();

  return (
    <header className="w-full bg-white shadow-sm">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between p-4 gap-4">
        
        {/* Logo */}
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">
            <span className="text-primary">Know</span>Mada
          </h2>
        </div>

        {/* Nav links */}
        <ul className="flex flex-col sm:flex-row gap-4 sm:gap-8 items-center">
          <Link href={"/"}>
            <li className="text-base sm:text-lg hover:text-primary font-medium cursor-pointer">
              Home
            </li>
          </Link>
          <Link href={"/pricing"}>
            <li className="text-base sm:text-lg hover:text-primary font-medium cursor-pointer">
              Pricing
            </li>
          </Link>
        </ul>

        {/* Auth buttons */}
        <div className="w-full sm:w-auto flex justify-center sm:justify-end">
          {user ? (
            <UserButton />
          ) : (
            <SignInButton mode="modal">
              <Button className="w-full sm:w-auto">Get Started</Button>
            </SignInButton>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
