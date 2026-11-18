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
  // ------------------------------------------------------------ VIKOR
  'methods.vikor.name': 'VIKOR',
  'methods.vikor.rows.best': 'En iyi değer f*',
  'methods.vikor.rows.worst': 'En kötü değer f⁻',
  'methods.vikor.columns.S': 'Grup faydası S_i',
  'methods.vikor.columns.R': 'Bireysel pişmanlık R_i',
  'methods.vikor.columns.extremeBest': 'En iyi (en küçük)',
  'methods.vikor.columns.extremeWorst': 'En kötü (en büyük)',
  'methods.vikor.columns.sHat': 'Normalize S',
  'methods.vikor.columns.rHat': 'Normalize R',
  'methods.vikor.columns.Q': 'Uzlaşı indeksi Q_i',
  'methods.vikor.columns.rankS': 'S sırası',
  'methods.vikor.columns.rankR': 'R sırası',
  'methods.vikor.columns.QDifference': 'Q_i − Q(A(1))',
  'methods.vikor.columns.rank': 'Q sırası',
  'methods.vikor.conditions.noRange': 'kriterde tüm alternatiflerin değeri aynıysa',
  'methods.vikor.conditions.noSpread': 'tüm alternatiflerin S değeri (veya R değeri) aynıysa',
  'methods.vikor.parameters.vRule.label': 'Strateji ağırlığı kuralı',
  'methods.vikor.parameters.vRule.description':
    'Azami grup faydası stratejisinin ağırlığı v nasıl belirlenir: aşağıda verilen değer ya da Opricovic ve Tzeng (2008) kuralı (n + 1) / (2n); burada n kriter sayısıdır.',
  'methods.vikor.parameters.vRule.fixed': 'Aşağıda verilen v değeri',
  'methods.vikor.parameters.vRule.opricovicTzeng2008': '(n + 1) / (2n), Opricovic ve Tzeng 2008',
  'methods.vikor.parameters.v.label': 'Strateji ağırlığı v',
  'methods.vikor.parameters.v.description':
    'Q içinde grup faydası S için verilen ağırlık; bireysel pişmanlık R için 1 − v kullanılır. 0,5 klasik seçimdir (uzlaşı). Yukarıdaki kural (n + 1) / (2n) ise dikkate alınmaz.',
  'methods.vikor.parameters.normalizeWeights.label': 'Ağırlıkları normalize et',
  'methods.vikor.parameters.normalizeWeights.description':
    'Her ağırlığı kullanmadan önce ağırlıkların toplamına böl, kaynakta olduğu gibi. Q ve sıralama değişmez; S ve R ağırlıklarla birlikte ölçeklenir.',
  'methods.vikor.steps.initial-matrix.name': 'Başlangıç karar matrisi',
  'methods.vikor.steps.initial-matrix.explanation':
    'Her alternatifin her kriterdeki performansı, girildiği gibi.',
  'methods.vikor.steps.weights.name': 'Kriter ağırlıkları',
  'methods.vikor.steps.weights.explanation': 'Her kriterin önemi, girildiği gibi.',
  'methods.vikor.steps.normalized-weights.name': 'Normalize edilmiş ağırlıklar',
  'methods.vikor.steps.normalized-weights.explanation':
    'Her ağırlık, ağırlıkların toplamı 1 olacak şekilde tüm ağırlıkların toplamına bölünür.',
  'methods.vikor.steps.best-worst-values.name': 'En iyi ve en kötü değerler',
  'methods.vikor.steps.best-worst-values.explanation':
    'Her kriter için en iyi değer f* ve en kötü değer f⁻. Fayda kriterinde en iyi değer en büyük, maliyet kriterinde en küçük değerdir.',
  'methods.vikor.steps.weighted-distances.name': 'En iyi değerden ağırlıklı uzaklıklar',
  'methods.vikor.steps.weighted-distances.explanation':
    'Her alternatifin her kriterde en iyi değerden uzaklığı; kriterin değişim aralığına oranlanır ve ağırlıkla çarpılır. 0 en iyi değerdir; en büyük uzaklık ağırlığın kendisidir. Değişim aralığı olmayan kriter 0 sayılır.',
  'methods.vikor.steps.group-utility.name': 'Grup faydası S_i',
  'methods.vikor.steps.group-utility.explanation':
    'Bir alternatifin ağırlıklı uzaklıklarının toplamı: en iyi değerlerden genel olarak ne kadar uzak olduğu. Küçük değer daha iyidir.',
  'methods.vikor.steps.individual-regret.name': 'Bireysel pişmanlık R_i',
  'methods.vikor.steps.individual-regret.explanation':
    'Bir alternatifin en büyük ağırlıklı uzaklığı: en kötü tekil kriteri. Küçük değer daha iyidir.',
  'methods.vikor.steps.extremes.name': 'En iyi ve en kötü S ve R',
  'methods.vikor.steps.extremes.explanation':
    'Tüm alternatifler üzerinde grup faydasının ve bireysel pişmanlığın en küçük (S*, R*) ve en büyük (S⁻, R⁻) değeri.',
  'methods.vikor.steps.normalized-measures.name': 'Normalize S ve R',
  'methods.vikor.steps.normalized-measures.explanation':
    'S ve R, en iyi ve en kötü değerleri arasında [0, 1] aralığına ölçeklenir. Tüm alternatiflerin S (veya R) değeri aynıysa normalize değer 0 olur.',
  'methods.vikor.steps.strategy-weight.name': 'Strateji ağırlığı v',
  'methods.vikor.steps.strategy-weight.explanation':
    '{vRule, select, fixed {Grup faydasının ağırlığı, parametrelerde belirlendiği gibi.} opricovic-tzeng-2008 {Grup faydasının ağırlığı; n kriter için (n + 1) / (2n), Opricovic ve Tzeng (2008) kuralı.} other {Grup faydasının ağırlığı.}}',
  'methods.vikor.steps.compromise-index.name': 'Uzlaşı indeksi Q_i',
  'methods.vikor.steps.compromise-index.explanation':
    'Q, normalize grup faydasını (ağırlık v) ve normalize bireysel pişmanlığı (ağırlık 1 − v) birleştirir. Küçük değer daha iyidir; 0 her ikisinde de en iyi demektir.',
  'methods.vikor.steps.component-rankings.name': 'S ve R sıralamaları',
  'methods.vikor.steps.component-rankings.explanation':
    'Alternatifler grup faydasına ve bireysel pişmanlığa göre, en küçük önce olacak şekilde sıralanır. Kabul edilebilir kararlılık koşulu, Q ile en iyi alternatifin burada da birinci olup olmadığını sorar.',
  'methods.vikor.steps.advantage-threshold.name': 'Kabul edilebilir üstünlük eşiği DQ',
  'methods.vikor.steps.advantage-threshold.explanation':
    'J alternatif için DQ = 1 / (J − 1): Q ile en iyi alternatifin tek başına kabul edilmesi için ikinciye karşı sahip olması gereken fark.',
  'methods.vikor.steps.q-differences.name': 'En iyi Q değerinden farklar',
  'methods.vikor.steps.q-differences.explanation':
    'Her alternatifin Q değerinden en küçük Q değeri çıkarılır. İkinci en küçük değer, en iyi alternatifin üstünlüğüdür; fark değeri DQ’nun altında kalan alternatifler, üstünlük yetersizse uzlaşı kümesine girer.',
  'methods.vikor.steps.ranking.name': 'Sıralama',
  'methods.vikor.steps.ranking.explanation':
    'Alternatifler uzlaşı indeksi Q’ya göre, en küçük önce olacak şekilde sıralanır. Eşit değerler aynı sırayı paylaşır. Uzlaşı çözümü (birden çok alternatif içerebilir) sonuçta yer alır.',
  // ------------------------------------------------------------ EDAS
  'methods.edas.name': 'EDAS',
  'methods.edas.rows.average': 'Ortalama çözüm AV_j',
  'methods.edas.columns.SP': 'Ağırlıklı pozitif toplam SP_i',
  'methods.edas.columns.SN': 'Ağırlıklı negatif toplam SN_i',
  'methods.edas.columns.NSP': 'Normalize NSP_i',
  'methods.edas.columns.NSN': 'Normalize NSN_i',
  'methods.edas.columns.AS': 'Değerlendirme skoru AS_i',
  'methods.edas.columns.rank': 'Sıra',
  'methods.edas.steps.initial-matrix.name': 'Başlangıç karar matrisi',
  'methods.edas.steps.initial-matrix.explanation':
    'Her alternatifin her kriterdeki performansı, girildiği gibi.',
  'methods.edas.steps.weights.name': 'Kriter ağırlıkları',
  'methods.edas.steps.weights.explanation': 'Her kriterin önemi, girildiği gibi.',
  'methods.edas.steps.average-solution.name': 'Ortalama çözüm',
  'methods.edas.steps.average-solution.explanation':
    'Her kriterin tüm alternatifler üzerindeki ortalaması. Her alternatif en iyi veya en kötü alternatifle değil, bu ortalamayla karşılaştırılır.',
  'methods.edas.steps.positive-distances.name': 'Ortalamadan pozitif uzaklık (PDA)',
  'methods.edas.steps.positive-distances.explanation':
    'Her alternatifin ortalamadan ne kadar daha iyi olduğu, ortalamaya oranlanarak. Fayda kriterinde ortalamanın üstündeki fazlalık, maliyet kriterinde altındaki eksiklik alınır. Daha iyi değilse 0.',
  'methods.edas.steps.negative-distances.name': 'Ortalamadan negatif uzaklık (NDA)',
  'methods.edas.steps.negative-distances.explanation':
    'Her alternatifin ortalamadan ne kadar daha kötü olduğu, ortalamaya oranlanarak. Fayda kriterinde ortalamanın altındaki eksiklik, maliyet kriterinde üstündeki fazlalık alınır. Daha kötü değilse 0.',
  'methods.edas.steps.weighted-positive-sums.name': 'Ağırlıklı pozitif toplamlar SP_i',
  'methods.edas.steps.weighted-positive-sums.explanation':
    'Bir alternatifin pozitif uzaklıkları kriter ağırlıklarıyla çarpılıp toplanır.',
  'methods.edas.steps.weighted-negative-sums.name': 'Ağırlıklı negatif toplamlar SN_i',
  'methods.edas.steps.weighted-negative-sums.explanation':
    'Bir alternatifin negatif uzaklıkları kriter ağırlıklarıyla çarpılıp toplanır.',
  'methods.edas.steps.normalized-positive-sums.name': 'Normalize pozitif toplamlar NSP_i',
  'methods.edas.steps.normalized-positive-sums.explanation':
    'Her SP, en büyük SP’ye bölünür; böylece pozitif uzaklığı en büyük olan alternatif 1 alır.',
  'methods.edas.steps.normalized-negative-sums.name': 'Normalize negatif toplamlar NSN_i',
  'methods.edas.steps.normalized-negative-sums.explanation':
    '1 eksi her SN’nin en büyük SN’ye bölümü; böylece negatif uzaklığı en az olan alternatif 1 alır.',
  'methods.edas.steps.appraisal-scores.name': 'Değerlendirme skorları AS_i',
  'methods.edas.steps.appraisal-scores.explanation':
    'Normalize pozitif ve negatif toplamların ortalaması. 0 ile 1 arasındadır; yüksek değer daha iyidir.',
  'methods.edas.steps.ranking.name': 'Sıralama',
  'methods.edas.steps.ranking.explanation':
    'Alternatifler değerlendirme skoruna göre, en yüksek önce olacak şekilde sıralanır. Eşit değerler aynı sırayı paylaşır.',
  // ------------------------------------------------------------ CODAS
  'methods.codas.name': 'CODAS',
  'methods.codas.rows.negativeIdeal': 'Negatif ideal çözüm ns_j',
  'methods.codas.columns.E': 'Öklid uzaklığı E_i',
  'methods.codas.columns.T': 'Manhattan uzaklığı T_i',
  'methods.codas.columns.H': 'Değerlendirme skoru H_i',
  'methods.codas.columns.rank': 'Sıra',
  'methods.codas.conditions.aboveThreshold': '|E_i − E_k| ≥ τ ise',
  'methods.codas.conditions.belowThreshold': '|E_i − E_k| < τ ise',
  'methods.codas.parameters.tau.label': 'Eşik τ',
  'methods.codas.parameters.tau.description':
    'Öklid uzaklıkları τ’dan az farklı olan iki alternatif yakın kabul edilir ve bu durumda Manhattan uzaklığı belirleyici olur. Yazarlar 0,01 ile 0,05 arasında bir değer önerir (örneklerinde 0,02). τ, ağırlıklardan oluşan uzaklıklarla karşılaştırılır; bu yüzden ancak toplamı 1 olan ağırlıklarla bu anlamı taşır.',
  'methods.codas.parameters.normalizeWeights.label': 'Ağırlıkları normalize et',
  'methods.codas.parameters.normalizeWeights.description':
    'Her ağırlığı kullanmadan önce ağırlıkların toplamına böl; böylece eşik τ, ağırlıkların ölçeği ne olursa olsun anlamını korur.',
  'methods.codas.steps.initial-matrix.name': 'Başlangıç karar matrisi',
  'methods.codas.steps.initial-matrix.explanation':
    'Her alternatifin her kriterdeki performansı, girildiği gibi.',
  'methods.codas.steps.weights.name': 'Kriter ağırlıkları',
  'methods.codas.steps.weights.explanation': 'Her kriterin önemi, girildiği gibi.',
  'methods.codas.steps.normalized-weights.name': 'Normalize edilmiş ağırlıklar',
  'methods.codas.steps.normalized-weights.explanation':
    'Her ağırlık, ağırlıkların toplamı 1 olacak şekilde tüm ağırlıkların toplamına bölünür.',
  'methods.codas.steps.normalized-matrix.name': 'Normalize matris',
  'methods.codas.steps.normalized-matrix.explanation':
    'Her değer kendi kriterinin en iyi değerine oranlanır: fayda kriterlerinde en büyüğüne bölünür, maliyet kriterlerinde en küçük değer ona bölünür. Bir kriterde en iyi alternatif 1 alır.',
  'methods.codas.steps.weighted-matrix.name': 'Ağırlıklı normalize matris',
  'methods.codas.steps.weighted-matrix.explanation':
    'Her normalize değer kendi kriterinin ağırlığıyla çarpılır.',
  'methods.codas.steps.negative-ideal.name': 'Negatif ideal çözüm',
  'methods.codas.steps.negative-ideal.explanation':
    'Her kriterin en küçük ağırlıklı değeri: CODAS’ın her alternatifi karşılaştırdığı en kötü performans.',
  'methods.codas.steps.deviations.name': 'Negatif ideal çözümden sapmalar',
  'methods.codas.steps.deviations.explanation':
    'Her ağırlıklı değer ile kendi kriterinin negatif ideal değeri arasındaki mutlak fark. İki uzaklığın da terimleridir.',
  'methods.codas.steps.distances.name': 'Öklid ve Manhattan uzaklıkları',
  'methods.codas.steps.distances.explanation':
    'Her alternatifin negatif ideal çözüme uzaklığı: Öklid uzaklığı (sapmaların kareleri toplamının karekökü) ve Manhattan uzaklığı (sapmaların toplamı). Büyük uzaklık daha iyidir.',
  'methods.codas.steps.threshold.name': 'Eşik τ',
  'methods.codas.steps.threshold.explanation': 'Eşik, parametrelerde belirlendiği gibi.',
  'methods.codas.steps.relative-assessment.name': 'Göreli değerlendirme matrisi',
  'methods.codas.steps.relative-assessment.explanation':
    'i alternatifinin (satır) k alternatifinden (sütun) ne kadar iyi olduğu: Öklid uzaklıklarının farkı; Öklid farkı en az τ ise buna Manhattan uzaklıklarının farkı da eklenir.',
  'methods.codas.steps.assessment-scores.name': 'Değerlendirme skorları H_i',
  'methods.codas.steps.assessment-scores.explanation':
    'Göreli değerlendirme matrisinin her satırının toplamı. Yüksek değer daha iyidir.',
  'methods.codas.steps.ranking.name': 'Sıralama',
  'methods.codas.steps.ranking.explanation':
    'Alternatifler değerlendirme skoruna göre, en yüksek önce olacak şekilde sıralanır. Eşit değerler aynı sırayı paylaşır.',
  // ------------------------------------------------------------ WASPAS
  'methods.waspas.name': 'WASPAS',
  'methods.waspas.columns.wsm': 'Ağırlıklı toplam Q1_i',
  'methods.waspas.columns.wpm': 'Ağırlıklı çarpım Q2_i',
  'methods.waspas.columns.wsmVariance': 'Q1_i varyansı',
  'methods.waspas.columns.wpmVariance': 'Q2_i varyansı',
  'methods.waspas.columns.lambda': 'En uygun λ_i',
  'methods.waspas.columns.Q': 'Birleşik ölçüt Q_i',
  'methods.waspas.columns.rank': 'Sıra',
  'methods.waspas.parameters.lambdaRule.label': 'λ kuralı',
  'methods.waspas.parameters.lambdaRule.description':
    'λ, birleşik ölçütte ağırlıklı toplamın payıdır; ağırlıklı çarpım 1 − λ alır. Sabit bir sayı, her alternatif için sonucun varyansını en küçük yapan değer (Zavadskas ve diğ. 2012) ya da iki skorun toplamlarından hesaplanan tek bir değer (WASPAS-F, Turskis ve diğ. 2015) olabilir.',
  'methods.waspas.parameters.lambdaRule.fixed': 'Sabit λ değeri',
  'methods.waspas.parameters.lambdaRule.optimal': 'Her alternatif için en uygun λ',
  'methods.waspas.parameters.lambdaRule.pooled': 'Birleşik λ (WASPAS-F)',
  'methods.waspas.parameters.lambda.label': 'λ değeri',
  'methods.waspas.parameters.lambda.description':
    'Kural sabit değer olduğunda kullanılır. 0,5 toplama ve çarpıma aynı ağırlığı verir; 1 yalnızca ağırlıklı toplam, 0 yalnızca ağırlıklı çarpımdır.',
  'methods.waspas.parameters.relativeError.label': 'Normalize değerlerin göreli hatası',
  'methods.waspas.parameters.relativeError.description':
    'En uygun λ tarafından kullanılır: her normalize değerin, kendisinin bu oranı kadar bir hatayla bilindiği varsayılır (0,05 yüzde 5 demektir). Yalnızca varyanslar arasındaki oran önemlidir, bu yüzden sonuç buna çok az bağlıdır.',
  'methods.waspas.parameters.normalizeWeights.label': 'Ağırlıkları normalize et',
  'methods.waspas.parameters.normalizeWeights.description':
    'Her ağırlığı kullanmadan önce ağırlıkların toplamına böl. WASPAS toplamı 1 olan ağırlıkları varsayar; bu seçenek kapalıyken toplamı 1 olmayan ağırlıklar uyarı verir.',
  'methods.waspas.steps.initial-matrix.name': 'Başlangıç karar matrisi',
  'methods.waspas.steps.initial-matrix.explanation':
    'Her alternatifin her kriterdeki performansı, girildiği gibi.',
  'methods.waspas.steps.weights.name': 'Kriter ağırlıkları',
  'methods.waspas.steps.weights.explanation': 'Her kriterin önemi, girildiği gibi.',
  'methods.waspas.steps.normalized-weights.name': 'Normalize edilmiş ağırlıklar',
  'methods.waspas.steps.normalized-weights.explanation':
    'Her ağırlık, ağırlıkların toplamı 1 olacak şekilde tüm ağırlıkların toplamına bölünür.',
  'methods.waspas.steps.normalized-matrix.name': 'Normalize matris',
  'methods.waspas.steps.normalized-matrix.explanation':
    'Her değer kendi kriterinin en iyi değerine oranlanır: fayda kriterlerinde en büyüğüne bölünür, maliyet kriterlerinde en küçük değer ona bölünür. Bir kriterde en iyi alternatif 1 alır.',
  'methods.waspas.steps.wsm-terms.name': 'Ağırlıklı toplam terimleri',
  'methods.waspas.steps.wsm-terms.explanation':
    'Her normalize değer kendi kriterinin ağırlığıyla çarpılır.',
  'methods.waspas.steps.wpm-terms.name': 'Ağırlıklı çarpım terimleri',
  'methods.waspas.steps.wpm-terms.explanation':
    'Her normalize değer kendi kriterinin ağırlığı kuvvetine yükseltilir.',
  'methods.waspas.steps.wsm.name': 'Ağırlıklı toplam modeli (WSM)',
  'methods.waspas.steps.wsm.explanation': 'Bir alternatifin ağırlıklı toplam terimlerinin toplamı.',
  'methods.waspas.steps.wpm.name': 'Ağırlıklı çarpım modeli (WPM)',
  'methods.waspas.steps.wpm.explanation': 'Bir alternatifin ağırlıklı çarpım terimlerinin çarpımı.',
  'methods.waspas.steps.normalized-variances.name': 'Normalize değerlerin varyansları',
  'methods.waspas.steps.normalized-variances.explanation':
    'Varsayılan göreli hata altında her normalize değerin varyansı: hata ile değerin çarpımının karesi.',
  'methods.waspas.steps.wsm-variance.name': 'Ağırlıklı toplamın varyansı',
  'methods.waspas.steps.wsm-variance.explanation':
    'Bir alternatifin normalize değerleri değiştiğinde ağırlıklı toplamının ne kadar değiştiği: ağırlıkların kareleri ile değerlerin varyanslarının çarpımlarının toplamı.',
  'methods.waspas.steps.wpm-variance.name': 'Ağırlıklı çarpımın varyansı',
  'methods.waspas.steps.wpm-variance.explanation':
    'Ağırlıklı çarpım için aynısı; çarpım bir değere, çarpımın kendisi ve ağırlıkla orantılı, değerle ters orantılı tepki verir.',
  'methods.waspas.steps.lambda.name': 'λ değeri',
  'methods.waspas.steps.lambda.explanation':
    '{lambdaRule, select, fixed {Ağırlıklı toplamın payı, parametrelerde belirlendiği gibi.} optimal {Her alternatif için birleşik ölçütünün varyansını en küçük yapan λ: çarpımın varyansının, iki varyansın toplamına bölümü.} pooled {Tüm alternatifler için tek bir λ: ağırlıklı çarpımların toplamının iki skorun toplamına bölümü (WASPAS-F).} other {Ağırlıklı toplamın payı.}}',
  'methods.waspas.steps.joint-criterion.name': 'Birleşik ölçüt Q_i',
  'methods.waspas.steps.joint-criterion.explanation':
    'λ çarpı ağırlıklı toplam artı 1 − λ çarpı ağırlıklı çarpım. Yüksek değer daha iyidir.',
  'methods.waspas.steps.ranking.name': 'Sıralama',
  'methods.waspas.steps.ranking.explanation':
    'Alternatifler birleşik ölçüte göre, en yüksek önce olacak şekilde sıralanır. Eşit değerler aynı sırayı paylaşır.',
  // ------------------------------------------------------------ Fuzzy WASPAS
  'methods.fuzzyWaspas.name': 'Bulanık WASPAS',
  'methods.fuzzyWaspas.columns.wsmSum': 'Bulanık toplam Q̃_i',
  'methods.fuzzyWaspas.columns.wpmProduct': 'Bulanık çarpım P̃_i',
  'methods.fuzzyWaspas.columns.Q': 'Ağırlıklı toplam Q_i',
  'methods.fuzzyWaspas.columns.P': 'Ağırlıklı çarpım P_i',
  'methods.fuzzyWaspas.columns.K': 'Birleşik ölçüt K_i',
  'methods.fuzzyWaspas.columns.rank': 'Sıra',
  'methods.fuzzyWaspas.parameters.lambdaRule.label': 'λ kuralı',
  'methods.fuzzyWaspas.parameters.lambdaRule.description':
    'λ, birleşik ölçütte ağırlıklı toplamın payıdır. Makale iki skorun toplamlarından hesaplanan tek bir birleşik değer kullanır; sabit bir sayı da seçilebilir. Alternatif başına en uygun λ kesin değerlerin varyanslarını gerektirir ve yalnızca WASPAS’ta bulunur.',
  'methods.fuzzyWaspas.parameters.defuzzification.label': 'Durulaştırma',
  'methods.fuzzyWaspas.parameters.defuzzification.description':
    'Her alternatifin bulanık toplamı ve bulanık çarpımı kesin sayıya nasıl çevrilir. Makale ağırlık merkezini kullanır.',
  'methods.fuzzyWaspas.parameters.defuzzification.centroid': 'Ağırlık merkezi (l + m + u) / 3',
  'methods.fuzzyWaspas.parameters.defuzzification.gradedMean':
    'Derecelendirilmiş ortalama (l + 4m + u) / 6',
  'methods.fuzzyWaspas.parameters.normalizeWeights.description':
    'Her kesin ağırlığı kullanmadan önce ağırlıkların toplamına böl. Bulanık ağırlıklar bu şekilde normalize edilemez.',
  'methods.fuzzyWaspas.steps.initial-matrix.name': 'Başlangıç karar matrisi',
  'methods.fuzzyWaspas.steps.initial-matrix.explanation':
    'Her alternatifin her kriterdeki üçgensel bulanık performansı, girildiği gibi.',
  'methods.fuzzyWaspas.steps.weights.name': 'Kriter ağırlıkları',
  'methods.fuzzyWaspas.steps.weights.explanation':
    'Her kriterin önemi, girildiği gibi: üçgensel bulanık sayılar ya da kesin sayılar.',
  'methods.fuzzyWaspas.steps.normalized-weights.name': 'Normalize edilmiş ağırlıklar',
  'methods.fuzzyWaspas.steps.normalized-weights.explanation':
    'Her ağırlık, ağırlıkların toplamı 1 olacak şekilde tüm ağırlıkların toplamına bölünür.',
  'methods.fuzzyWaspas.steps.fuzzy-weights.name': 'Ağırlıklar bulanık sayı olarak',
  'methods.fuzzyWaspas.steps.fuzzy-weights.explanation':
    'Kesin bir ağırlık w, bulanık değerlerle kullanılabilmesi için (w, w, w) üçgensel bulanık sayısıdır.',
  'methods.fuzzyWaspas.steps.normalized-matrix.name': 'Normalize matris',
  'methods.fuzzyWaspas.steps.normalized-matrix.explanation':
    'Fayda değerleri kendi kriterlerinin en büyük üst değerine bölünür. Maliyet kriterlerinde en küçük alt değer her değere bölünür; bu, alt ve üst değerlerin yerini değiştirir. En iyi alternatif 1’e ulaşır.',
  'methods.fuzzyWaspas.steps.wsm-matrix.name': 'Ağırlıklı toplam terimleri',
  'methods.fuzzyWaspas.steps.wsm-matrix.explanation':
    'Her normalize bulanık değer kendi kriterinin bulanık ağırlığıyla çarpılır.',
  'methods.fuzzyWaspas.steps.wpm-matrix.name': 'Ağırlıklı çarpım terimleri',
  'methods.fuzzyWaspas.steps.wpm-matrix.explanation':
    'Her normalize bulanık değer kendi kriterinin bulanık ağırlığı kuvvetine yükseltilir: alt değer üst ağırlığa, orta değer orta ağırlığa, üst değer alt ağırlığa (değerler en çok 1 dir).',
  'methods.fuzzyWaspas.steps.wsm-sums.name': 'Bulanık toplamlar Q̃_i',
  'methods.fuzzyWaspas.steps.wsm-sums.explanation':
    'Bir alternatifin ağırlıklı toplam terimlerinin bileşen bileşen toplamı.',
  'methods.fuzzyWaspas.steps.wpm-products.name': 'Bulanık çarpımlar P̃_i',
  'methods.fuzzyWaspas.steps.wpm-products.explanation':
    'Bir alternatifin ağırlıklı çarpım terimlerinin bileşen bileşen çarpımı.',
  'methods.fuzzyWaspas.steps.defuzzified-scores.name': 'Kesin skorlar Q_i ve P_i',
  'methods.fuzzyWaspas.steps.defuzzified-scores.explanation':
    'Bulanık toplamlar ve çarpımlar {defuzzification, select, graded-mean {derecelendirilmiş ortalama (l + 4m + u) / 6} centroid {ağırlık merkezi (l + m + u) / 3} other {seçilen formül}} ile kesin sayılara çevrilir.',
  'methods.fuzzyWaspas.steps.lambda.name': 'λ değeri',
  'methods.fuzzyWaspas.steps.lambda.explanation':
    '{lambdaRule, select, fixed {Ağırlıklı toplamın payı, parametrelerde belirlendiği gibi.} pooled {Tüm alternatifler için tek bir λ: ağırlıklı çarpımların toplamının iki skorun toplamına bölümü (Turskis ve diğ. 2015).} other {Ağırlıklı toplamın payı.}}',
  'methods.fuzzyWaspas.steps.joint-criterion.name': 'Birleşik ölçüt K_i',
  'methods.fuzzyWaspas.steps.joint-criterion.explanation':
    'λ çarpı ağırlıklı toplam artı 1 − λ çarpı ağırlıklı çarpım. Yüksek değer daha iyidir.',
  'methods.fuzzyWaspas.steps.ranking.name': 'Sıralama',
  'methods.fuzzyWaspas.steps.ranking.explanation':
    'Alternatifler birleşik ölçüte göre, en yüksek önce olacak şekilde sıralanır. Eşit değerler aynı sırayı paylaşır.',
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
  'validation.vikor.no-discrimination':
    'Tüm alternatiflerin grup faydası S ve bireysel pişmanlığı R aynı, bu yüzden uzlaşı indeksi Q hesaplanamaz: alternatifleri ayıran bir şey yok.',
  'validation.edas.zero-average':
    '"{id}" kriterinin ortalaması 0, bu yüzden ortalamadan uzaklıkları hesaplanamaz.',
  'validation.edas.zero-positive-sums':
    'Hiçbir alternatif ağırlıklı hiçbir kriterde ortalamadan daha iyi değil, bu yüzden pozitif toplamlar SP normalize edilemez. Bu durum tüm alternatifler birbirine benzediğinde ortaya çıkar.',
  'validation.edas.zero-negative-sums':
    'Hiçbir alternatif ağırlıklı hiçbir kriterde ortalamadan daha kötü değil, bu yüzden negatif toplamlar SN normalize edilemez. Bu durum tüm alternatifler birbirine benzediğinde ortaya çıkar.',
  'validation.codas.zero-cost-value':
    '"{id}" maliyet kriterinin bu hücresi 0. CODAS en küçük değeri maliyet kriterlerinin değerlerine böler, bu yüzden bu değerler sıfırdan büyük olmalıdır.',
  'validation.codas.zero-ideal-value':
    '"{id}" fayda kriterinin tüm değerleri 0, bu yüzden CODAS onu normalize edemez.',
  'validation.waspas.zero-cost-value':
    '"{id}" maliyet kriterinin bu hücresi 0. WASPAS en küçük değeri maliyet kriterlerinin değerlerine böler, bu yüzden bu değerler sıfırdan büyük olmalıdır.',
  'validation.waspas.zero-ideal-value':
    '"{id}" fayda kriterinin tüm değerleri 0, bu yüzden WASPAS onu normalize edemez.',
  'validation.fuzzy-waspas.unsupported-weights':
    'Ağırlıklar "{numberType}" sayı türünü kullanıyor. Bulanık WASPAS üçgensel bulanık ya da kesin ağırlıkları kabul eder.',
  'validation.fuzzy-waspas.zero-cost-value':
    '"{id}" maliyet kriterinin bu hücresindeki alt değer l 0. Bulanık WASPAS maliyet kriterlerinin değerlerine böler, bu yüzden bu değerler sıfırdan büyük olmalıdır.',
  'validation.fuzzy-waspas.zero-ideal-value':
    '"{id}" fayda kriterinin üst değerleri u hepsi 0, bu yüzden Bulanık WASPAS onu normalize edemez.',
  'validation.fuzzy-waspas.normalize-fuzzy-weights':
    'Ağırlıkları normalize etme seçeneği, tek bir normalizasyonu olmayan üçgensel bulanık ağırlıklarla kullanılamaz. Seçeneği kapatın ya da kesin ağırlıklar girin.',
  'validation.dematel.relation-shape':
    '{expert, number}. uzmanın matrisinde her faktör için bir satır ve bir sütun olmak üzere {order, number} satır ve {order, number} sütun bulunmalıdır.',
  'validation.dematel.non-zero-diagonal':
    '"{id}" faktörü kendi üzerinde etkili olarak değerlendirilmiş ({expert, number}. uzman). Formül izin verdiği için değer korunur. Kendi üzerine etki kastedilmiyorsa 0 yapın.',
  'validation.dematel.zero-matrix':
    'Tüm etkiler 0 olduğu için matris normalleştirilemez. En az bir ilişkiyi 0’dan büyük değerlendirin.',
  'validation.dematel.near-singular':
    'Toplam etki hesaplanamıyor: dolaylı etkiler sönmüyor (örneğin her faktör en büyük faktör kadar etki gönderiyor), bu yüzden I − X matrisi tersine çevrilemiyor (koşul sayısı {condition, number}). Bazı değerlendirmeleri düşürün veya normalleştirme sabiti olarak satır ve sütun toplamlarının büyüğünü kullanın.',
};
