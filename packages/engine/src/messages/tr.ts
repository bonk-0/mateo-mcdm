import type { EngineMessageKey } from './en';

/** Turkish texts for the keys the engine itself emits (ICU message format). */
export const tr: Readonly<Record<EngineMessageKey, string>> = {
  'trace.axis.weight': 'Ağırlık',

  'validation.input.malformed': '{input} girdisi eksik veya beklenen yapıda değil.',

  'validation.matrix.no-alternatives': 'Karar matrisinde hiç alternatif yok.',
  'validation.matrix.no-criteria': 'Karar matrisinde hiç kriter yok.',
  'validation.matrix.too-few-alternatives':
    'Bu yöntem en az {min, number} alternatif gerektirir; matriste {count, number} alternatif var.',
  'validation.matrix.too-few-criteria':
    'Bu yöntem en az {min, number} kriter gerektirir; matriste {count, number} kriter var.',
  'validation.matrix.row-count-mismatch':
    'Matriste {alternatives, number} alternatif için {rows, number} değer satırı var.',
  'validation.matrix.column-count-mismatch':
    'Bu satırda {criteria, number} kriter için {cells, number} değer var.',
  'validation.matrix.duplicate-alternative':
    '"{id}" alternatif kimliği birden fazla kez kullanılmış.',
  'validation.matrix.duplicate-criterion': '"{id}" kriter kimliği birden fazla kez kullanılmış.',
  'validation.matrix.invalid-direction':
    '"{id}" kriteri fayda veya maliyet olarak işaretlenmelidir.',
  'validation.matrix.unsupported-number-type':
    '"{id}" kriteri, bu yöntemin desteklemediği "{numberType}" sayı türünü kullanıyor.',
  'validation.matrix.missing-value':
    'Bu hücre boş. Eksik değerler hiçbir zaman otomatik doldurulmaz.',
  'validation.matrix.invalid-value': 'Bu hücre geçerli bir sayı içermiyor.',
  'validation.matrix.negative-value':
    'Bu hücrede {value, number} var; bu yöntem negatif değer kabul etmez.',
  'validation.matrix.non-positive-value':
    'Bu hücrede {value, number} var; bu yöntem sıfırdan büyük değerler gerektirir.',
  'validation.matrix.constant-criterion':
    '"{id}" kriterinde tüm alternatifler aynı değere sahip; bu kriter alternatifleri ayırt edemez.',

  'validation.weights.empty': 'Hiç kriter ağırlığı verilmemiş.',
  'validation.weights.missing': '"{id}" kriterinin ağırlığı yok.',
  'validation.weights.unknown-criterion':
    'Bu modelin kriteri olmayan "{id}" için ağırlık verilmiş.',
  'validation.weights.duplicate': '"{id}" kriteri için birden fazla ağırlık verilmiş.',
  'validation.weights.invalid-value': '"{id}" kriterinin ağırlığı geçerli bir sayı değil.',
  'validation.weights.negative':
    '"{id}" kriterinin ağırlığı {value, number}; ağırlıklar negatif olamaz.',
  'validation.weights.zero-sum': 'Tüm ağırlıklar sıfır.',
  'validation.weights.not-normalized': 'Ağırlıkların toplamı 1 değil, {sum, number}.',

  'validation.parameter.unknown': 'Bu yöntemin "{name}" adında bir parametresi yok.',
  'validation.parameter.invalid-type': '"{name}" parametresinin değeri yanlış türde.',
  'validation.parameter.out-of-range':
    '"{name}" parametresinin {value, number} değeri izin verilen aralığın dışında.',
  'validation.parameter.not-integer':
    '"{name}" parametresi tam sayı olmalıdır; {value, number} tam sayı değil.',
  'validation.parameter.invalid-option':
    '"{value}", "{name}" parametresi için geçerli bir seçenek değil.',

  'validation.solver.unavailable':
    'Bu yöntem optimizasyon çözücüsüne ihtiyaç duyuyor, ancak çözücü yüklenemedi.',
  'validation.solver.failed':
    'Optimizasyon çözücüsü ({solver}) bu modeli çözemedi (durum: {status}). Girdi değerlerini kontrol edip tekrar deneyin.',
};
