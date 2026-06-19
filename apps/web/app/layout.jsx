import "./globals.css";
import { AuthProvider } from "../components/AuthProvider";

export const metadata = {
  title: "SIPADI",
  description: "Sistem Pengarsipan dan Disposisi Inspektorat"
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
