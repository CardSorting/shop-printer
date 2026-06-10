'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { Product, ProductVariant } from '@domain/models';

function optionParamName(optionName: string, index: number): string {
  return optionName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `option-${index + 1}`;
}

export function useProductSelection(product: Product | null) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  useEffect(() => {
    if (product?.hasVariants && product.options) {
      const initial: Record<string, string> = {};
      product.options.forEach((opt, index) => {
        const requestedValue = searchParams.get(optionParamName(opt.name, index));
        initial[opt.name] = requestedValue && opt.values.includes(requestedValue) ? requestedValue : opt.values[0];
      });
      setSelectedOptions(initial);
    }
  }, [product, searchParams]);

  const selectedVariant = useMemo((): ProductVariant | null => {
    if (!product?.hasVariants || !product.variants) return null;
    return (
      product.variants.find((v) => {
        const match1 = v.option1 === selectedOptions[product.options![0]?.name];
        const match2 = !product.options![1] || v.option2 === selectedOptions[product.options![1].name];
        const match3 = !product.options![2] || v.option3 === selectedOptions[product.options![2].name];
        return match1 && match2 && match3;
      }) ?? null
    );
  }, [product, selectedOptions]);

  function selectOption(optionName: string, value: string) {
    setSelectedOptions((prev) => {
      const next = { ...prev, [optionName]: value };
      if (product?.options) {
        const params = new URLSearchParams(searchParams.toString());
        product.options.forEach((option, index) => {
          const selectedValue = next[option.name];
          if (selectedValue) params.set(optionParamName(option.name, index), selectedValue);
        });
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      }
      return next;
    });
  }

  return {
    quantity,
    setQuantity,
    selectedOptions,
    selectedVariant,
    selectOption,
  };
}
