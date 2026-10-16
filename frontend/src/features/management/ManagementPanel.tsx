import { useState } from "react";
import { workspaceApi } from "../../store/workspaceApi";
import { useDraftQuery, useLeadsQuery, errorMessage } from "../../store/api";
export function ManagementPanel() {
  const [tab, setTab] = useState<"leads" | "history" | "media">("leads");
  const [historyLimit, setHistoryLimit] = useState(20);
  const { data: draft } = useDraftQuery();
  const {
    data: history,
    error: historyError,
    isLoading: historyLoading,
  } = workspaceApi.useHistoryQuery();
  const {
    data: assets,
    error: assetsError,
    isLoading: assetsLoading,
  } = workspaceApi.useLibraryQuery();
  const { data: leads, error: leadsError } = useLeadsQuery();
  const [restore, restoreState] = workspaceApi.useRestoreMutation();
  const [updateStatus, statusState] = workspaceApi.useLeadStatusMutation();
  const [selected, setSelected] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const restoreDraft = async () => {
    if (!draft || selected === null) return;
    try {
      await restore({ number: selected, revision: draft.revision }).unwrap();
      setNotice(
        "Создан новый черновик. Проверьте и опубликуйте его в редакторе.",
      );
      setSelected(null);
      setError("");
    } catch (e) {
      setError(errorMessage(e));
    }
  };
  return (
    <>
      <h1>Управление</h1>
      <p>Заявки, история редакций и загруженные материалы.</p>
      <nav className="filter-tabs" aria-label="Раздел управления">
        {(
          [
            ["leads", "Заявки"],
            ["history", "История редакций"],
            ["media", "Медиатека"],
          ] as const
        ).map(([key, title]) => (
          <button
            key={key}
            className={tab === key ? "selected" : ""}
            aria-pressed={tab === key}
            onClick={() => setTab(key)}
          >
            {title}
          </button>
        ))}
      </nav>
      <p>
        <a href="/django-admin/auth/user/">Пользователи и права доступа</a> ·{" "}
        <a href="/django-admin/auth/group/">Группы доступа</a>
      </p>
      {notice && <p role="status">{notice}</p>}
      {(error || leadsError) && (
        <p role="alert">{error || errorMessage(leadsError)}</p>
      )}
      <section className="editor-card" hidden={tab !== "leads"}>
        <h2>Заявки · последние 200</h2>
        {leads?.length === 0 && <p>Заявок пока нет.</p>}
        {leads?.map((lead) => (
          <div key={lead.id} className="workspace-row">
            <div>
              <strong>
                {lead.name} · {lead.phone}
              </strong>
              <p>{lead.message}</p>
              <small>
                {lead.region} ·{" "}
                {new Date(lead.created_at).toLocaleString("ru-RU", {
                  timeZone: "Asia/Almaty",
                })}
              </small>
            </div>
            <label>
              Статус
              <select
                disabled={statusState.isLoading}
                value={lead.status}
                onChange={async (e) => {
                  try {
                    await updateStatus({
                      id: lead.id,
                      status: e.target.value,
                    }).unwrap();
                    setError("");
                  } catch (err) {
                    setError(errorMessage(err));
                  }
                }}
              >
                <option value="new">Новая</option>
                <option value="done">Обработана</option>
              </select>
            </label>
          </div>
        ))}
      </section>
      <section className="editor-card" hidden={tab !== "history"}>
        <h2>История · последние 100 редакций</h2>
        <p>
          Восстановление заменяет общий черновик новой редакцией. Опубликованный
          сайт сохраняется до публикации.
        </p>
        {historyLoading && <p>Загрузка истории…</p>}
        {historyError && <p role="alert">{errorMessage(historyError)}</p>}
        {history?.length === 0 && <p>Редакций пока нет.</p>}
        {history?.slice(0, historyLimit).map((r) => (
          <div className="workspace-row" key={r.number}>
            <span>
              №{r.number} ·{" "}
              {r.action === "publish" ? "Публикация" : "Сохранение"} ·{" "}
              {r.editor__username ?? "Удалённый пользователь"} ·{" "}
              {new Date(r.created_at).toLocaleString("ru-RU")}
            </span>
            <button
              className="button outline small"
              onClick={() => setSelected(r.number)}
            >
              Восстановить
            </button>
          </div>
        ))}
        {history && history.length > historyLimit && (
          <button
            className="text-button"
            onClick={() => setHistoryLimit(historyLimit + 20)}
          >
            Показать ещё
          </button>
        )}
        {selected !== null && (
          <div role="alert">
            <p>
              Заменить текущий черновик редакцией №{selected}? Несохранённые
              изменения в открытом редакторе могут быть потеряны при
              перезагрузке.
            </p>
            <button
              className="button"
              disabled={restoreState.isLoading || !draft}
              onClick={restoreDraft}
            >
              Подтвердить восстановление
            </button>
            <button className="text-button" onClick={() => setSelected(null)}>
              Отмена
            </button>
          </div>
        )}
      </section>
      <section className="editor-card" hidden={tab !== "media"}>
        <h2>Медиатека · последние 200 файлов</h2>
        <p>
          Скопируйте ссылку для использования в баннере, галерее или промо.
          Файлы сохраняются при удалении из контента.
        </p>
        {assetsLoading && <p>Загрузка медиатеки…</p>}
        {assetsError && <p role="alert">{errorMessage(assetsError)}</p>}
        {assets?.length === 0 && <p>Файлов пока нет.</p>}
        {assets?.map((asset) => (
          <div className="workspace-row" key={asset.id}>
            <a href={asset.url} target="_blank" rel="noreferrer">
              {asset.name} · {asset.kind === "image" ? "Фото" : "Видео"}
            </a>
            <input
              aria-label={`Ссылка: ${asset.name}`}
              readOnly
              value={asset.url}
              onFocus={(e) => e.target.select()}
            />
          </div>
        ))}
      </section>
    </>
  );
}
