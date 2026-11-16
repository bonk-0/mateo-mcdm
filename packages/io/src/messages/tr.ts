import type { ImportMessageKey } from './en';

/** Turkish texts for the keys the import engine emits. Same keys as `en.ts`. */
export const tr: Readonly<Record<ImportMessageKey, string>> = {
  'validation.import.file.empty': 'Dosya boş.',
  'validation.import.file.unsupported-format':
    'Bu dosya türü desteklenmiyor. XLSX, XLSM, XLS, CSV ya da TSV dosyası içe aktarın.',
  'validation.import.file.unreadable': 'Dosya okunamadı. Dosya bozuk olabilir.',
  'validation.import.file.encrypted':
    'Dosya parola korumalı. Parolasız kaydedip yeniden içe aktarın.',
  'validation.import.file.no-data': 'Dosyada sayı ya da dilsel değerlendirme bulunamadı.',
  'validation.import.sheet.not-found': 'Dosyada "{sheet}" adlı bir sayfa yok.',

  'validation.import.encoding.uncertain':
    'Metin kodlaması doğrulanamadı; dosya {encoding} olarak okundu. Önizlemedeki harfleri kontrol edin.',
  'validation.import.encoding.replacement-characters':
    '{count, plural, one {# karakter} other {# karakter}} {encoding} olarak okunamadı.',
  'validation.import.delimiter.ambiguous':
    'Dosyayı birden fazla ayraç düzgün biçimde bölüyor; {delimiter, select, comma {virgül} semicolon {noktalı virgül} other {sekme}} kullanıldı. Sütunları kontrol edin.',
  'validation.import.csv.malformed-row':
    '{row, number}. satırda kapanmamış bir tırnak var; alanları yanlış bölünmüş olabilir.',

  'validation.import.number-format.ambiguous':
    'Sayı biçimi dosyadan anlaşılamıyor: "{example}" gibi değerler ondalık nokta ve ondalık virgülle farklı okunuyor. Sayı biçimini seçin.',
  'validation.import.number-format.conflict':
    'Dosyada farklı sayı biçimleri karışık: "{point}" ondalık nokta, "{comma}" ondalık virgül kullanıyor. Sayı biçimini seçin.',
  'validation.import.number-format.override-conflict':
    '{count, plural, one {# değer} other {# değer}} seçilen sayı biçimine uymuyor, örneğin "{example}".',

  'validation.import.header.not-found':
    'Başlık satırı bulunamadı; kriterler sütun adlarıyla adlandırıldı.',
  'validation.import.alternative.names-generated':
    'Alternatifleri adlandıran bir sütun yok; A1’den A{count, number}’e kadar adlandırıldılar.',
  'validation.import.alternative.name-missing': '{cell} hücresindeki alternatifin adı yok.',
  'validation.import.alternative.duplicate': '"{name}" alternatifi birden fazla kez geçiyor.',
  'validation.import.criterion.name-missing':
    '{column} sütununun başlığı yok; kriter sütunun adıyla adlandırıldı.',
  'validation.import.criterion.duplicate': '"{name}" kriteri birden fazla kez geçiyor.',
  'validation.import.column.text-ignored':
    '{column} sütunu ({header}) yalnızca metin içeriyor ve kriter olarak alınmadı.',
  'validation.import.row.excluded':
    '{row, number}. satır ({label}) {reason, select, ideal {ideal ya da anti-ideal satıra} other {hesaplanmış bir satıra}} benziyor ve alternatif olarak alınmadı.',
  'validation.import.tfn.incomplete-group':
    '{columns} sütunları bir üçgensel bulanık sayının parçalarına benziyor, ancak l, m ve u tam olarak birer kez bulunmuyor.',
  'validation.import.matrix.no-alternatives': 'Hiç alternatif bulunamadı.',
  'validation.import.matrix.no-criteria': 'Hiç kriter bulunamadı.',

  'validation.import.direction.missing':
    'Dosya "{criterion}" kriterinin fayda mı maliyet mi olduğunu belirtmiyor.',
  'validation.import.direction.invalid':
    '{cell} hücresi ("{text}") bir yön değil. Fayda ya da maliyet (max ya da min) kullanın.',
  'validation.import.direction.conflict': 'Dosya "{criterion}" için birden fazla yön veriyor.',

  'validation.import.scale.ambiguous':
    'Dilsel değerlendirmeler birden fazla ölçeğe uyuyor ({scales}). Ölçeği seçin.',
  'validation.import.scale.no-match':
    'Dilsel değerlendirmelerin ({terms}) hepsi tek bir ölçeğe ait değil. Bir ölçek seçin ya da değerlendirmeleri düzeltin.',
  'validation.import.scale.not-found': '"{scale}" adlı bir dilsel ölçek yok.',

  'validation.import.cell.missing':
    '{cell} hücresinde değer yok. Eksik değerler hiçbir zaman otomatik doldurulmaz.',
  'validation.import.cell.invalid-number': '{cell} hücresi ("{text}") bir sayı değil.',
  'validation.import.cell.needs-number-format':
    '{cell} hücresi ("{text}") ancak sayı biçimi seçildikten sonra okunabilir.',
  'validation.import.cell.formula-error': '{cell} hücresinde {value} hatası var.',
  'validation.import.cell.formula-without-value':
    '{cell} hücresinde kayıtlı sonucu olmayan bir formül var. Dosyayı Excel’de açıp kaydedin ve yeniden içe aktarın.',
  'validation.import.cell.date': '{cell} hücresinde kriter değeri değil, tarih var.',
  'validation.import.cell.percent':
    '{count, plural, one {# değer} other {# değer}} yüzde olarak yazılmış (ilki: {cell}) ve 100’e bölündü.',
  'validation.import.cell.unknown-term':
    '{cell} hücresi ("{text}") "{scale}" ölçeğinin bir terimi değil.',
  'validation.import.cell.invalid-tfn':
    '{cell} hücresi ("{text}") bir üçgensel bulanık sayı değil. (l; m; u) biçiminde yazın.',
  'validation.import.cell.tfn-order':
    '{cell} hücresinde ({l, number}, {m, number}, {u, number}) var; üçgensel bulanık sayı için l ≤ m ≤ u olmalı.',
  'validation.import.cell.needs-scale':
    '{cell} hücresi ("{text}") dilsel bir değerlendirme; dönüştürmek için bir ölçek seçin.',
  'validation.import.weight.invalid':
    '{cell} hücresindeki ağırlık eksik ya da geçersiz; ağırlık satırı eksik.',

  'validation.import.profile.invalid': 'İçe aktarma profili geçerli değil ({field}).',
  'validation.import.profile.unsupported-version':
    'İçe aktarma profilinin biçim sürümü {version}; Mateo’nun bu sürümü {supported, number}. sürümü okuyor.',
  'validation.import.profile.column-not-found':
    'İçe aktarma profili bu dosyada bulunmayan "{header}" sütununu içeriyor.',
};
