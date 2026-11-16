import type { ProjectMessageKey } from './en';

/** Turkish texts for the keys this package emits. Must define exactly the keys of `en.ts`. */
export const tr: Record<ProjectMessageKey, string> = {
  'project.error.NOT_A_PROJECT_FILE': 'Bu dosya bir Mateo projesi değil.',
  'project.error.NEWER_SCHEMA':
    'Bu proje Mateo’nun daha yeni bir sürümüyle kaydedilmiş (dosya biçimi {fileVersion, number}; bu sürüm en fazla {supportedVersion, number} okuyabilir). Açmak için Mateo’yu güncelleyin. Dosya değiştirilmedi.',
  'project.error.CORRUPT_FILE': 'Bu proje dosyası bozuk ve açılamıyor.',
  'project.error.MIGRATION_FAILED':
    'Bu proje güncel dosya biçimine yükseltilemedi. Dosya değiştirilmedi.',
  'project.error.LOCATION_NOT_EMPTY': 'Bu konumda zaten bir dosya var.',
  'project.error.NOT_FOUND': 'Dosya veya öğe bulunamadı.',
  'project.error.PROJECT_CLOSED': 'Proje kapalı.',
  'project.error.INVALID_ARGUMENT': 'Bu değişiklik projeye kaydedilemiyor.',
  'project.error.STORAGE_FAILED':
    'Proje okunamadı veya yazılamadı. Dosyaya erişilebildiğinden ve yeterli boş alan olduğundan emin olun.',

  'project.command.dataset.add': 'Veri seti ekle',
  'project.command.dataset.update': 'Veri setini düzenle',
  'project.command.dataset.remove': 'Veri setini sil',
  'project.command.dataset.move': 'Veri setini taşı',
  'project.command.criterion.add': 'Kriter ekle',
  'project.command.criterion.update': 'Kriteri düzenle',
  'project.command.criterion.remove': 'Kriterleri sil',
  'project.command.criterion.move': 'Kriteri taşı',
  'project.command.alternative.add': 'Alternatif ekle',
  'project.command.alternative.update': 'Alternatifi düzenle',
  'project.command.alternative.remove': 'Alternatifleri sil',
  'project.command.alternative.move': 'Alternatifi taşı',
  'project.command.matrix.add': 'Matris ekle',
  'project.command.matrix.rename': 'Matrisi yeniden adlandır',
  'project.command.matrix.remove': 'Matrisi sil',
  'project.command.cells.set': 'Hücreleri düzenle',
  'project.command.scale.put': 'Dilsel ölçeği düzenle',
  'project.command.scale.remove': 'Dilsel ölçeği sil',
};
