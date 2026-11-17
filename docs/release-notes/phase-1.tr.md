# Mateo — Faz 1 sürüm notları

İlk kullanılabilir sürüm. Her şey çevrimdışı çalışır, Türkçe ve İngilizce desteklenir.

## Neler yapabilirsiniz

- Karar matrisini Excel veya CSV'den **içe aktarın**, ya da elektronik tablo benzeri düzenleyicide elle girin. Kesin sayılar, bulanık üçgen sayılar ve dilsel ölçekler desteklenir.
- Kriterleri CRITIC, MEREC veya SWARA ile **ağırlıklandırın**.
- Alternatifleri MARCOS veya bulanık MARCOS ile **sıralayın**.
- Her sonucu formüller, değerler ve sade bir anlatımla adım adım **açıklatın**.
- Ağırlıkları değiştirip sıralamanın nasıl etkilendiğini görerek **duyarlılığı inceleyin**.
- Sonuçları **dışa aktarın**.
- Açıp çalıştırabileceğiniz çözümlü örneklerle **Yöntem Kütüphanesi**.

## Güvenilirlik

- Projeler tek bir `.mateo` dosyasına otomatik kaydedilir. Dosya işlem tabanlı bir veritabanıdır; beklenmedik bir kapanma dosyayı yarım yazılmış bırakmaz, en son kaydedilen durumla yeniden açarsınız.
- Büyük problemler (500 alternatif × 50 kriter) birkaç saniyenin çok altında çalışır.

## Erişilebilirlik

Faz 1 ekranları WCAG 2.1 AA hedefiyle yapılmıştır: klavyeyle kullanım, görünür odak, ekran okuyucu etiketleri ve azaltılmış hareket desteği.

## Bilinen sınırlar

- Windows yükleyicileri henüz kod imzalı değildir; Windows ilk çalıştırmada uyarı verebilir.
- Yalnızca CRITIC, MEREC, SWARA ve MARCOS (kesin ve bulanık) vardır. Diğer yöntemler sonraki fazlarda gelecek.
