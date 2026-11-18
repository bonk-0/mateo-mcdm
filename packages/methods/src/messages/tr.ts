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

  // ------------------------------------------------------------ COPRAS, MOORA, ARAS and their fuzzy variants (P2.5)
  'methods.copras.name': 'COPRAS',
  'methods.copras.rows.columnSum': 'Sütun toplamı',
  'methods.copras.columns.sPlus': 'Toplam S⁺ (fayda)',
  'methods.copras.columns.sMinus': 'Toplam S⁻ (maliyet)',
  'methods.copras.columns.Q': 'Göreli önem Q',
  'methods.copras.columns.N': 'Fayda derecesi N (%)',
  'methods.copras.columns.rank': 'Sıra',
  'methods.copras.steps.initial-matrix.name': 'Başlangıç karar matrisi',
  'methods.copras.steps.initial-matrix.explanation':
    'Her alternatifin her kriterdeki performansı, girildiği gibi.',
  'methods.copras.steps.weights.name': 'Kriter ağırlıkları',
  'methods.copras.steps.weights.explanation':
    'Her kriterin önemi, girildiği gibi. Tüm ağırlıkları aynı çarpanla çarpmak Q değerini değiştirir, ancak fayda derecelerini ve sıralamayı değiştirmez.',
  'methods.copras.steps.column-sums.name': 'Sütun toplamları',
  'methods.copras.steps.column-sums.explanation':
    'Her kriterin değerlerinin tüm alternatifler üzerindeki toplamı. COPRAS, her kriterin ağırlığını alternatifler arasında değerleriyle orantılı olarak paylaştırır.',
  'methods.copras.steps.weighted-normalized-matrix.name': 'Ağırlıklı normalize matris',
  'methods.copras.steps.weighted-normalized-matrix.explanation':
    'Her değer sütun toplamına bölünür ve kriterinin ağırlığıyla çarpılır. Bu işlem fayda ve maliyet kriterleri için aynıdır; kriter yönü bir sonraki adımda devreye girer.',
  'methods.copras.steps.sums.name': 'Toplamlar S⁺ ve S⁻',
  'methods.copras.steps.sums.explanation':
    'S⁺ fayda kriterlerinin ağırlıklı değerlerini (fazlası iyi), S⁻ maliyet kriterlerinin ağırlıklı değerlerini (azı iyi) toplar.',
  'methods.copras.steps.relative-significance.name': 'Göreli önem Q',
  'methods.copras.steps.relative-significance.explanation':
    'S⁺ artı küçük S⁻ için bir ödül: tüm S⁻ değerlerinin toplamı, alternatifin kendi S⁻ değerine ve tüm 1 / S⁻ değerlerinin toplamına bölünür. Maliyet kriteri yoksa Q doğrudan S⁺ olur. Yüksek değer daha iyidir.',
  'methods.copras.steps.utility-degree.name': 'Fayda derecesi N',
  'methods.copras.steps.utility-degree.explanation':
    'Q değerinin en iyi alternatifin Q değerine yüzdesi; en iyi alternatifin N değeri 100’dür.',
  'methods.copras.steps.ranking.name': 'Sıralama',
  'methods.copras.steps.ranking.explanation':
    'Alternatifler fayda derecesine göre, en yüksekten başlayarak sıralanır. Eşit değerler aynı sırayı paylaşır.',
  'methods.fuzzyCopras.name': 'Bulanık COPRAS',
  'methods.fuzzyCopras.parameters.defuzzification.label': 'Durulaştırma',
  'methods.fuzzyCopras.parameters.defuzzification.description':
    'Kesin COPRAS çalışmadan önce her bulanık değerlendirmenin ve ağırlığın kesin sayıya nasıl çevrileceği. Kaynak makale ağırlık merkezini kullanır.',
  'methods.fuzzyCopras.parameters.defuzzification.centroid': 'Ağırlık merkezi (l + m + u) / 3',
  'methods.fuzzyCopras.parameters.defuzzification.gradedMean':
    'Derecelendirilmiş ortalama (l + 4m + u) / 6',
  'methods.fuzzyCopras.steps.initial-matrix.name': 'Başlangıç bulanık karar matrisi',
  'methods.fuzzyCopras.steps.initial-matrix.explanation':
    'Her alternatifin her kriterdeki değerlendirmesi, girildiği gibi üçgen bulanık sayı (l, m, u) olarak.',
  'methods.fuzzyCopras.steps.weights.name': 'Kriter ağırlıkları',
  'methods.fuzzyCopras.steps.weights.explanation':
    'Her kriterin önemi, girildiği gibi: üçgen bulanık sayılar ya da kesin sayılar.',
  'methods.fuzzyCopras.steps.defuzzified-matrix.name': '1. adım: durulaştırılmış matris',
  'methods.fuzzyCopras.steps.defuzzified-matrix.explanation':
    'Bulanık COPRAS önce her bulanık değerlendirmeyi tek bir kesin sayıyla değiştirir. Bundan sonrası olağan COPRAS hesabıdır.',
  'methods.fuzzyCopras.steps.defuzzified-weights.name': '1. adım: durulaştırılmış ağırlıklar',
  'methods.fuzzyCopras.steps.defuzzified-weights.explanation':
    'Bulanık ağırlıklar aynı yolla kesin sayılarla değiştirilir. Kesin ağırlıklar olduğu gibi kullanılır.',
  'methods.moora.name': 'MOORA',
  'methods.moora.rows.norm': 'Sütun normu',
  'methods.moora.rows.referencePoint': 'Referans noktası (r)',
  'methods.moora.columns.yPlus': 'Enbüyüklenen hedeflerin toplamı y⁺',
  'methods.moora.columns.yMinus': 'Enküçüklenen hedeflerin toplamı y⁻',
  'methods.moora.columns.y': 'Oran sistemi y',
  'methods.moora.columns.maxDeviation': 'En büyük sapma',
  'methods.moora.columns.rank': 'Sıra',
  'methods.moora.parameters.rankBy.label': 'Raporlanan sıralama',
  'methods.moora.parameters.rankBy.description':
    'MOORA’nın iki yaklaşımı vardır. İkisi de hesaplanır ve adımlarda gösterilir; bu seçenek sonuç olarak hangisinin raporlanacağını belirler. Oran sistemi en yüksek y değerine, referans noktası en küçük en büyük sapmaya göre sıralar.',
  'methods.moora.parameters.rankBy.ratioSystem': 'Oran sistemi (en yüksek y)',
  'methods.moora.parameters.rankBy.referencePoint': 'Referans noktası (en küçük en büyük sapma)',
  'methods.moora.steps.initial-matrix.name': 'Başlangıç karar matrisi',
  'methods.moora.steps.initial-matrix.explanation':
    'Her alternatifin her hedefteki performansı, girildiği gibi.',
  'methods.moora.steps.weights.name': 'Hedef ağırlıkları',
  'methods.moora.steps.weights.explanation':
    'Her hedefin önemi, girildiği gibi. Özgün yöntemde ağırlık yoktur; ağırlık girilmezse her hedef eşit sayılır.',
  'methods.moora.steps.norms.name': 'Sütun normları',
  'methods.moora.steps.norms.explanation':
    'Her hedefin değerlerinin karelerinin toplamının karekökü. Farklı birimli hedefleri ortak bir ölçeğe getirir.',
  'methods.moora.steps.normalized-matrix.name': 'Normalize matris',
  'methods.moora.steps.normalized-matrix.explanation':
    'Her değer sütununun normuna bölünür (vektör normalizasyonu).',
  'methods.moora.steps.weighted-matrix.name': 'Ağırlıklı normalize matris',
  'methods.moora.steps.weighted-matrix.explanation':
    'Her normalize değer hedefinin ağırlığıyla çarpılır.',
  'methods.moora.steps.ratio-sums.name': 'Enbüyüklenen ve enküçüklenen hedeflerin toplamları',
  'methods.moora.steps.ratio-sums.explanation':
    'Her alternatif için, enbüyüklenecek hedeflerdeki ve enküçüklenecek hedeflerdeki (ağırlıklı) normalize değerlerinin toplamları.',
  'methods.moora.steps.ratio-system.name': 'Oran sistemi y',
  'methods.moora.steps.ratio-system.explanation':
    'Enbüyüklenen hedeflerin toplamından enküçüklenen hedeflerin toplamı çıkarılır. Yüksek değer daha iyidir.',
  'methods.moora.steps.ratio-system-ranking.name': 'Oran sistemine göre sıralama',
  'methods.moora.steps.ratio-system-ranking.explanation':
    'Alternatifler y değerine göre, en yüksekten başlayarak sıralanır. Eşit değerler aynı sırayı paylaşır.',
  'methods.moora.steps.reference-point.name': 'Referans noktası',
  'methods.moora.steps.reference-point.explanation':
    'Her hedefin en iyi değeri, hangi alternatifte olursa olsun: enbüyüklenen hedefler için en büyük, enküçüklenenler için en küçük değer.',
  'methods.moora.steps.deviations.name': 'Referans noktasından sapmalar',
  'methods.moora.steps.deviations.explanation':
    'Her değerin hedefinin referans noktasından uzaklığı. 0 sapma, alternatifin o hedefte en iyi olduğu anlamına gelir.',
  'methods.moora.steps.max-deviation.name': 'En büyük sapma',
  'methods.moora.steps.max-deviation.explanation':
    'Her alternatifin tüm hedefler üzerindeki en büyük sapması (Chebyshev ölçütü). Küçük değer daha iyidir.',
  'methods.moora.steps.reference-point-ranking.name': 'Referans noktasına göre sıralama',
  'methods.moora.steps.reference-point-ranking.explanation':
    'Alternatifler en büyük sapmaya göre, en küçüğünden başlayarak sıralanır. Eşit değerler aynı sırayı paylaşır.',
  'methods.fuzzyMoora.name': 'Bulanık MOORA',
  'methods.fuzzyMoora.columns.yPlus': 'Enbüyüklenen hedeflerin toplamı ỹ⁺',
  'methods.fuzzyMoora.columns.yMinus': 'Enküçüklenen hedeflerin toplamı ỹ⁻',
  'methods.fuzzyMoora.columns.yFuzzy': 'Bulanık oran sistemi ỹ',
  'methods.fuzzyMoora.parameters.defuzzification.label': 'Durulaştırma',
  'methods.fuzzyMoora.parameters.defuzzification.description':
    'Sıralama için bulanık oran sistemi ỹ’nin kesin sayıya nasıl çevrileceği. Kaynak makale ağırlık merkezini (en iyi bulanık olmayan performans, BNP) kullanır.',
  'methods.fuzzyMoora.parameters.defuzzification.centroid': 'Ağırlık merkezi (l + m + u) / 3',
  'methods.fuzzyMoora.parameters.defuzzification.gradedMean':
    'Derecelendirilmiş ortalama (l + 4m + u) / 6',
  'methods.fuzzyMoora.steps.initial-matrix.name': 'Başlangıç bulanık karar matrisi',
  'methods.fuzzyMoora.steps.initial-matrix.explanation':
    'Her alternatifin her hedefteki performansı, girildiği gibi üçgen bulanık sayı (l, m, u) olarak.',
  'methods.fuzzyMoora.steps.weights.name': 'Hedef ağırlıkları',
  'methods.fuzzyMoora.steps.weights.explanation':
    'Her hedefin önemi, girildiği gibi: üçgen bulanık sayılar ya da kesin sayılar. Ağırlık girilmezse her hedef eşit sayılır.',
  'methods.fuzzyMoora.steps.norms.name': 'Bulanık sütun normları',
  'methods.fuzzyMoora.steps.norms.explanation':
    'Bir hedefin üç bileşeninin (l, m, u) her birinin normu: tüm alternatifler üzerinden karelerinin toplamının karekökü.',
  'methods.fuzzyMoora.steps.normalized-matrix.name': 'Normalize bulanık matris',
  'methods.fuzzyMoora.steps.normalized-matrix.explanation':
    'Her bulanık değer sütununun bulanık normuna bölünür. Bulanık sayıya bölmek l değerini normun üst sınırına, u değerini alt sınırına böler; sonuç yine geçerli bir üçgen sayıdır.',
  'methods.fuzzyMoora.steps.weighted-matrix.name': 'Ağırlıklı normalize bulanık matris',
  'methods.fuzzyMoora.steps.weighted-matrix.explanation':
    'Her normalize bulanık değer hedefinin ağırlığıyla çarpılır.',
  'methods.fuzzyMoora.steps.ratio-sums.name':
    'Enbüyüklenen ve enküçüklenen hedeflerin bulanık toplamları',
  'methods.fuzzyMoora.steps.ratio-sums.explanation':
    'Her alternatif için, enbüyüklenecek hedeflerdeki ve enküçüklenecek hedeflerdeki normalize değerlerinin bulanık toplamları.',
  'methods.fuzzyMoora.steps.fuzzy-ratio-system.name': 'Bulanık oran sistemi ỹ',
  'methods.fuzzyMoora.steps.fuzzy-ratio-system.explanation':
    'Enbüyüklenen hedeflerin bulanık toplamından enküçüklenen hedeflerin bulanık toplamı çıkarılır. Bulanık sayıyı çıkarmak, l değerinden üst sınırını, u değerinden alt sınırını çıkarır.',
  'methods.fuzzyMoora.steps.ratio-system.name': 'Oran sistemi y (durulaştırılmış)',
  'methods.fuzzyMoora.steps.ratio-system.explanation':
    'Alternatiflerin sıralanabilmesi için bulanık oran sistemi kesin sayıya çevrilir. Yüksek değer daha iyidir.',
  'methods.fuzzyMoora.steps.reference-point.name': 'Bulanık referans noktası',
  'methods.fuzzyMoora.steps.reference-point.explanation':
    'Her hedefin en iyi bulanık değeri: enbüyüklenen hedefler için en büyük l, m ve u, enküçüklenenler için en küçük l, m ve u; her biri ayrı ayrı alınır.',
  'methods.fuzzyMoora.steps.deviations.name': 'Referans noktasından uzaklıklar',
  'methods.fuzzyMoora.steps.deviations.explanation':
    'Her bulanık değer ile hedefinin referans noktası arasındaki köşe uzaklığı: l, m ve u farklarının karesel ortalamasının karekökü. Kesin bir sayıdır.',
  'methods.aras.name': 'ARAS',
  'methods.aras.rows.optimal': 'Optimal alternatif (A0)',
  'methods.aras.rows.columnSum': 'Sütun toplamı',
  'methods.aras.columns.S': 'Optimallik fonksiyonu S_i',
  'methods.aras.columns.K': 'Fayda derecesi K_i',
  'methods.aras.columns.rank': 'Sıra',
  'methods.aras.steps.initial-matrix.name': 'Başlangıç karar matrisi',
  'methods.aras.steps.initial-matrix.explanation':
    'Her alternatifin her kriterdeki performansı, girildiği gibi.',
  'methods.aras.steps.weights.name': 'Kriter ağırlıkları',
  'methods.aras.steps.weights.explanation':
    'Her kriterin önemi, girildiği gibi. Tüm ağırlıkları aynı çarpanla çarpmak S değerini değiştirir, ancak fayda derecelerini ve sıralamayı değiştirmez.',
  'methods.aras.steps.optimal-alternative.name': 'Optimal alternatif',
  'methods.aras.steps.optimal-alternative.explanation':
    'Her gerçek alternatifin karşılaştırıldığı hayali en iyi alternatif. Karar verici bunu girebilir; girilmezse her kriterin en iyi değerini alır: fayda kriterlerinde en büyük, maliyet kriterlerinde en küçük değer.',
  'methods.aras.steps.extended-matrix.name': 'Genişletilmiş matris',
  'methods.aras.steps.extended-matrix.explanation':
    'Optimal alternatif, karar matrisine ilk satır (0. satır) olarak eklenir.',
  'methods.aras.steps.column-sums.name': 'Sütun toplamları',
  'methods.aras.steps.column-sums.explanation':
    'Her sütunun optimal alternatif ve tüm alternatifler üzerindeki toplamı. Maliyet kriterlerinde, küçük maliyet daha iyi olduğundan ters değerlerin (1 / x) toplamıdır.',
  'methods.aras.steps.normalized-matrix.name': 'Normalize matris',
  'methods.aras.steps.normalized-matrix.explanation':
    'Fayda değerleri sütun toplamına bölünür. Maliyet değerleri önce ters çevrilir (1 / x), sonra ters değerlerin sütun toplamına bölünür.',
  'methods.aras.steps.weighted-matrix.name': 'Ağırlıklı normalize matris',
  'methods.aras.steps.weighted-matrix.explanation':
    'Her normalize değer kriterinin ağırlığıyla çarpılır.',
  'methods.aras.steps.sums.name': 'Optimallik fonksiyonu S_i',
  'methods.aras.steps.sums.explanation':
    'Optimal alternatif dahil, ağırlıklı matrisin her satırının toplamı. Büyük S, daha iyi alternatif demektir.',
  'methods.aras.steps.utility-degree.name': 'Fayda derecesi K_i',
  'methods.aras.steps.utility-degree.explanation':
    'Her S değeri optimal alternatifin S değerine bölünür: alternatifin optimuma ne kadar yakın olduğunu gösterir. Optimal alternatifin kendisi için K = 1’dir; 1’in üzerindeki bir alternatif girilen optimumu geçmiştir.',
  'methods.aras.steps.ranking.name': 'Sıralama',
  'methods.aras.steps.ranking.explanation':
    'Alternatifler fayda derecesine göre, en yüksekten başlayarak sıralanır. Eşit değerler aynı sırayı paylaşır.',
  'methods.fuzzyAras.name': 'ARAS-F (bulanık ARAS)',
  'methods.fuzzyAras.rows.optimal': 'Optimal alternatif (A0)',
  'methods.fuzzyAras.rows.columnSum': 'Sütun toplamı',
  'methods.fuzzyAras.columns.SFuzzy': 'Bulanık toplam S̃_i',
  'methods.fuzzyAras.columns.S': 'Optimallik fonksiyonu S_i',
  'methods.fuzzyAras.columns.K': 'Fayda derecesi K_i',
  'methods.fuzzyAras.columns.rank': 'Sıra',
  'methods.fuzzyAras.parameters.defuzzification.label': 'Durulaştırma',
  'methods.fuzzyAras.parameters.defuzzification.description':
    'Fayda dereceleri hesaplanmadan önce bulanık toplamlar S̃_i’nin kesin sayıya nasıl çevrileceği.',
  'methods.fuzzyAras.parameters.defuzzification.centroid': 'Ağırlık merkezi (l + m + u) / 3',
  'methods.fuzzyAras.parameters.defuzzification.gradedMean':
    'Derecelendirilmiş ortalama (l + 4m + u) / 6',
  'methods.fuzzyAras.steps.initial-matrix.name': 'Başlangıç bulanık karar matrisi',
  'methods.fuzzyAras.steps.initial-matrix.explanation':
    'Her alternatifin her kriterdeki performansı, girildiği gibi üçgen bulanık sayı (l, m, u) olarak.',
  'methods.fuzzyAras.steps.weights.name': 'Kriter ağırlıkları',
  'methods.fuzzyAras.steps.weights.explanation':
    'Her kriterin önemi, girildiği gibi: üçgen bulanık sayılar ya da kesin sayılar.',
  'methods.fuzzyAras.steps.optimal-alternative.name': 'Optimal alternatif',
  'methods.fuzzyAras.steps.optimal-alternative.explanation':
    'Her gerçek alternatifin karşılaştırıldığı hayali en iyi alternatif. Karar verici bunu girebilir; girilmezse her kriterin en iyi bulanık değerini alır: fayda kriterlerinde en büyük, maliyet kriterlerinde en küçük l, m ve u; her biri ayrı ayrı alınır.',
  'methods.fuzzyAras.steps.extended-matrix.name': 'Genişletilmiş bulanık matris',
  'methods.fuzzyAras.steps.extended-matrix.explanation':
    'Optimal alternatif, karar matrisine ilk satır (0. satır) olarak eklenir.',
  'methods.fuzzyAras.steps.inverted-matrix.name': 'Maliyet kriterleri ters çevrilmiş matris',
  'methods.fuzzyAras.steps.inverted-matrix.explanation':
    'Maliyet kriterleri ters çevrilir (1 bölü bulanık değer); böylece küçük maliyet büyük bir sayıya dönüşür. Fayda kriterleri olduğu gibi kalır.',
  'methods.fuzzyAras.steps.column-sums.name': 'Bulanık sütun toplamları',
  'methods.fuzzyAras.steps.column-sums.explanation':
    'Her sütunun optimal alternatif ve tüm alternatifler üzerindeki bulanık toplamı.',
  'methods.fuzzyAras.steps.normalized-matrix.name': 'Normalize bulanık matris',
  'methods.fuzzyAras.steps.normalized-matrix.explanation':
    'Her bulanık değer sütununun bulanık toplamına bölünür. Bulanık sayıya bölmek l değerini toplamın üst sınırına, u değerini alt sınırına böler.',
  'methods.fuzzyAras.steps.weighted-matrix.name': 'Ağırlıklı normalize bulanık matris',
  'methods.fuzzyAras.steps.weighted-matrix.explanation':
    'Her normalize bulanık değer kriterinin ağırlığıyla çarpılır.',
  'methods.fuzzyAras.steps.fuzzy-sums.name': 'Bulanık optimallik fonksiyonu S̃_i',
  'methods.fuzzyAras.steps.fuzzy-sums.explanation':
    'Optimal alternatif dahil, ağırlıklı matrisin her satırının bulanık toplamı.',
  'methods.fuzzyAras.steps.sums.name': 'Optimallik fonksiyonu S_i (durulaştırılmış)',
  'methods.fuzzyAras.steps.sums.explanation':
    'Fayda derecelerinin hesaplanabilmesi için bulanık toplamlar kesin sayıya çevrilir.',
  'methods.fuzzyAras.steps.utility-degree.name': 'Fayda derecesi K_i',
  'methods.fuzzyAras.steps.utility-degree.explanation':
    'Her S değeri optimal alternatifin S değerine bölünür: alternatifin optimuma ne kadar yakın olduğunu gösterir. Optimal alternatifin kendisi için K = 1’dir; 1’in üzerindeki bir alternatif girilen optimumu geçmiştir.',
  'methods.fuzzyAras.steps.ranking.name': 'Sıralama',
  'methods.fuzzyAras.steps.ranking.explanation':
    'Alternatifler fayda derecesine göre, en yüksekten başlayarak sıralanır. Eşit değerler aynı sırayı paylaşır.',

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
  'validation.copras.zero-column-sum':
    '"{id}" kriterinin tüm değerleri 0. COPRAS her değeri sütun toplamına böler; bu yüzden bir kriter her yerde 0 olamaz. Kriteri kaldırın ya da değerlerini girin.',
  'validation.copras.zero-cost-sum':
    'Bu alternatifin ağırlıklı maliyet değerlerinin toplamı 0 (tüm maliyet değerleri 0 ya da maliyet kriterlerinin ağırlığı 0). COPRAS bu toplama böldüğü için alternatif değerlendirilemez.',
  'validation.fuzzy-copras.unsupported-weights':
    'Ağırlıklar "{numberType}" sayı türünü kullanıyor. Bulanık COPRAS üçgen bulanık ya da kesin ağırlıkları kabul eder.',
  'validation.moora.zero-column-norm':
    '"{id}" hedefinin tüm değerleri 0; normu 0 olduğundan MOORA onu normalize edemez. Hedefi kaldırın ya da değerlerini girin.',
  'validation.fuzzy-moora.unsupported-weights':
    'Ağırlıklar "{numberType}" sayı türünü kullanıyor. Bulanık MOORA üçgen bulanık ya da kesin ağırlıkları kabul eder.',
  'validation.fuzzy-moora.zero-column-norm':
    '"{id}" hedefinin alt değeri l, her alternatifte 0. Bulanık normalizasyon üst değerleri alt değerlerin normuna böler; bu norm burada 0. En az bir alternatife 0’dan büyük bir alt değer verin.',
  'validation.aras.reserved-alternative-id':
    '"{id}" alternatif kimliği ARAS’ın optimal alternatifi için ayrılmıştır.',
  'validation.aras.optimal-mismatch':
    'Optimal alternatifin her kriter için tam olarak bir değeri olmalıdır. "{id}" kriterini kontrol edin: eksik, tekrarlı ya da bilinmiyor.',
  'validation.aras.invalid-optimal-value':
    '"{id}" kriterinin optimal değeri negatif olmayan, sonlu bir sayı olmalıdır.',
  'validation.aras.zero-cost-value':
    '"{id}" maliyet kriterinin bir değeri 0. ARAS maliyet kriterlerinin değerlerini ters çevirir (1 / x); bu yüzden sıfırdan büyük olmalıdır.',
  'validation.aras.zero-benefit-sum':
    '"{id}" fayda kriterinin optimal değer dahil tüm değerleri 0. ARAS sütun toplamına böler; bu yüzden kriter her yerde 0 olamaz.',
  'validation.aras.zero-optimal-sum':
    'Optimal alternatifin optimallik fonksiyonu S 0 olduğundan fayda dereceleri K = S / S₀ hesaplanamaz. Optimal alternatife, ağırlığı olan bir kriterde 0’dan büyük bir değer verin.',
  'validation.aras.optimal-worse-than-alternative':
    '"{id}" kriterinin optimal değeri en iyi alternatiften daha kötü. Hesap sürer ve bir alternatifin fayda derecesi 1’in üzerinde çıkabilir.',
  'validation.fuzzy-aras.unsupported-weights':
    'Ağırlıklar "{numberType}" sayı türünü kullanıyor. ARAS-F üçgen bulanık ya da kesin ağırlıkları kabul eder.',
  'validation.fuzzy-aras.zero-cost-value':
    '"{id}" maliyet kriterinin bir değerinin alt değeri l = 0. ARAS-F maliyet değerlerini ters çevirir (1 / x̃); bu yüzden l sıfırdan büyük olmalıdır.',
  'validation.fuzzy-aras.zero-benefit-lower-sum':
    '"{id}" fayda kriterinin alt değeri l, optimal değer dahil her alternatifte 0. Bulanık normalizasyon üst değerleri alt değerlerin toplamına böler; bu toplam burada 0. En az bir alternatife 0’dan büyük bir alt değer verin.',
  'validation.fuzzy-aras.zero-optimal-sum':
    'Optimal alternatifin bulanık optimallik fonksiyonu S̃ 0 olduğundan fayda dereceleri K = S / S₀ hesaplanamaz. Optimal alternatife, ağırlığı olan bir kriterde 0’dan büyük bir değer verin.',
};
