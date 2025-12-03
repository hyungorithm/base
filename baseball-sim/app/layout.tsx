import "./globals.css";
import { AuthProvider } from "./providers/AuthProvider";
import Navbar from "./components/Navbar"; // 경로 확인

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <AuthProvider>
          <Navbar />
          <main className="max-w-6xl mx-auto mt-6 px-4">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}