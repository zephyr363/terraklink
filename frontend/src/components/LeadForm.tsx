import { useTranslation } from "../i18n";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useCreateLeadMutation, errorMessage } from "../store/api";
import { CONSENT_VERSION } from "../domain/consent";

export function LeadForm({
  region,
  subject = "",
  preview = false,
}: {
  region: string;
  subject?: string;
  preview?: boolean;
}) {
  const { t } = useTranslation();
  const [send, { isLoading }] = useCreateLeadMutation();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (preview) return;
    const data = new FormData(event.currentTarget);
    setError("");
    try {
      await send({
        name: String(data.get("name")),
        phone: String(data.get("phone")),
        message: subject,
        region,
        consent: data.get("consent") === "on",
        consent_version: CONSENT_VERSION,
        honeypot: String(data.get("website") ?? ""),
      }).unwrap();
      setSuccess(true);
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  if (success)
    return (
      <div className="success" role="status">
        <CheckCircle2 size={36} />
        <h3>{t("Спасибо за обращение!")}</h3>
        <p>
          {t(
            "Заявка сохранена. Менеджер сможет увидеть её в административной панели.",
          )}
        </p>
      </div>
    );
  return (
    <form onSubmit={submit} className="lead-form">
      <label>
        {t("Ваше имя")}
        <input
          name="name"
          placeholder={t("Как к вам обращаться")}
          required
          maxLength={100}
          autoComplete="given-name"
        />
      </label>
      <label>
        {t("Телефон")}
        <input
          name="phone"
          type="tel"
          placeholder="+7 (___) ___-__-__"
          required
          minLength={10}
          maxLength={30}
          pattern="[+0-9 ()\-]{10,30}"
          autoComplete="tel"
        />
      </label>
      <label className="honeypot" aria-hidden="true">
        {t("Сайт")}
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <label className="checkbox">
        <input name="consent" type="checkbox" required />
        <span>
          {t("Даю отдельное")}{" "}
          <Link to="/legal/consent" target="_blank">
            {t("согласие на сбор и обработку персональных данных")}
          </Link>{" "}
          {t("и ознакомлен с")}{" "}
          <Link to="/legal/privacy" target="_blank">
            {t("политикой конфиденциальности")}
          </Link>
          .
        </span>
      </label>
      {preview && (
        <p className="muted">
          {t("Отправка заявок в предпросмотре отключена.")}
        </p>
      )}
      <button className="button" disabled={isLoading || preview}>
        {t(isLoading ? "Отправляем…" : "Отправить заявку")}
        <ArrowRight size={18} />
      </button>
      {error && (
        <p className="error" role="alert">
          {t(error)}
        </p>
      )}
    </form>
  );
}
