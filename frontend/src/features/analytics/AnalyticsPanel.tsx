import { useState } from "react";
import { workspaceApi } from "../../store/workspaceApi";
import { errorMessage } from "../../store/api";
export function AnalyticsPanel() {
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
