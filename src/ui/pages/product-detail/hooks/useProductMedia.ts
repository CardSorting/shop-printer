'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Product, ProductVariant } from '@domain/models';
import { sanitizeImageUrl } from '@utils/imageSanitizer';

export function useProductMedia(product: Product | null, selectedVariant: ProductVariant | null) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [product?.id]);

  const allImages = useMemo(() => {
    if (!product) return [];

    const images: { url: string; alt: string }[] = [];
    const addImage = (url: string | undefined | null, alt: string) => {
      const sanitized = sanitizeImageUrl(url, '');
      if (sanitized) images.push({ url: sanitized, alt });
    };

    addImage(product.imageUrl, product.name);

    if (product.media) {
      product.media.forEach((m) => {
        if (m.url !== product.imageUrl) {
          addImage(m.url, m.altText || product.name);
        }
      });
    }

    if (selectedVariant?.imageUrl) {
      const sanitizedVariantUrl = sanitizeImageUrl(selectedVariant.imageUrl, '');
      if (sanitizedVariantUrl) {
        const exists = images.find((i) => i.url === sanitizedVariantUrl);
        if (!exists) {
          images.unshift({ url: sanitizedVariantUrl, alt: selectedVariant.title || product.name });
        }
      }
    }

    const seen = new Set<string>();
    const uniqueImages = images.filter((img) => {
      if (seen.has(img.url)) return false;
      seen.add(img.url);
      return true;
    });

    return uniqueImages.length > 0
      ? uniqueImages
      : [{ url: sanitizeImageUrl(null), alt: 'No image' }];
  }, [product, selectedVariant]);

  const currentImage = allImages[selectedImageIndex]?.url || allImages[0]?.url;

  return {
    allImages,
    selectedImageIndex,
    setSelectedImageIndex,
    currentImage,
  };
}
