import { useLeadsQuery } from "../../store/api";
export function LeadsPanel() {
  const { data, isLoading, isError } = useLeadsQuery();
  return (
    <div className="editor-card">
      <h2>Заявки с сайта</h2>
      <p className="muted">
        Последние 200 заявок. Изменить статус можно в{" "}
        <a href="/django-admin/cms/lead/">TerraKlink Admin</a>.
      </p>
      {isLoading && <p>Загружаем заявки…</p>}
      {isError && <p className="error">Не удалось загрузить заявки.</p>}
      {data?.length === 0 && <p>Заявок пока нет.</p>}
      {!!data?.length && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Дата</th>
                <th>Имя и телефон</th>
                <th>Регион</th>
                <th>Обращение</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {data.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    {new Date(lead.created_at).toLocaleString("ru-RU", {
                      timeZone: "Asia/Almaty",
                    })}
                  </td>
                  <td>
                    {lead.name}
                    <br />
                    {lead.phone}
                  </td>
                  <td>{lead.region || "Не выбран"}</td>
                  <td>{lead.message}</td>
                  <td>{lead.status === "new" ? "Новая" : "Обработана"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
