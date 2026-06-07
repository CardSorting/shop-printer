import { redirect } from 'next/navigation';

/** Legacy catalog URL — menu browsing lives on collection pages. */
export default function ProductsCatalogPage() {
  redirect('/collections/bestsellers');
}
