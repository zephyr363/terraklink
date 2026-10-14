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
  const [consent, setConsent] = useState(readConsent);
  const accept = (analytics: boolean) => {
    setConsent(saveConsent(analytics));
    onClose();
  };
  if (consent && !reopen) return null;
  return (
    <aside className="cookie-banner" aria-label="Настройки cookies">
      <div>
        <strong>Ваш комфорт — ваш выбор</strong>
        <p>
          Сохраняем выбранный регион и настройки. Аналитические cookies — только
          с вашего согласия. <Link to="/legal/cookies">Подробнее</Link>
        </p>
      </div>
      <div className="cookie-actions">
        <button className="button outline" onClick={() => accept(false)}>
          Только необходимые
        </button>
        <button className="button" onClick={() => accept(true)}>
          Принять все
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
    <Dialog title="Выберите ваш город" onClose={onClose}>
      <p className="muted">Покажем регион для доставки и консультации.</p>
      <label>
        Найти город
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Название города"
        />
      </label>
      <div className="city-list">
        {cities
          .filter((city) =>
            city.name.toLowerCase().includes(query.toLowerCase()),
          )
          .map((city) => (
            <button key={city.name} onClick={() => onSelect(city.name)}>
              <MapPin size={16} />
              {city.name}
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
          Принимаю{" "}
          <Link to="/legal/terms" target="_blank">
            пользовательское соглашение
          </Link>{" "}
          и разрешаю однократно определить город. Координаты обрабатываются в
          браузере и не отправляются на сервер.
        </span>
      </label>
      <button
        className="button outline"
        disabled={!agreed || locating}
        onClick={locate}
      >
        <LocateFixed size={17} />
        {locating ? "Определяем…" : "Определить мой город"}
      </button>
      <p role="status">{message}</p>
    </Dialog>
  );
}
