import { Logo } from "@/components/ui/logo";
import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex justify-center md:justify-start">
            <Link href="/" className="text-dark font-heading font-bold text-xl flex items-center">
              <Logo className="h-6 w-6 mr-2 text-primary" />
              Smart Canteen
            </Link>
          </div>
          <div className="mt-6 md:mt-0">
            <p className="text-center md:text-right text-gray-500 text-sm">
              &copy; {new Date().getFullYear()} Smart Canteen. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
