import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useCreateLeadMutation, errorMessage } from "../store/api";
import { CONSENT_VERSION } from "../domain/consent";

export function LeadForm({
  region,
  subject = "",
}: {
  region: string;
  subject?: string;
}) {
  const [send, { isLoading }] = useCreateLeadMutation();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
        <h3>Спасибо за обращение!</h3>
        <p>
          Заявка сохранена. Менеджер сможет увидеть её в административной
          панели.
        </p>
      </div>
    );
  return (
    <form onSubmit={submit} className="lead-form">
      <label>
        Ваше имя
        <input
          name="name"
          placeholder="Как к вам обращаться"
          required
          maxLength={100}
          autoComplete="given-name"
        />
      </label>
      <label>
        Телефон
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
        Сайт
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <label className="checkbox">
        <input name="consent" type="checkbox" required />
        <span>
          Даю отдельное{" "}
          <Link to="/legal/consent" target="_blank">
            согласие на сбор и обработку персональных данных
          </Link>{" "}
          и ознакомлен с{" "}
          <Link to="/legal/privacy" target="_blank">
            политикой конфиденциальности
          </Link>
          .
        </span>
      </label>
      <button className="button" disabled={isLoading}>
        {isLoading ? "Отправляем…" : "Отправить заявку"}
        <ArrowRight size={18} />
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
