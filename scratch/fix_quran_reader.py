
import sys
path = r'e:\MyApps\ifaqaa\components\QuranReader.tsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_end = """          </div>
        </div>
      </aside>

      <IraabModal
        isOpen={activeOfflineModal === 'iraab'}
        onClose={() => setActiveOfflineModal(null)}
        surahId={contextSurah || metadata.surahNumber}
        ayahId={contextAyah || 1}
        onGoToDownloads={() => setShowDownloadsManager(true)}
      />

      <MaaniModal
        isOpen={activeOfflineModal === 'maani'}
        onClose={() => setActiveOfflineModal(null)}
        surahId={contextSurah || metadata.surahNumber}
        ayahId={contextAyah || 1}
        onGoToDownloads={() => setShowDownloadsManager(true)}
      />

      <TafsirReader
        isOpen={activeOfflineModal === 'tafsir'}
        onClose={() => setActiveOfflineModal(null)}
        surahId={contextSurah || metadata.surahNumber}
        ayahId={contextAyah || 1}
        tafsirId={selectedTafseerId}
        onGoToDownloads={() => setShowDownloadsManager(true)}
        onTafsirChange={handleTafseerChange}
      />

      {showDownloadsManager && (
        <DownloadsManager onClose={() => setShowDownloadsManager(false)} />
      )}

      <AyahToolbar
        isOpen={!!contextAyah && showBars}
        onClose={() => {
          setContextAyah(null);
          setActiveAyah(null);
        }}
        ayahData={contextAyah ? {
          surah: contextSurah,
          ayah: contextAyah,
          text: pageAyahs.find(a => a.numberInSurah === contextAyah)?.text || ''
        } : null}
        onHighlight={handleHighlight}
        onPrevAyah={handlePrevAyah}
        onNextAyah={handleNextAyah}
        onAddNote={() => {}} // Placeholder
        onBookmark={() => {}} // Placeholder
        surahName={metadata.surahName}
        availableTafseers={availableTafseers}
        selectedTafseerId={selectedTafseerId}
        onTafseerChange={handleTafseerChange}
      />

      <QuranSearchModal
        isOpen={isUnifiedSearchOpen}
        onClose={() => setIsUnifiedSearchOpen(false)}
        onNavigateToAyah={(s, a) => {
           const surah = quranSurahs.find(item => item.number === s);
           if (surah) {
             setPageNumber(surah.startPage);
             setActiveAyah(a);
             setIsUnifiedSearchOpen(false);
           }
        }}
      />
    </main>
  );
};

export default QuranReader;
"""

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines[:3659])
    f.write(new_end)
