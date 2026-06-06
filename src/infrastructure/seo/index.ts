/**
 * [LAYER: INFRASTRUCTURE — SEO]
 * Application-facing SEO bootstrap — wires config into the core engine.
 */

import { getSeoEngine } from '@core/seo/SeoEngine';
import { getSeoConfig } from './SeoConfig';

export function getAppSeoEngine() {
  return getSeoEngine(getSeoConfig());
}

export { getSeoConfig, createSeoConfigFromEnv, resetSeoConfigForTests } from './SeoConfig';
export { buildNextPageMetadata, buildRootLayoutMetadata, toNextMetadata } from './NextMetadataAdapter';
