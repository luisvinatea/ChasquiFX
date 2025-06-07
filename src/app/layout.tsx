import { Inter } from "next/font/google";
import "../index.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "ChasquiFX",
  description: "Travel recommendations based on forex rates and flight data",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} min-h-screen bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
