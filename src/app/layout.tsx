import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
    title: 'Petty Cash Management System',
    description: 'Enterprise procurement management for textile manufacturing',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className="scrollbar-thin">
                {children}
                <Toaster
                    position="bottom-right"
                    toastOptions={{
                        duration: 3000,
                        style: {
                            fontSize: '13px',
                            borderRadius: '4px',
                        },
                    }}
                />
            </body>
        </html>
    );
}
