import type { MethodsMessageKey } from './en';

/** Turkish texts for the keys the methods of this package emit (ICU message format). */
export const tr: Readonly<Record<MethodsMessageKey, string>> = {
  'methods.common.forBenefitCriteria': 'fayda kriterleri için',
  'methods.common.forCostCriteria': 'maliyet kriterleri için',

  // ------------------------------------------------------------ MARCOS
  'methods.marcos.name': 'MARCOS',
  'methods.marcos.rows.antiIdeal': 'Negatif ideal çözüm (AAI)',
  'methods.marcos.rows.ideal': 'İdeal çözüm (AI)',
  'methods.marcos.columns.S': 'Toplam S_i',
  'methods.marcos.columns.kMinus': 'Fayda derecesi K⁻',
  'methods.marcos.columns.kPlus': 'Fayda derecesi K⁺',
  'methods.marcos.columns.fKMinus': 'Fayda fonksiyonu f(K⁻)',
  'methods.marcos.columns.fKPlus': 'Fayda fonksiyonu f(K⁺)',
  'methods.marcos.columns.fK': 'Nihai fayda f(K)',
  'methods.marcos.columns.rank': 'Sıra',
  'methods.marcos.parameters.normalizeWeights.label': 'Ağırlıkları normalize et',
  'methods.marcos.parameters.normalizeWeights.description':
    'Her ağırlığı kullanmadan önce ağırlıkların toplamına böl. Yalnızca ağırlıklı matris ve toplamlar değişir; fayda dereceleri, fayda fonksiyonları ve sıralama aynı kalır.',
  'methods.marcos.steps.initial-matrix.name': 'Başlangıç karar matrisi',
  'methods.marcos.steps.initial-matrix.explanation':
    'Her alternatifin her kriterdeki performansı, girildiği gibi.',
  'methods.marcos.steps.weights.name': 'Kriter ağırlıkları',
  'methods.marcos.steps.weights.explanation': 'Her kriterin önemi, girildiği gibi.',
  'methods.marcos.steps.normalized-weights.name': 'Normalize ağırlıklar',
  'methods.marcos.steps.normalized-weights.explanation':
    'Ağırlıkların toplamı 1 olsun diye her ağırlık tüm ağırlıkların toplamına bölünür.',
  'methods.marcos.steps.extended-matrix.name': 'Genişletilmiş matris',
  'methods.marcos.steps.extended-matrix.explanation':
    'Negatif ideal çözüm (her kriterin en kötü değeri) ilk satır, ideal çözüm (en iyi değer) son satır olarak eklenir. Fayda kriterinde en iyi değer en büyük, maliyet kriterinde en küçük değerdir.',
  'methods.marcos.steps.normalized-matrix.name': 'Normalize matris',
  'methods.marcos.steps.normalized-matrix.explanation':
    'Her değer ideal çözümle karşılaştırılır: fayda kriterlerinde ideale bölünür, maliyet kriterlerinde ideal bu değere bölünür. İdeal satır her yerde 1 olur.',
  'methods.marcos.steps.weighted-matrix.name': 'Ağırlıklı normalize matris',
  'methods.marcos.steps.weighted-matrix.explanation':
    'Her normalize değer kendi kriterinin ağırlığıyla çarpılır.',
  'methods.marcos.steps.sums.name': 'Toplamlar S_i',
  'methods.marcos.steps.sums.explanation':
    'Negatif ideal ve ideal satırlar dahil, ağırlıklı matrisin her satırının toplamı.',
  'methods.marcos.steps.utility-degrees.name': 'Fayda dereceleri',
  'methods.marcos.steps.utility-degrees.explanation':
    'K⁻ her alternatifi negatif ideal çözümle, K⁺ ideal çözümle karşılaştırır: alternatifin toplamı onlarınkine bölünür.',
  'methods.marcos.steps.utility-functions.name': 'Fayda fonksiyonları',
  'methods.marcos.steps.utility-functions.explanation':
    'f(K⁻) negatif ideal çözüme göre, f(K⁺) ideal çözüme göre faydadır. Formüllerdeki çaprazlamaya dikkat edin: f(K⁻) payında K⁺ bulunur. K⁻ ve K⁺ ikisi de S_i ile orantılı olduğundan bu iki değer her alternatif için aynıdır.',
  'methods.marcos.steps.final-utility.name': 'Nihai fayda f(K_i)',
  'methods.marcos.steps.final-utility.explanation':
    'İki fayda derecesi ile iki fayda fonksiyonunun uzlaşık değeri. Yüksek değer daha iyidir.',
  'methods.marcos.steps.ranking.name': 'Sıralama',
  'methods.marcos.steps.ranking.explanation':
    'Alternatifler nihai faydaya göre, en yüksekten başlayarak sıralanır. Eşit değerler aynı sırayı paylaşır.',

  // ------------------------------------------------------------ Fuzzy MARCOS
  'methods.fuzzyMarcos.name': 'Fuzzy MARCOS',
  'methods.fuzzyMarcos.rows.antiIdeal': 'Negatif ideal çözüm (AAI)',
  'methods.fuzzyMarcos.rows.ideal': 'İdeal çözüm (ID)',
  'methods.fuzzyMarcos.columns.S': 'Toplam S̃_i',
  'methods.fuzzyMarcos.columns.kMinus': 'Fayda derecesi K⁻',
  'methods.fuzzyMarcos.columns.kPlus': 'Fayda derecesi K⁺',
  'methods.fuzzyMarcos.columns.T': 'T̃_i = K̃⁻ ⊕ K̃⁺',
  'methods.fuzzyMarcos.columns.fKMinus': 'Fayda fonksiyonu f(K⁻)',
  'methods.fuzzyMarcos.columns.fKPlus': 'Fayda fonksiyonu f(K⁺)',
  'methods.fuzzyMarcos.columns.fK': 'Nihai fayda f(K)',
  'methods.fuzzyMarcos.columns.rank': 'Sıra',
  'methods.fuzzyMarcos.parameters.defuzzification.label': 'Durulaştırma',
  'methods.fuzzyMarcos.parameters.defuzzification.description':
    'Nihai fayda hesaplanmadan önce bulanık fayda derecelerinin ve fayda fonksiyonlarının kesin sayıya nasıl çevrileceği. Kaynak makale formülü adlandırmaz; derecelendirilmiş ortalama makalenin sonuçlarını verir. df_crisp, makalede yazdığı gibi her zaman derecelendirilmiş ortalamayı kullanır.',
  'methods.fuzzyMarcos.parameters.defuzzification.gradedMean':
    'Derecelendirilmiş ortalama (l + 4m + u) / 6',
  'methods.fuzzyMarcos.parameters.defuzzification.centroid': 'Ağırlık merkezi (l + m + u) / 3',
  'methods.fuzzyMarcos.parameters.normalizeWeights.label': 'Ağırlıkları normalize et',
  'methods.fuzzyMarcos.parameters.normalizeWeights.description':
    'Her kesin ağırlığı kullanmadan önce ağırlıkların toplamına böl. Yalnızca kesin ağırlıklarda kullanılabilir; sıralama değişmez.',
  'methods.fuzzyMarcos.steps.initial-matrix.name': 'Başlangıç bulanık karar matrisi',
  'methods.fuzzyMarcos.steps.initial-matrix.explanation':
    'Her alternatifin her kriterdeki performansı, üçgen bulanık sayı (l, m, u) olarak.',
  'methods.fuzzyMarcos.steps.weights.name': 'Kriter ağırlıkları',
  'methods.fuzzyMarcos.steps.weights.explanation':
    'Her kriterin önemi, girildiği gibi: üçgen bulanık sayı ya da kesin sayı.',
  'methods.fuzzyMarcos.steps.normalized-weights.name': 'Normalize ağırlıklar',
  'methods.fuzzyMarcos.steps.normalized-weights.explanation':
    'Ağırlıkların toplamı 1 olsun diye her ağırlık tüm ağırlıkların toplamına bölünür.',
  'methods.fuzzyMarcos.steps.extended-matrix.name': 'Genişletilmiş bulanık matris',
  'methods.fuzzyMarcos.steps.extended-matrix.explanation':
    'Negatif ideal çözüm ilk satır, ideal çözüm son satır olarak eklenir. En küçük ve en büyük değerler l, m ve u için ayrı ayrı alınır.',
  'methods.fuzzyMarcos.steps.normalized-matrix.name': 'Normalize bulanık matris',
  'methods.fuzzyMarcos.steps.normalized-matrix.explanation':
    'Fayda kriterinde her bileşen idealin üst değeri u’ya bölünür; maliyet kriterinde idealin alt değeri l her bileşene bölünür, bu da bileşenlerin sırasını tersine çevirir.',
  'methods.fuzzyMarcos.steps.weighted-matrix.name': 'Ağırlıklı bulanık matris',
  'methods.fuzzyMarcos.steps.weighted-matrix.explanation':
    'Her normalize değer kendi kriterinin ağırlığıyla bileşen bileşen çarpılır.',
  'methods.fuzzyMarcos.steps.sums.name': 'Bulanık toplamlar S̃_i',
  'methods.fuzzyMarcos.steps.sums.explanation':
    'Negatif ideal ve ideal satırlar dahil, ağırlıklı matrisin her satırının toplamı.',
  'methods.fuzzyMarcos.steps.utility-degrees.name': 'Bulanık fayda dereceleri',
  'methods.fuzzyMarcos.steps.utility-degrees.explanation':
    'K̃⁻ her alternatifi negatif ideal çözümle, K̃⁺ ideal çözümle bulanık bölme ile karşılaştırır: l diğerinin u’suna, m m’ye, u l’ye bölünür.',
  'methods.fuzzyMarcos.steps.utility-degree-sums.name': 'Fayda derecelerinin toplamları T̃_i',
  'methods.fuzzyMarcos.steps.utility-degree-sums.explanation':
    'Her alternatifin iki bulanık fayda derecesinin toplamı.',
  'methods.fuzzyMarcos.steps.max-utility-degree-sum.name': 'En büyük toplam D̃',
  'methods.fuzzyMarcos.steps.max-utility-degree-sum.explanation':
    'l, m ve u için ayrı ayrı alınan en büyük T̃_i.',
  'methods.fuzzyMarcos.steps.max-utility-degree-sum-crisp.name': 'D̃’nin kesin değeri (df_crisp)',
  'methods.fuzzyMarcos.steps.max-utility-degree-sum-crisp.explanation':
    'D̃, derecelendirilmiş ortalama (l + 4m + u) / 6 ile durulaştırılır. Tüm bulanık fayda fonksiyonları bu tek sayıya bölünür.',
  'methods.fuzzyMarcos.steps.utility-functions.name': 'Bulanık fayda fonksiyonları',
  'methods.fuzzyMarcos.steps.utility-functions.explanation':
    'f(K̃⁻), K̃⁺’nın df_crisp’e bölümü; f(K̃⁺), K̃⁻’nin df_crisp’e bölümüdür. Kaynak makaledeki gibi çaprazlamaya dikkat edin.',
  'methods.fuzzyMarcos.steps.defuzzification.name': 'Durulaştırma',
  'methods.fuzzyMarcos.steps.defuzzification.explanation':
    'Bulanık fayda dereceleri ve fayda fonksiyonları {defuzzification, select, graded-mean {derecelendirilmiş ortalama (l + 4m + u) / 6} centroid {ağırlık merkezi (l + m + u) / 3} other {seçilen formül}} ile kesin sayılara çevrilir.',
  'methods.fuzzyMarcos.steps.final-utility.name': 'Nihai fayda f(K_i)',
  'methods.fuzzyMarcos.steps.final-utility.explanation':
    'Kesin fayda dereceleri ile fayda fonksiyonlarının uzlaşık değeri. Yüksek değer daha iyidir.',
  'methods.fuzzyMarcos.steps.ranking.name': 'Sıralama',
  'methods.fuzzyMarcos.steps.ranking.explanation':
    'Alternatifler nihai faydaya göre, en yüksekten başlayarak sıralanır. Eşit değerler aynı sırayı paylaşır.',

  // ------------------------------------------------------------ validation
  'validation.marcos.reserved-alternative-id':
    '"{id}" alternatif kimliği MARCOS’un negatif ideal ya da ideal çözümüne ayrılmıştır.',
  'validation.marcos.zero-cost-value':
    '"{id}" maliyet kriterinin bu hücresi 0. MARCOS maliyet kriterlerinin değerlerine böler, bu yüzden sıfırdan büyük olmalıdırlar.',
  'validation.marcos.zero-ideal-value':
    '"{id}" fayda kriterinin bütün değerleri 0; ideal değeri 0 olduğundan MARCOS bu kriteri normalize edemez.',
  'validation.marcos.zero-anti-ideal-sum':
    'Negatif ideal çözümün S toplamı 0, bu yüzden K⁻ fayda dereceleri hesaplanamaz. En küçük değeri 0 olan fayda kriterlerini kontrol edin.',
  'validation.marcos.zero-sum':
    'Bu alternatifin S toplamı 0, bu yüzden fayda fonksiyonları hesaplanamaz.',
  'validation.fuzzy-marcos.reserved-alternative-id':
    '"{id}" alternatif kimliği Fuzzy MARCOS’un negatif ideal ya da ideal çözümüne ayrılmıştır.',
  'validation.fuzzy-marcos.unsupported-weights':
    'Ağırlıklar "{numberType}" sayı türünü kullanıyor. Fuzzy MARCOS üçgen bulanık ya da kesin ağırlıkları kabul eder.',
  'validation.fuzzy-marcos.zero-cost-value':
    '"{id}" maliyet kriterinin bu hücresinin alt değeri l 0. Fuzzy MARCOS maliyet kriterlerinin değerlerine böler, bu yüzden sıfırdan büyük olmalıdırlar.',
  'validation.fuzzy-marcos.zero-ideal-value':
    '"{id}" fayda kriterinin bütün üst değerleri u 0, bu yüzden Fuzzy MARCOS bu kriteri normalize edemez.',
  'validation.fuzzy-marcos.zero-anti-ideal-sum':
    'Negatif ideal çözümün S̃ toplamının bir bileşeni 0, bu yüzden K̃⁻ fayda dereceleri hesaplanamaz.',
  'validation.fuzzy-marcos.zero-ideal-sum':
    'İdeal çözümün S̃ toplamının bir bileşeni 0, bu yüzden K̃⁺ fayda dereceleri hesaplanamaz.',
  'validation.fuzzy-marcos.zero-sum':
    'Bu alternatifin S̃ toplamı (0, 0, 0), bu yüzden fayda fonksiyonları hesaplanamaz.',
  'validation.fuzzy-marcos.normalize-fuzzy-weights':
    'Bulanık ağırlıklar bu seçenekle normalize edilemez. Seçeneği kapatın ya da kesin ağırlıklar girin.',
};
