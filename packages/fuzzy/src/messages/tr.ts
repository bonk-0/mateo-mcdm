import type { FuzzyMessageKey } from './en';

/** Turkish texts for the keys this package emits (ICU message format). */
export const tr: Readonly<Record<FuzzyMessageKey, string>> = {
  'validation.tfn.invalid-value':
    'Bu geçerli bir üçgen bulanık sayı değil. Üç sayı gerekir: l, m ve u.',
  'validation.tfn.invalid-order':
    'Üçgen bulanık sayıda l ≤ m ≤ u olmalıdır; bu sayı ({l, number}, {m, number}, {u, number}).',
  'validation.tfn.negative-value':
    'Alt değer {l, number}; bu yöntem negatif bulanık sayıları kabul etmez.',
  'validation.tfn.non-positive-value':
    'Alt değer {l, number}; bu yöntem sıfırdan büyük bulanık sayılar gerektirir.',

  'validation.scale.too-few-terms':
    'Bir dilsel ölçekte en az 2 terim olmalıdır; bu ölçekte {count, number} terim var.',
  'validation.scale.invalid-term':
    '{position, number}. terim için kimlik, etiket ve kısaltma gereklidir.',
  'validation.scale.duplicate-term':
    '"{term}" birden fazla terimde kullanılmış. Kimlikler ve kısaltmalar ölçek içinde benzersiz olmalıdır.',
  'validation.scale.not-monotonic':
    '"{term}" terimi "{previous}" teriminden yüksek değil. Terimler en düşükten en yükseğe doğru sıralanmalıdır.',
  'validation.scale.unknown-term': '"{term}", "{scale}" ölçeğinin bir terimi değil.',

  'scales.five-level.name': '5 düzeyli ölçek',
  'scales.five-level.terms.very-low': 'Çok düşük',
  'scales.five-level.terms.low': 'Düşük',
  'scales.five-level.terms.medium': 'Orta',
  'scales.five-level.terms.high': 'Yüksek',
  'scales.five-level.terms.very-high': 'Çok yüksek',

  'scales.seven-level.name': '7 düzeyli ölçek',
  'scales.seven-level.terms.very-low': 'Çok düşük',
  'scales.seven-level.terms.low': 'Düşük',
  'scales.seven-level.terms.medium-low': 'Orta düşük',
  'scales.seven-level.terms.medium': 'Orta',
  'scales.seven-level.terms.medium-high': 'Orta yüksek',
  'scales.seven-level.terms.high': 'Yüksek',
  'scales.seven-level.terms.very-high': 'Çok yüksek',

  'scales.fuzzy-marcos.name': 'Bulanık MARCOS ölçeği (Stanković vd. 2020)',
  'scales.fuzzy-marcos.terms.extremely-poor': 'Aşırı kötü',
  'scales.fuzzy-marcos.terms.very-poor': 'Çok kötü',
  'scales.fuzzy-marcos.terms.poor': 'Kötü',
  'scales.fuzzy-marcos.terms.medium-poor': 'Orta kötü',
  'scales.fuzzy-marcos.terms.medium': 'Orta',
  'scales.fuzzy-marcos.terms.medium-good': 'Orta iyi',
  'scales.fuzzy-marcos.terms.good': 'İyi',
  'scales.fuzzy-marcos.terms.very-good': 'Çok iyi',
  'scales.fuzzy-marcos.terms.extremely-good': 'Aşırı iyi',

  'scales.imf-swara.name': 'IMF SWARA ölçeği (Vrtagić vd. 2021)',
  'scales.imf-swara.terms.equally-significant': 'Eşit derecede önemli',
  'scales.imf-swara.terms.weakly-less-significant': 'Zayıf derecede daha az önemli',
  'scales.imf-swara.terms.moderately-less-significant': 'Orta derecede daha az önemli',
  'scales.imf-swara.terms.less-significant': 'Daha az önemli',
  'scales.imf-swara.terms.really-less-significant': 'Gerçekten daha az önemli',
  'scales.imf-swara.terms.much-less-significant': 'Çok daha az önemli',
  'scales.imf-swara.terms.dominantly-less-significant': 'Baskın derecede daha az önemli',
  'scales.imf-swara.terms.absolutely-less-significant': 'Kesinlikle daha az önemli',
};
