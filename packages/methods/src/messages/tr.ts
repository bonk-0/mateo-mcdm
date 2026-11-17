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

  // ------------------------------------------------------------ CRITIC
  'methods.critic.name': 'CRITIC',
  'methods.critic.rows.weight': 'Ağırlık w_j',
  'methods.critic.steps.initial-matrix.name': 'Başlangıç karar matrisi',
  'methods.critic.steps.initial-matrix.explanation':
    'Her alternatifin her kriterdeki performansı, girildiği gibi.',
  'methods.critic.steps.normalized-matrix.name': 'Normalize matris',
  'methods.critic.steps.normalized-matrix.explanation':
    'Her kriter [0, 1] aralığına ölçeklenir: en kötü değer 0, en iyi değer 1 olur. Fayda kriterinde en iyi değer en büyük, maliyet kriterinde en küçük değerdir.',
  'methods.critic.steps.means.name': 'Sütun ortalamaları',
  'methods.critic.steps.means.explanation':
    'Her normalize sütunun ortalaması; sapmaları hesaplamak için gerekir.',
  'methods.critic.steps.deviations.name': 'Ortalamadan sapmalar d_ij',
  'methods.critic.steps.deviations.explanation':
    'Her normalize değerden sütununun ortalaması çıkarılır. Standart sapmalar ve korelasyonlar bu sapmalardan hesaplanır.',
  'methods.critic.steps.standard-deviations.name': 'Standart sapmalar σ_j',
  'methods.critic.steps.standard-deviations.explanation':
    'Her kriterin kontrast şiddeti: normalize sütunun anakütle standart sapması. Alternatifleri daha çok ayıran kriter daha fazla bilgi taşır.',
  'methods.critic.steps.correlation-matrix.name': 'Korelasyon matrisi',
  'methods.critic.steps.correlation-matrix.explanation':
    'Her normalize sütun çiftinin Pearson korelasyonu. Güçlü korelasyonlu kriterler aynı şeyi söyler, dolayısıyla daha az çelişir.',
  'methods.critic.steps.conflict.name': 'Çelişki',
  'methods.critic.steps.conflict.explanation':
    'Her kriterin diğerlerinin hepsiyle çelişkisi: korelasyon matrisindeki satırı boyunca (1 − r) toplamı.',
  'methods.critic.steps.information-content.name': 'Bilgi içeriği C_j',
  'methods.critic.steps.information-content.explanation':
    'Kontrast şiddeti çarpı çelişki: kriter alternatifleri ayırıyor ve diğer kriterlerle çelişiyorsa bilgi verir.',
  'methods.critic.steps.weights.name': 'Kriter ağırlıkları',
  'methods.critic.steps.weights.explanation':
    'Her bilgi içeriği toplamlarına bölünür, böylece ağırlıkların toplamı 1 olur.',

  // ------------------------------------------------------------ MEREC
  'methods.merec.name': 'MEREC',
  'methods.merec.columns.S': 'Performans S_i',
  'methods.merec.rows.weight': 'Ağırlık w_j',
  'methods.merec.steps.initial-matrix.name': 'Başlangıç karar matrisi',
  'methods.merec.steps.initial-matrix.explanation':
    'Her alternatifin her kriterdeki performansı, girildiği gibi. Bütün değerler sıfırdan büyük olmalıdır.',
  'methods.merec.steps.normalized-matrix.name': 'Normalize matris',
  'methods.merec.steps.normalized-matrix.explanation':
    'Her kriter minimizasyon kriterine dönüştürülür; bu, olağan doğrusal normalizasyonun tersidir: fayda kriterinde sütunun en küçük değeri değere bölünür, maliyet kriterinde değer sütunun en büyük değerine bölünür.',
  'methods.merec.steps.absolute-logs.name': 'Mutlak logaritmalar',
  'methods.merec.steps.absolute-logs.explanation':
    'Her normalize değerin doğal logaritmasının mutlak değeri. Sonraki iki adımda toplanan terimler bunlardır.',
  'methods.merec.steps.overall-performance.name': 'Genel performans S_i',
  'methods.merec.steps.overall-performance.explanation':
    'Her alternatifin tüm kriterlerle performansı: ln(1 + mutlak logaritmaların toplamı / kriter sayısı).',
  'methods.merec.steps.removal-performance.name': 'Bir kriter çıkarıldığında performans S′_ij',
  'methods.merec.steps.removal-performance.explanation':
    'Aynı hesap, bir kriter dışarıda bırakılarak yapılır. Bölen kriter sayısı olarak kalır, bir eksiği olmaz.',
  'methods.merec.steps.removal-effects.name': 'Çıkarma etkileri E_j',
  'methods.merec.steps.removal-effects.explanation':
    'Bir kriterin çıkarılmasının performansları ne kadar değiştirdiği: alternatifler üzerinden |S′ − S| toplamı. Etki ne kadar büyükse kriter o kadar önemlidir.',
  'methods.merec.steps.weights.name': 'Kriter ağırlıkları',
  'methods.merec.steps.weights.explanation':
    'Her çıkarma etkisi toplamlarına bölünür, böylece ağırlıkların toplamı 1 olur. Etkiler bölmeden önce yuvarlanmaz.',

  // ------------------------------------------------------------ SWARA
  'methods.swara.name': 'SWARA',
  'methods.swara.rows.s': 'Karşılaştırmalı önem s_j',
  'methods.swara.rows.k': 'Katsayı k_j',
  'methods.swara.rows.w': 'Yeniden hesaplanan ağırlık w_j',
  'methods.swara.rows.q': 'Ağırlık q_j',
  'methods.swara.steps.comparative-importance.name': 'Karşılaştırmalı önem s_j',
  'methods.swara.steps.comparative-importance.explanation':
    'Uzmanların belirttiği, her kriterin hemen altındaki kriterden ne kadar daha önemli olduğu. Kriterler azalan önem sırasındadır; ilk kriterin değeri yoktur.',
  'methods.swara.steps.coefficients.name': 'Katsayılar k_j',
  'methods.swara.steps.coefficients.explanation': 'İlk kriter için k = 1, diğerleri için s + 1.',
  'methods.swara.steps.recalculated-weights.name': 'Yeniden hesaplanan ağırlıklar w_j',
  'methods.swara.steps.recalculated-weights.explanation':
    'İlk kriter 1 alır; diğer her ağırlık, bir önceki ağırlığın kendi katsayısına bölünmesiyle bulunur.',
  'methods.swara.steps.weights.name': 'Kriter ağırlıkları q_j',
  'methods.swara.steps.weights.explanation':
    'Yeniden hesaplanan her ağırlık toplamlarına bölünür, böylece ağırlıkların toplamı 1 olur.',

  // ------------------------------------------------------------ Fuzzy SWARA (IMF SWARA)
  'methods.fuzzySwara.name': 'Bulanık SWARA (IMF SWARA)',
  'methods.fuzzySwara.rows.s': 'Karşılaştırmalı önem s̃_j',
  'methods.fuzzySwara.rows.k': 'Katsayı k̃_j',
  'methods.fuzzySwara.rows.q': 'Yeniden hesaplanan ağırlık q̃_j',
  'methods.fuzzySwara.rows.w': 'Bulanık ağırlık w̃_j',
  'methods.fuzzySwara.rows.c': 'Kesin ağırlık',
  'methods.fuzzySwara.rows.weight': 'Ağırlık w_j',
  'methods.fuzzySwara.parameters.defuzzification.label': 'Durulaştırma',
  'methods.fuzzySwara.parameters.defuzzification.description':
    'Her bulanık ağırlığın kesin sayıya nasıl çevrildiği. Kaynak makaleler formülü belirtmez; aynı yazarların Fuzzy MARCOS’ta açıkça belirttiği derecelendirilmiş ortalama, makalelerdeki değerleri yeniden üretir.',
  'methods.fuzzySwara.parameters.defuzzification.gradedMean':
    'Derecelendirilmiş ortalama (l + 4m + u) / 6',
  'methods.fuzzySwara.parameters.defuzzification.centroid': 'Ağırlık merkezi (l + m + u) / 3',
  'methods.fuzzySwara.steps.assessments.name': 'Karşılaştırmalı önem s̃_j',
  'methods.fuzzySwara.steps.assessments.explanation':
    'Uzmanların dilsel değerlendirmeleri, karşılaştırma ölçeğindeki üçgensel bulanık sayılar olarak: her kriterin hemen üstündeki kriterden ne kadar daha az önemli olduğu. İlk kriterin değeri yoktur.',
  'methods.fuzzySwara.steps.coefficients.name': 'Bulanık katsayılar k̃_j',
  'methods.fuzzySwara.steps.coefficients.explanation':
    'İlk kriter için k̃ = (1, 1, 1), diğerleri için s̃ + 1. Kaynak makalenin denklemi “+ 1”i atlar; bütün çözülmüş örnekler ve bu yöntem onu ekler.',
  'methods.fuzzySwara.steps.recalculated-weights.name': 'Yeniden hesaplanan bulanık ağırlıklar q̃_j',
  'methods.fuzzySwara.steps.recalculated-weights.explanation':
    'İlk kriter (1, 1, 1) alır; diğer her ağırlık, bir öncekinin kendi katsayısına bulanık bölünmesiyle bulunur: l, diğerinin u’suna, m, m’ye ve u, l’ye bölünür.',
  'methods.fuzzySwara.steps.recalculated-weights-sum.name':
    'Yeniden hesaplanan ağırlıkların toplamı',
  'methods.fuzzySwara.steps.recalculated-weights-sum.explanation':
    'Yeniden hesaplanan tüm ağırlıkların bileşen bileşen bulanık toplamı.',
  'methods.fuzzySwara.steps.fuzzy-weights.name': 'Bulanık ağırlıklar w̃_j',
  'methods.fuzzySwara.steps.fuzzy-weights.explanation':
    'Yeniden hesaplanan her ağırlık, bulanık bölme ile toplama bölünür.',
  'methods.fuzzySwara.steps.crisp-weights.name': 'Kesin ağırlıklar',
  'methods.fuzzySwara.steps.crisp-weights.explanation':
    'Her bulanık ağırlık {defuzzification, select, graded-mean {derecelendirilmiş ortalama (l + 4m + u) / 6} centroid {ağırlık merkezi (l + m + u) / 3} other {seçilen formül}} ile durulaştırılır. Durulaştırma toplamsal değildir, bu yüzden bu değerlerin toplamı tam olarak 1 etmez.',
  'methods.fuzzySwara.steps.weights.name': 'Normalize kesin ağırlıklar',
  'methods.fuzzySwara.steps.weights.explanation':
    'Her kesin ağırlık toplamlarına bölünür; böylece ağırlıkların toplamı 1 olur ve başka bir yönteme girdi olabilir.',

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
  'validation.critic.zero-information':
    'Bütün bilgi içerikleri C_j 0 (örneğin iki kriter tamamen korelasyonlu), bu yüzden ağırlıklar hesaplanamaz.',
  'validation.merec.zero-removal-effects':
    'Bütün çıkarma etkileri E_j 0 (örneğin tüm alternatifler aynı), bu yüzden ağırlıklar hesaplanamaz.',
  'validation.swara.negative-importance':
    'Karşılaştırmalı önem {value} negatif. Kriterleri azalan önem sırasına koyun; her kriter bir sonrakinden en az onun kadar önemli olmalıdır.',
  'validation.swara.first-importance-ignored':
    'İlk kriterin karşılaştırmalı önemi yoktur. Değer yok sayılır.',
  'validation.fuzzy-swara.unknown-term': '"{term}" karşılaştırma ölçeğinde bir terim değil.',
  'validation.fuzzy-swara.negative-scale-value':
    '"{term}" ölçek teriminin negatif bir bileşeni var, bu yüzden katsayısı 1’in altına düşebilir.',
  'validation.fuzzy-swara.first-assessment-ignored':
    'İlk kriterin değerlendirmesi yoktur. Değer yok sayılır.',
};
