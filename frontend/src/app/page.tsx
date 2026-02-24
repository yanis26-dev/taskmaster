import { redirect } from 'next/navigation';

// Root page: redirect to today view
export default function Home() {
  redirect('/today');
}
