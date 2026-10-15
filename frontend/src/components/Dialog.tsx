import { useTranslation } from "../i18n";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

// Native dialog traps keyboard focus and exposes modal semantics to assistive technology.
export function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = ref.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-labelledby="dialog-title"
    >
      <div className="dialog-heading">
        <h2 id="dialog-title">{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label={t("Закрыть окно")}
        >
          <X size={22} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
