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

  // ------------------------------------------------------------ LOPCOW
  'methods.lopcow.name': 'LOPCOW',
  'methods.lopcow.rows.meanSquare': 'Kareler ortalaması',
  'methods.lopcow.rows.sigma': 'Standart sapma σ_j',
  'methods.lopcow.rows.percentageValue': 'Yüzde değeri PV_j',
  'methods.lopcow.rows.weight': 'Ağırlık w_j',
  'methods.lopcow.steps.initial-matrix.name': 'Başlangıç karar matrisi',
  'methods.lopcow.steps.initial-matrix.explanation':
    'Her alternatifin her kriterdeki performansı, girildiği gibi.',
  'methods.lopcow.steps.normalized-matrix.name': 'Normalize matris r_ij',
  'methods.lopcow.steps.normalized-matrix.explanation':
    'Her kriter [0, 1] aralığına ölçeklenir: en kötü değer 0, en iyi değer 1 olur. Fayda kriterinde en iyi değer en büyük, maliyet kriterinde en küçük değerdir.',
  'methods.lopcow.steps.mean-squares.name': 'Kareler ortalaması',
  'methods.lopcow.steps.mean-squares.explanation':
    'Her kriterin normalize değerlerinin karelerinin ortalaması. Karekökü sütunun karesel ortalamasıdır.',
  'methods.lopcow.steps.means.name': 'Sütun ortalamaları',
  'methods.lopcow.steps.means.explanation':
    'Sapmalar için gereken, her normalize sütunun ortalaması.',
  'methods.lopcow.steps.deviations.name': 'Ortalamadan sapmalar d_ij',
  'methods.lopcow.steps.deviations.explanation':
    'Her normalize değerden sütununun ortalaması çıkarılır.',
  'methods.lopcow.steps.standard-deviations.name': 'Standart sapmalar σ_j',
  'methods.lopcow.steps.standard-deviations.explanation':
    'Her normalize sütunun örneklem standart sapması (m − 1’e, yani alternatif sayısının bir eksiğine bölünür). Kaynak örneği bu tanım yeniden üretir.',
  'methods.lopcow.steps.percentage-values.name': 'Yüzde değerleri PV_j',
  'methods.lopcow.steps.percentage-values.explanation':
    'Her kriterin karesel ortalaması ile standart sapması arasındaki logaritmik yüzde değişim: |ln(√(kareler ortalaması) / σ_j) · 100|. Kriterin yayılımının ortalama düzeyinden ne kadar farklı olduğunu ölçer.',
  'methods.lopcow.steps.percentage-value-sum.name': 'Yüzde değerlerinin toplamı',
  'methods.lopcow.steps.percentage-value-sum.explanation':
    'Tüm kriterlerin yüzde değerlerinin toplamı.',
  'methods.lopcow.steps.weights.name': 'Kriter ağırlıkları',
  'methods.lopcow.steps.weights.explanation':
    'Her yüzde değeri toplamlarına bölünür; böylece ağırlıkların toplamı 1 olur.',

  // ------------------------------------------------------------ FUCOM
  'methods.fucom.name': 'FUCOM',
  'methods.fucom.rows.significance': 'Önem değeri ϖ',
  'methods.fucom.rows.comparativePriority': 'Karşılaştırmalı öncelik φ_k/(k+1)',
  'methods.fucom.rows.transitivePriority': 'Geçişli öncelik φ_k/(k+2)',
  'methods.fucom.rows.relativeWeight': 'Göreli ağırlık v_j',
  'methods.fucom.rows.weight': 'Ağırlık w_j',
  'methods.fucom.rows.adjacentDeviation': '|w_k / w_(k+1) − φ_k/(k+1)|',
  'methods.fucom.rows.transitiveDeviation': '|w_k / w_(k+2) − φ_k/(k+2)|',
  'methods.fucom.reasons.firstPair':
    'Geçişli koşul yok: bu kriter en önemli kriterin yalnızca bir sıra altında.',
  'methods.fucom.steps.significance.name': 'Kriterlerin önem değerleri ϖ',
  'methods.fucom.steps.significance.explanation':
    'Uzmanın her kritere verdiği önem değeri, sıralama düzeninde. En önemli kriterin değeri en küçüktür; eşit değerler eşit önem demektir.',
  'methods.fucom.steps.comparative-priorities.name': 'Karşılaştırmalı öncelikler φ',
  'methods.fucom.steps.comparative-priorities.explanation':
    'Her kriterin hemen altındaki kriterden kaç kat önemli olduğu; alttaki kriterin sütununda gösterilir. Önem değerlerinden, sonraki değerin bu değere bölümüdür.',
  'methods.fucom.steps.transitive-priorities.name': 'Geçişli öncelikler',
  'methods.fucom.steps.transitive-priorities.explanation':
    'Bir kriterin iki sıra altındaki kritere göre önceliği: aradaki iki karşılaştırmalı önceliğin çarpımı. Tam tutarlılık, ağırlıkların bunlara da uymasını gerektirir.',
  'methods.fucom.steps.relative-weights.name': 'Göreli ağırlıklar v_j',
  'methods.fucom.steps.relative-weights.explanation':
    'En önemli kriter 1 alır; sonraki her kriter, bir öncekinin değerinin aralarındaki karşılaştırmalı önceliğe bölümünü alır. Bu oranlar FUCOM modelinin tüm koşullarını tam olarak sağlar.',
  'methods.fucom.steps.weights.name': 'Kriter ağırlıkları',
  'methods.fucom.steps.weights.explanation':
    'Her göreli ağırlık toplamlarına bölünür; böylece ağırlıkların toplamı 1 olur.',
  'methods.fucom.steps.consistency-deviations.name': 'Tam tutarlılıktan sapmalar',
  'methods.fucom.steps.consistency-deviations.explanation':
    'FUCOM modelinin her koşulu son ağırlıklarla kontrol edilir: her ağırlık oranının karşılaştırmalı ya da geçişli öncelikten ne kadar uzak olduğu.',
  'methods.fucom.steps.dfc.name': 'Tam tutarlılıktan sapma χ (DFC)',
  'methods.fucom.steps.dfc.explanation':
    'FUCOM modeli, tüm sapmaları sınırlayan χ değerini en küçük yapan ağırlıkları arar. Yukarıdaki ağırlıklar tüm koşulları sağladığı için χ 0’dır (son basamaklardaki yuvarlama dışında) ve başka bir ağırlık vektörü en iyi değildir.',

  // ------------------------------------------------------------ BWM
  'methods.bwm.name': 'BWM',
  'methods.bwm.parameters.model.label': 'Model',
  'methods.bwm.parameters.model.description':
    'Doğrusal olmayan model yöntemin özgün hâlidir; en iyi ağırlıkları bir aralık oluşturabilir, bu yüzden her ağırlık bir aralık ve onun merkezi olarak verilir. Doğrusal modelin her zaman tek bir çözümü vardır.',
  'methods.bwm.parameters.model.nonlinear': 'Doğrusal olmayan (Rezaei 2015)',
  'methods.bwm.parameters.model.linear': 'Doğrusal (Rezaei 2016)',
  'methods.bwm.parameters.scale.label': 'Tercih ölçeği',
  'methods.bwm.parameters.scale.description':
    'Karşılaştırmaların verildiği ölçeğin en büyük değeri (1’den bu değere kadar). Tutarlılık eşiği buna bağlıdır.',
  'methods.bwm.rows.bestToOthers': 'En iyiden diğerlerine a_Bj',
  'methods.bwm.rows.othersToWorst': 'Diğerlerinden en kötüye a_jW',
  'methods.bwm.rows.lowerBound': 'En küçük optimal ağırlık',
  'methods.bwm.rows.upperBound': 'En büyük optimal ağırlık',
  'methods.bwm.rows.centre': 'Aralık merkezi c_j',
  'methods.bwm.rows.weight': 'Ağırlık w_j',
  'methods.bwm.rows.inputRatio': 'Girdi tabanlı oran CR^I_j',
  'methods.bwm.steps.best-to-others.name': 'En iyiden diğerlerine vektörü',
  'methods.bwm.steps.best-to-others.explanation':
    'En iyi kriterin her kritere 1–9 ölçeğinde ne kadar tercih edildiği. En iyi kriterin kendisiyle karşılaştırması 1’dir.',
  'methods.bwm.steps.others-to-worst.name': 'Diğerlerinden en kötüye vektörü',
  'methods.bwm.steps.others-to-worst.explanation':
    'Her kriterin en kötü kritere 1–9 ölçeğinde ne kadar tercih edildiği. En kötü kriterin kendisiyle karşılaştırması 1’dir.',
  'methods.bwm.steps.input-consistency.name': 'Girdi tabanlı tutarlılık CR^I_j',
  'methods.bwm.steps.input-consistency.explanation':
    'Her kriter için dolaylı karşılaştırma a_Bj · a_jW ile en iyinin en kötüye doğrudan tercihi a_BW arasındaki farkın, olabilecek en büyük farka oranı. Yalnızca karşılaştırmalardan hesaplanır (Liang, Brunelli ve Rezaei 2020).',
  'methods.bwm.steps.input-consistency-ratio.name': 'Girdi tabanlı tutarlılık oranı CR^I',
  'methods.bwm.steps.input-consistency-ratio.explanation':
    'En büyük CR^I_j değeri. Karşılaştırmalar tamamen tutarlıysa 0’dır.',
  'methods.bwm.steps.input-threshold.name': 'Tutarlılık eşiği',
  'methods.bwm.steps.input-threshold.explanation':
    'CR^I bu eşiği aşmıyorsa karşılaştırmalar kabul edilebilir ölçüde tutarlıdır. Eşik, Liang, Brunelli ve Rezaei (2020) tarafından {count, number} kriter ve 1–{scale, number} ölçeği için türetilmiştir. Aşılırsa karşılaştırmalar, en büyük CR^I_j değerine sahip kriterden başlayarak gözden geçirilmelidir.',
  'methods.bwm.steps.optimal-xi.name': 'Optimal ξ*',
  'methods.bwm.steps.optimal-xi.explanation':
    'Her w_B / w_j ve w_j / w_W oranını belirtilen tercihten en fazla ξ uzakta tutan bir ağırlık vektörünün bulunduğu en küçük ξ. ξ sabitken koşullar doğrusaldır; bu yüzden ξ*, her adımda {solver} ile çözülen bir doğrusal programla ikiye bölme yöntemiyle bulunur. ξ* = 0, karşılaştırmaların tam tutarlı olduğu anlamına gelir.',
  'methods.bwm.steps.weight-intervals.name': 'Optimal ağırlık aralıkları',
  'methods.bwm.steps.weight-intervals.explanation':
    'ξ* değerine birden fazla ağırlık vektörü ulaşabilir. Her kriter için bunların arasındaki en küçük ve en büyük ağırlık; her biri {solver} ile çözülen bir doğrusal programla bulunur.',
  'methods.bwm.steps.interval-centres.name': 'Aralık merkezleri c_j',
  'methods.bwm.steps.interval-centres.explanation':
    'Her aralığın orta noktası; doğrusal olmayan model için önerilen temsilî ağırlık. Merkezlerin toplamı tam olarak 1 olmayabilir.',
  'methods.bwm.steps.consistency-index.name': 'Tutarlılık indeksi CI',
  'methods.bwm.steps.consistency-index.explanation':
    'En iyi kriterin en kötü kritere tercihine (a_BW) göre ξ* değerinin alabileceği en büyük değer.',
  'methods.bwm.steps.consistency-ratio.name': 'Tutarlılık oranı CR',
  'methods.bwm.steps.consistency-ratio.explanation':
    'ξ* değerinin tutarlılık indeksine bölümü: tam tutarlı karşılaştırmalarda 0, tutarlılık azaldıkça 1’e daha yakın.',
  'methods.bwm.steps.weights.name': 'Kriter ağırlıkları',
  'methods.bwm.steps.weights.explanation':
    'Her aralık merkezi toplamlarına bölünür; böylece ağırlıkların toplamı 1 olur ve başka bir yöntemde kullanılabilir.',
  'methods.bwm.steps.weights.linearExplanation':
    'Doğrusal modelin {solver} ile çözülen optimal çözümünün ağırlıkları. Doğrusal modelin tek bir optimal çözümü vardır.',
  'methods.bwm.steps.linear-xi.name': 'Optimal ξ^L*',
  'methods.bwm.steps.linear-xi.explanation':
    'Her |w_B − a_Bj · w_j| ve |w_j − a_jW · w_W| farkını en fazla ξ tutan bir ağırlık vektörünün bulunduğu en küçük ξ; {solver} ile çözülen bir doğrusal programla bulunur. ξ^L* değerinin kendisi tutarlılık göstergesidir: 0’a ne kadar yakınsa karşılaştırmalar o kadar tutarlıdır.',

  // ------------------------------------------------------------ DEMATEL
  'methods.dematel.name': 'DEMATEL',
  'methods.dematel.columns.rowSum': 'Satır toplamı',
  'methods.dematel.columns.dispatch': 'Gönderilen etki D',
  'methods.dematel.columns.receive': 'Alınan etki R',
  'methods.dematel.columns.prominence': 'Öne çıkma D + R',
  'methods.dematel.columns.relation': 'İlişki D − R',
  'methods.dematel.rows.columnSum': 'Sütun toplamı',
  'methods.dematel.rows.weightBasis': 'Ağırlık tabanı a_i',
  'methods.dematel.rows.weight': 'Ağırlık w_i',
  'methods.dematel.parameters.normalization.label': 'Normalleştirme sabiti',
  'methods.dematel.parameters.normalization.description':
    'Doğrudan ilişki matrisini bölen s sabiti. En büyük satır toplamı ile en büyük sütun toplamının büyüğü klasik biçimdir ve dolaylı etkiler serisinin yakınsamasını garanti eder.',
  'methods.dematel.parameters.normalization.maxRowOrColumnSum': 'En büyük satır veya sütun toplamı',
  'methods.dematel.parameters.normalization.maxRowSum': 'Yalnızca en büyük satır toplamı',
  'methods.dematel.parameters.threshold.label': 'Neden-sonuç haritasının eşiği',
  'methods.dematel.parameters.threshold.description':
    'Toplam ilişki matrisinin hangi ilişkilerinin haritada gösterileceği. Yalnızca haritayı etkiler; T, D + R, D − R ve ağırlıklar değişmez.',
  'methods.dematel.parameters.threshold.mean': 'Toplam ilişki matrisinin ortalaması',
  'methods.dematel.parameters.threshold.custom': 'Kendim gireceğim değer',
  'methods.dematel.parameters.customThreshold.label': 'Eşik değeri',
  'methods.dematel.parameters.customThreshold.description':
    'Eşik elle girildiğinde kullanılır. Bu değere eşit veya daha büyük ilişkiler gösterilir. 0 her ilişkiyi gösterir.',
  'methods.dematel.parameters.weightBasis.label': 'Ağırlıkların kaynağı',
  'methods.dematel.parameters.weightBasis.description':
    'Öne çıkma D + R, her faktöre sistemdeki katılımı oranında pay verir. Uzaklık √((D + R)² + (D − R)²) güçlü neden ve güçlü sonuçları da ödüllendirir.',
  'methods.dematel.parameters.weightBasis.prominence': 'Öne çıkma D + R',
  'methods.dematel.parameters.weightBasis.distance': 'Uzaklık √((D + R)² + (D − R)²)',
  'methods.dematel.steps.expert-matrices.name': 'Uzman matrisleri',
  'methods.dematel.steps.expert-matrices.explanation':
    'Her uzmanın doğrudan ilişki matrisi, alt alta: her faktörün diğer faktörler üzerindeki etkisi.',
  'methods.dematel.steps.direct-relation.name': 'Doğrudan ilişki matrisi Z',
  'methods.dematel.steps.direct-relation.explanation':
    '{experts, plural, one {Her faktörün diğer faktörler üzerindeki doğrudan etkisi, girildiği gibi.} other {{experts, number} uzman matrisinin hücre hücre ortalaması.}}',
  'methods.dematel.steps.row-sums.name': 'Satır toplamları',
  'methods.dematel.steps.row-sums.explanation':
    'Her faktörün gönderdiği toplam doğrudan etki: Z matrisindeki satırının toplamı.',
  'methods.dematel.steps.column-sums.name': 'Sütun toplamları',
  'methods.dematel.steps.column-sums.explanation':
    'Her faktörün aldığı toplam doğrudan etki: Z matrisindeki sütununun toplamı.',
  'methods.dematel.steps.normalization-constant.name': 'Normalleştirme sabiti s',
  'methods.dematel.steps.normalization-constant.explanation':
    '{normalization, select, max-row-sum {En büyük satır toplamı.} other {En büyük satır toplamı ile en büyük sütun toplamının büyüğü.}} Buna bölmek, her dolaylı etkiyi bir öncekinden küçük yapar.',
  'methods.dematel.steps.normalized-matrix.name': 'Normalleştirilmiş matris X',
  'methods.dematel.steps.normalized-matrix.explanation': 'Z’nin her hücresinin s’ye bölünmüşü.',
  'methods.dematel.steps.inverse.name': 'Ters matris (I − X)⁻¹',
  'methods.dematel.steps.inverse.explanation':
    'Birim matrisden X çıkarılarak elde edilen matrisin tersi. I + X + X² + … toplamına eşittir: doğrudan etki ile her uzunluktaki zincirlerden gelen tüm dolaylı etkilerin toplamı.',
  'methods.dematel.steps.total-relation.name': 'Toplam ilişki matrisi T',
  'methods.dematel.steps.total-relation.explanation':
    'T = X (I − X)⁻¹ = X + X² + X³ + …: her faktörün diğerleri üzerindeki doğrudan etkisi artı tüm dolaylı etkileri.',
  'methods.dematel.steps.influence.name': 'Gönderilen ve alınan etki',
  'methods.dematel.steps.influence.explanation':
    'D, T matrisinin satır toplamıdır (faktörün tüm faktörlere gönderdiği etki), R sütun toplamıdır (faktörün tüm faktörlerden aldığı etki).',
  'methods.dematel.steps.prominence-relation.name': 'Öne çıkma ve ilişki',
  'methods.dematel.steps.prominence-relation.explanation':
    'D + R, faktörün sisteme ne kadar katıldığını gösterir. D − R neden için pozitif (etkilediği, etkilendiğinden fazla), sonuç için negatiftir.',
  'methods.dematel.steps.weight-basis.name': 'Ağırlık tabanı a_i',
  'methods.dematel.steps.weight-basis.explanation':
    'Her faktörün öne çıkma-ilişki düzleminde orijine uzaklığı: √((D + R)² + (D − R)²).',
  'methods.dematel.steps.weight-basis-sum.name': 'Ağırlık tabanının toplamı',
  'methods.dematel.steps.weight-basis-sum.explanation':
    'Ağırlıkların türetildiği değerin tüm faktörler üzerinden toplamı.',
  'methods.dematel.steps.weights.name': 'Faktör ağırlıkları',
  'methods.dematel.steps.weights.explanation':
    'Her faktörün değeri toplama bölünür; böylece ağırlıkların toplamı 1 olur ve bir sıralama yöntemine girdi olabilir.',
  'methods.dematel.steps.threshold.name': 'Neden-sonuç haritasının eşiği',
  'methods.dematel.steps.threshold.explanation':
    '{threshold, select, mean {Toplam ilişki matrisinin tüm girdilerinin ortalaması.} other {Parametre olarak girilen değer.}} Harita, farklı faktörler arasındaki bu değere eşit veya daha büyük ilişkileri gösterir.',

  // ------------------------------------------------------------ Bulanık DEMATEL
  'methods.fuzzyDematel.name': 'Bulanık DEMATEL (TFN)',
  'methods.fuzzyDematel.parameters.defuzzification.label': 'Durulaştırma',
  'methods.fuzzyDematel.parameters.defuzzification.description':
    'D̃ + R̃, D̃ − R̃ ve toplam ilişki matrisinin kesin sayıya çevrilme biçimi. Ağırlık merkezi ve dereceli ortalama her sayıyı tek başına işler; CFCS bir tablonun tüm sayılarıyla normalleştirir.',
  'methods.fuzzyDematel.parameters.defuzzification.centroid': 'Ağırlık merkezi (l + m + u) / 3',
  'methods.fuzzyDematel.parameters.defuzzification.gradedMean':
    'Dereceli ortalama (l + 4m + u) / 6',
  'methods.fuzzyDematel.parameters.defuzzification.cfcs':
    'CFCS (bulanık veriyi kesin puana çevirme)',
  'methods.fuzzyDematel.steps.expert-matrices.name': 'Uzman matrisleri (TFN)',
  'methods.fuzzyDematel.steps.expert-matrices.explanation':
    'Her uzmanın doğrudan ilişki matrisi üçgensel bulanık sayılarla, alt alta.',
  'methods.fuzzyDematel.steps.direct-relation.name': 'Bulanık doğrudan ilişki matrisi Z̃',
  'methods.fuzzyDematel.steps.direct-relation.explanation':
    '{experts, plural, one {Her faktörün diğer faktörler üzerindeki bulanık doğrudan etkisi, girildiği gibi.} other {{experts, number} uzman matrisinin bileşen bileşen ortalaması.}}',
  'methods.fuzzyDematel.steps.row-sums.name': 'Bulanık satır toplamları',
  'methods.fuzzyDematel.steps.row-sums.explanation':
    'Z̃ matrisinin her satırının bileşen bileşen toplamı.',
  'methods.fuzzyDematel.steps.column-sums.name': 'Bulanık sütun toplamları',
  'methods.fuzzyDematel.steps.column-sums.explanation':
    'Z̃ matrisinin her sütununun bileşen bileşen toplamı.',
  'methods.fuzzyDematel.steps.normalization-constant.name': 'Normalleştirme sabiti s',
  'methods.fuzzyDematel.steps.normalization-constant.explanation':
    '{normalization, select, max-row-sum {Satır toplamlarının en büyük üst bileşeni.} other {Satır ve sütun toplamlarının en büyük üst bileşenlerinin büyüğü.}} Üst bileşenler en büyük olanlardır; bu yüzden s’ye bölmek üç matrisi de yakınsak tutar.',
  'methods.fuzzyDematel.steps.normalized-matrix.name': 'Bulanık normalleştirilmiş matris X̃',
  'methods.fuzzyDematel.steps.normalized-matrix.explanation':
    'Z̃’nin her bileşeninin s’ye bölünmüşü. Bundan sonra l, m ve u matrisleri ayrı ayrı işlenir.',
  'methods.fuzzyDematel.steps.inverse.name': 'Bileşen başına ters matris (I − X)⁻¹',
  'methods.fuzzyDematel.steps.inverse.explanation':
    'Birim matrisden X çıkarılarak elde edilen matrisin tersi; l matrisi, m matrisi ve u matrisi için ayrı ayrı hesaplanır ve bulanık sayı olarak birleştirilir.',
  'methods.fuzzyDematel.steps.total-relation.name': 'Bulanık toplam ilişki matrisi T̃',
  'methods.fuzzyDematel.steps.total-relation.explanation':
    'T = X (I − X)⁻¹ işlemi l, m ve u matrisleri için ayrı ayrı yapılır: T_l = X_l (I − X_l)⁻¹, m ve u için de aynı.',
  'methods.fuzzyDematel.steps.influence.name': 'Bulanık gönderilen ve alınan etki',
  'methods.fuzzyDematel.steps.influence.explanation':
    'D̃, T̃ matrisinin her satırının; R̃ her sütununun bileşen bileşen toplamıdır.',
  'methods.fuzzyDematel.steps.fuzzy-prominence-relation.name': 'Bulanık öne çıkma ve ilişki',
  'methods.fuzzyDematel.steps.fuzzy-prominence-relation.explanation':
    'D̃ + R̃ ve D̃ − R̃, bulanık toplama ve çıkarma ile.',
  'methods.fuzzyDematel.steps.defuzzified-total-relation.name': 'Kesin toplam ilişki matrisi',
  'methods.fuzzyDematel.steps.defuzzified-total-relation.explanation':
    'T̃ matrisinin her bulanık girdisi {defuzzification, select, centroid {ağırlık merkezi (l + m + u) / 3} graded-mean {dereceli ortalama (l + 4m + u) / 6} cfcs {CFCS yöntemi} other {seçilen formül}} ile durulaştırılır. Neden-sonuç haritasının eşiğini belirler.',
  'methods.fuzzyDematel.steps.prominence-relation.name': 'Kesin öne çıkma ve ilişki',
  'methods.fuzzyDematel.steps.prominence-relation.explanation':
    'D̃ + R̃ ve D̃ − R̃, {defuzzification, select, centroid {ağırlık merkezi (l + m + u) / 3} graded-mean {dereceli ortalama (l + 4m + u) / 6} cfcs {CFCS yöntemi, her sütun kendi başına} other {seçilen formül}} ile durulaştırılır. Ağırlıklar ve neden ile sonuç grupları bu değerlerden gelir.',

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
  'validation.lopcow.zero-percentage-values':
    'Bütün yüzde değerleri PV_j 0, bu yüzden ağırlıklar hesaplanamaz.',
  'validation.fucom.ranking-violated':
    '{value, number} önceliği sıralamayla çelişiyor. Kriterleri en önemliden en az önemliye sıralayın: karşılaştırmalı öncelikler en az 1 olmalı, önem değerleri azalmamalıdır.',
  'validation.fucom.unknown-priority-kind':
    'Öncelikler önem değerleri ya da karşılaştırmalı öncelikler olarak verilmelidir, "{kind}" olarak değil.',
  'validation.bwm.unknown-criterion': '"{id}" kriterlerden biri değil.',
  'validation.bwm.best-is-worst': '"{id}" kriteri hem en iyi hem en kötü olamaz.',
  'validation.bwm.out-of-scale':
    '{value, number} karşılaştırması {min, number} ile {max, number} arasındaki ölçeğin dışında.',
  'validation.bwm.self-comparison':
    '"{id}" kriterinin kendisiyle karşılaştırması {value, number} değil, 1 olmalıdır.',
  'validation.bwm.best-worst-mismatch':
    'En iyi kriterin en kötüye tercihi, en iyiden diğerlerine vektöründe {bestToWorst, number}, diğerlerinden en kötüye vektöründe {worstFromBest, number}. İkisi aynı değer olmalıdır.',
  'validation.bwm.best-not-preferred':
    'En iyi kriter en kötüye tercih edilmelidir (1’den büyük bir değer). İkisi eşit önemdeyse tüm kriterler eşit önemdedir.',
  'validation.bwm.ordinal-inconsistency':
    'Vektörler "{first}" ve "{second}" konusunda çelişiyor: en iyiden diğerlerine vektörü "{second}" kriterini, diğerlerinden en kötüye vektörü "{first}" kriterini daha önemli görüyor. Ağırlıklar yine hesaplanabilir, ancak tutarlılık düşük olacaktır.',
  'validation.bwm.threshold-unavailable':
    'Tutarlılık eşiği en çok {max, number} kriter için tanımlıdır, burada {count, number} kriter var. Ağırlıklar hesaplanır, ancak karşılaştırmaların kabul edilebilir olup olmadığı değerlendirilemez.',
  'validation.dematel.relation-shape':
    '{expert, number}. uzmanın matrisinde her faktör için bir satır ve bir sütun olmak üzere {order, number} satır ve {order, number} sütun bulunmalıdır.',
  'validation.dematel.non-zero-diagonal':
    '"{id}" faktörü kendi üzerinde etkili olarak değerlendirilmiş ({expert, number}. uzman). Formül izin verdiği için değer korunur. Kendi üzerine etki kastedilmiyorsa 0 yapın.',
  'validation.dematel.zero-matrix':
    'Tüm etkiler 0 olduğu için matris normalleştirilemez. En az bir ilişkiyi 0’dan büyük değerlendirin.',
  'validation.dematel.near-singular':
    'Toplam etki hesaplanamıyor: dolaylı etkiler sönmüyor (örneğin her faktör en büyük faktör kadar etki gönderiyor), bu yüzden I − X matrisi tersine çevrilemiyor (koşul sayısı {condition, number}). Bazı değerlendirmeleri düşürün veya normalleştirme sabiti olarak satır ve sütun toplamlarının büyüğünü kullanın.',
};
