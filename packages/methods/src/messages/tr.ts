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
};
