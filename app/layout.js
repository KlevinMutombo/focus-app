import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";
import ThemeToggle from "./components/ThemeToggle";
import NotificationBell from "./components/NotificationBell";
import Logo from "./components/Logo";
import LogoutButton from "./components/LogoutButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Momenta",
  description: "Build momentum. Focus sessions, XP, streaks, and a planner that keeps up with your week.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <Logo />
          <LogoutButton />
          {children}
          <NotificationBell />
          <ThemeToggle />
        </ThemeProvider>
      </body>
    </html>
  );
}