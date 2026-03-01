import { ReactNode } from 'react';

type Props = {
    children: ReactNode;
};

// Since we have a `process.env.NEXT_PUBLIC_API_URL` we want to make sure
// it's available in the client.

export default function RootLayout({ children }: Props) {
    return children;
}
