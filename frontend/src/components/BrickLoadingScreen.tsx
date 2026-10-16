import { useTranslation } from "../i18n";

/**
 * Загрузочный экран с анимацией перекладывания кирпича.
 * Кирпичи по очереди перекладываются стопкой, символизируя строительство.
 */
export function BrickLoadingScreen({
  message,
}: {
  message: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="brick-loading-screen">
      <div className="brick-wall">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((row) => (
          <div key={row} className="brick-row">
            {[0, 1, 2].map((col) => (
              <div
                key={col}
                className={`brick brick-${row}-${col}`}
                style={{ animationDelay: `${(row * 0.15 + col * 0.05)}s` }}
              >
                <div className="brick-face" />
                <div className="brick-face" />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="brick-loader-text">{t(message)}</div>
    </div>
  );
}
