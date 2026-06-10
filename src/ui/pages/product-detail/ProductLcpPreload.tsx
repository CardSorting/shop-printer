type ProductLcpPreloadProps = {
  /** Pre-selected by prepareProductDetailPage — routes must not slice locally. */
  imageUrls: string[];
};

/** Renders server-prepared LCP preload links (primary product image only). */
export function ProductLcpPreload({ imageUrls }: ProductLcpPreloadProps) {
  return (
    <>
      {imageUrls.map((url) => (
        <link key={url} rel="preload" as="image" href={url} />
      ))}
    </>
  );
}
