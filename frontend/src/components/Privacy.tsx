import { useTranslation } from "../i18n";
import { useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, LocateFixed } from "lucide-react";
import {
  cities,
  nearestCity,
  readConsent,
  saveConsent,
} from "../domain/consent";
import { Dialog } from "./Dialog";

export function CookieBanner({
  reopen,
  onClose,
}: {
  reopen: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [consent, setConsent] = useState(readConsent);
  const accept = (analytics: boolean) => {
    setConsent(saveConsent(analytics));
    onClose();
  };
  if (consent && !reopen) return null;
  return (
    <aside className="cookie-banner" aria-label={t("Настройки cookies")}>
      <div>
        <strong>{t("Ваш комфорт — ваш выбор")}</strong>
        <p>
          {t(
            "Сохраняем выбранный регион и настройки. Аналитические cookies — только с вашего согласия.",
          )}{" "}
          <Link to="/legal/cookies">{t("Подробнее")}</Link>
        </p>
      </div>
      <div className="cookie-actions">
        <button className="button outline" onClick={() => accept(false)}>
          {t("Только необходимые")}
        </button>
        <button className="button" onClick={() => accept(true)}>
          {t("Принять все")}
        </button>
      </div>
    </aside>
  );
}

export function RegionDialog({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (city: string) => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [message, setMessage] = useState("");
  const [locating, setLocating] = useState(false);
  const locate = () => {
    if (!agreed || locating) return;
    if (!navigator.geolocation) {
      setMessage("Браузер не поддерживает геолокацию. Выберите город вручную.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const city = nearestCity(
          position.coords.latitude,
          position.coords.longitude,
        );
        if (city) onSelect(city);
        else setMessage("Не нашли город рядом. Выберите регион вручную.");
      },
      () => {
        setLocating(false);
        setMessage("Нет доступа к местоположению. Выберите город вручную.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 },
    );
  };
  return (
    <Dialog title={t("Выберите ваш город")} onClose={onClose}>
      <p className="muted">
        {t("Покажем регион для доставки и консультации.")}
      </p>
      <label>
        {t("Найти город")}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("Название города")}
        />
      </label>
      <div className="city-list">
        {cities
          .filter((city) =>
            `${city.name} ${t(city.name)}`
              .toLowerCase()
              .includes(query.toLowerCase()),
          )
          .map((city) => (
            <button key={city.name} onClick={() => onSelect(city.name)}>
              <MapPin size={16} />
              {t(city.name)}
            </button>
          ))}
      </div>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
        />
        <span>
          {t("Принимаю")}{" "}
          <Link to="/legal/terms" target="_blank">
            {t("пользовательское соглашение")}
          </Link>{" "}
          {t(
            "и разрешаю однократно определить город. Координаты обрабатываются в браузере и не отправляются на сервер.",
          )}
        </span>
      </label>
      <button
        className="button outline"
        disabled={!agreed || locating}
        onClick={locate}
      >
        <LocateFixed size={17} />
        {t(locating ? "Определяем…" : "Определить мой город")}
      </button>
      <p role="status">{t(message)}</p>
    </Dialog>
  );
}
