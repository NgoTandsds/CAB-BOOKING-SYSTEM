import './globals.css';

export const metadata = {
  title: 'CAB Booking System',
  description: 'Microservices-based cab booking platform — Customer | Driver | Admin',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
