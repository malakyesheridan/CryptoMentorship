import { redirect } from 'next/navigation'

export default function HomePage() {
  // Redirect to login page where users can sign up
  redirect('/login')
}
