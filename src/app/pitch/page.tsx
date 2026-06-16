// /pitch ora vive sulla home (/). Redirect permanente per vecchi link/bookmark.
import { redirect } from 'next/navigation';

export default function PitchRedirect() {
  redirect('/');
}
