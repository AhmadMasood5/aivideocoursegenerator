"use client";
import { Button } from "@/components/ui/button";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";

const Header = () => {
  const { user } = useUser();
  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex gap-2 items-center">
        
        <h2 className="text-lg font-bold">
          <span className="text-primary">Know</span>Mada
        </h2>
      </div>
      <ul className="flex gap-8 items-center">
        <li className="text-lg hover:text-primary font-medium cursor-pointer">
          Home
        </li>
        <Link href={"/pricing"}>
          <li className="text-lg hover:text-primary font-medium cursor-pointer">
            Pricing
          </li>
        </Link>
      </ul>

      {user ? (
        <UserButton />
      ) : (
        <SignInButton mode="modal">
          <Button>Get Started</Button>
        </SignInButton>
      )}
    </div>
  );
};

export default Header;
