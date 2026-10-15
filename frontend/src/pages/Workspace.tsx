import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { Login } from "./Admin";
import {
  authSlice,
  contentApi,
  errorMessage,
  useDraftQuery,
  useLogoutMutation,
  useLeadsQuery,
} from "../store/api";

type Counter = {
  day: string;
  path: string;
  event: string;
  language: string;
  count: number;
};
type Revision = {
  number: number;
  action: string;
  created_at: string;
  editor__username: string | null;
};
type Asset = { id: number; name: string; kind: string; url: string };
const workspaceApi = contentApi.injectEndpoints({
  endpoints: (builder) => ({
    analytics: builder.query<
      {
        days: number;
        totals: { event: string; count: number }[];
        daily: { day: string; count: number }[];
        truncated: boolean;
        counters: Counter[];
        leads: { status: string; count: number }[];
      },
      number
    >({ query: (days) => `editor/analytics/?days=${days}` }),
    history: builder.query<Revision[], void>({
      query: () => "editor/history/",
      providesTags: ["Draft"],
    }),
    library: builder.query<Asset[], void>({ query: () => "editor/library/" }),
    restore: builder.mutation<
      { revision: number },
      { number: number; revision: number }
    >({
      query: (body) => ({ url: "editor/restore/", method: "POST", body }),
      invalidatesTags: ["Draft"],
    }),
    leadStatus: builder.mutation<void, { id: number; status: string }>({
      query: ({ id, status }) => ({
        url: `editor/leads/${id}/`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: ["Leads"],
    }),
  }),
});

function Analytics() {
  const [days, setDays] = useState(30);
  const { data, isLoading, error } = workspaceApi.useAnalyticsQuery(days);
  const labels: Record<string, string> = {
    page_view: "Просмотры страниц",
    product_view: "Просмотры товаров",
    lead_sent: "Отправки форм",
  };
  return (
    <>
      <h1>Аналитика</h1>
      <p>
        События посетителей, согласившихся на аналитику. Это счётчики событий, а
        не уникальные посетители. Часовой пояс: Казахстан (UTC+5).
      </p>
      <label>
        Период
        <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
          {[7, 30, 90].map((n) => (
            <option key={n} value={n}>
              {n} дней
            </option>
          ))}
        </select>
      </label>
      {isLoading && <p>Загрузка…</p>}
      {error && <p role="alert">{errorMessage(error)}</p>}
      {data && (
        <>
          <div className="workspace-metrics">
            {Object.entries(labels).map(([event, label]) => (
              <div className="editor-card" key={event}>
                <h2>
                  {data.totals.find((row) => row.event === event)?.count ?? 0}
                </h2>
                {label}
              </div>
            ))}
          </div>
          {!!data.daily.length && (
            <section className="editor-card">
              <h2>Просмотры по дням</h2>
              {data.daily.map((row) => (
                <div className="daily-row" key={row.day}>
                  <span>{row.day}</span>
                  <meter
                    min={0}
                    max={Math.max(...data.daily.map((r) => r.count), 1)}
                    value={row.count}
                    aria-label={`Просмотры ${row.day}`}
                  />
                  <strong>{row.count}</strong>
                </div>
              ))}
            </section>
          )}
          {data.truncated && (
            <p>
              Показаны первые 2000 строк. Итоговые счётчики и график учитывают
              весь период.
            </p>
          )}
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Страница</th>
                  <th>Событие</th>
                  <th>Язык</th>
                  <th>Количество</th>
                </tr>
              </thead>
              <tbody>
                {data.counters.map((r) => (
                  <tr key={`${r.day}-${r.path}-${r.event}-${r.language}`}>
                    <td>{r.day}</td>
                    <td>{r.path}</td>
                    <td>{labels[r.event]}</td>
                    <td>{r.language}</td>
                    <td>{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!data.counters.length && <p>Событий за период пока нет.</p>}
          <h2>Все заявки в базе</h2>
          {data.leads.map((r) => (
            <p key={r.status}>
              {r.status === "new" ? "Новые" : "Обработанные"}: {r.count}
            </p>
          ))}
        </>
      )}
    </>
  );
}

function Management() {
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

export function Workspace({ mode }: { mode: "analytics" | "management" }) {
  const access = useSelector(
    (state: { auth: { access: string } }) => state.auth.access,
  );
  const [loggedIn, setLoggedIn] = useState(!!access);
  const dispatch = useDispatch();
  const [logout] = useLogoutMutation();
  useEffect(() => {
    document.title = `TerraKlink · ${mode === "analytics" ? "Аналитика" : "Управление"}`;
    document.head
      .querySelector('meta[name="robots"]')
      ?.setAttribute("content", "noindex, nofollow");
    document.head
      .querySelectorAll('link[rel="canonical"], link[hreflang], #site-schema')
      .forEach((e) => e.remove());
  }, [mode]);
  if (!loggedIn) return <Login onSuccess={() => setLoggedIn(true)} />;
  return (
    <div className="workspace container">
      <nav className="workspace-nav">
        <Link to="/">TerraKlink</Link>
        <Link to="/admin">Редактор</Link>
        <Link to="/analytics">Аналитика</Link>
        <Link to="/management">Управление</Link>
        <button
          className="text-button"
          onClick={async () => {
            try {
              await logout().unwrap();
            } finally {
              dispatch(authSlice.actions.setAccess(""));
              dispatch(contentApi.util.resetApiState());
              setLoggedIn(false);
            }
          }}
        >
          Выйти
        </button>
      </nav>
      {mode === "analytics" ? <Analytics /> : <Management />}
    </div>
  );
}
