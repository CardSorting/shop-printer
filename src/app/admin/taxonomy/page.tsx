/**
 * [LAYER: INFRASTRUCTURE]
 */
import { AdminTaxonomy } from '@ui/pages/admin/AdminTaxonomy';

export const metadata = {
  title: 'Product Organization · MeowAcc Admin',
  description: 'Manage categories and product types.',
};

export default function TaxonomyPage() {
  return <AdminTaxonomy />;
}
