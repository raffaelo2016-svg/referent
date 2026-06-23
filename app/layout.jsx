import "./globals.css";

export const metadata = {
  title: "Referent",
  description: "Minimal Next.js application",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
