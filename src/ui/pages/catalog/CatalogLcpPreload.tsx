type CatalogLcpPreloadProps = {
  /** Pre-selected by prepareCatalogPage — routes must not slice locally. */
  imageUrls: string[];
};

/** Renders server-prepared LCP preload links (first visible product only). */
export function CatalogLcpPreload({ imageUrls }: CatalogLcpPreloadProps) {
  return (
    <>
      {imageUrls.map((url) => (
        <link key={url} rel="preload" as="image" href={url} />
      ))}
    </>
  );
}
