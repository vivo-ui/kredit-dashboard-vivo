import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ 
  subsets: ["latin"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "vivo Flores | Secure Architectural Ledger",
  description: "Institutional Asset Management and Credit Portfolio Ledger",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined"
          rel="stylesheet"
        />
      </head>
      <body className={`${manrope.variable} font-manrope antialiased bg-[#0c1321] text-[#dce2f6]`}>
        {children}
      </body>
    </html>
  );
}
