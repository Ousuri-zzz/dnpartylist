import { Metadata } from 'next';
import ClientPage from '@/components/ClientPage';

export const metadata: Metadata = {
  title: 'หน้าแรก | DNPartyList',
};

export default function Home() {
  return <ClientPage />;
} 