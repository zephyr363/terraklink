import { useEffect, useRef, useState, type PointerEvent } from "react";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { placeSection, type Section } from "../../domain/content";
import { sectionNames } from "./config";

function PositionInput({
  position,
  total,
  title,
  onPlace,
}: {
  position: number;
  total: number;
  title: string;
  onPlace: (position: number) => void;
}) {
  const [value, setValue] = useState(String(position));
  useEffect(() => setValue(String(position)), [position]);
  return (
    <input
      className="section-position"
      type="number"
      min={1}
      max={total}
      step={1}
      value={value}
      aria-label={`Позиция секции ${title}`}
      title={`Позиция от 1 до ${total}; Enter для применения`}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      onBlur={() => {
        onPlace(Number(value));
        setValue(String(position));
      }}
    />
  );
}

export function SectionList({
  sections,
  selectedId,
  onSelect,
  onChange,
}: {
  sections: Section[];
  selectedId: string;
  onSelect: (id: string) => void;
  onChange: (sections: Section[]) => void;
}) {
  const [message, setMessage] = useState("");
  const [overId, setOverId] = useState<string | null>(null);
  const gesture = useRef<{
    id: string;
    y: number;
    x: number;
    pointerY: number;
    pane: HTMLElement;
    active: boolean;
    target: string | null;
  } | null>(null);
  const frame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  const updateTarget = () => {
    const current = gesture.current;
    if (!current?.active) return;
    const row = window.document
      .elementFromPoint(current.x, current.pointerY)
      ?.closest<HTMLElement>("[data-section-id]");
    current.target = row?.dataset.sectionId ?? null;
    setOverId(current.target);
  };
  const scrollDrag = () => {
    const current = gesture.current;
    if (!current) return;
    if (current.active) {
      const bounds = current.pane.getBoundingClientRect();
      const scrollPane = current.pane.scrollHeight > current.pane.clientHeight;
      const top = scrollPane ? Math.max(bounds.top, 0) : 0;
      const bottom = scrollPane
        ? Math.min(bounds.bottom, innerHeight)
        : innerHeight;
      const delta =
        current.pointerY < top + 32
          ? -10
          : current.pointerY > bottom - 32
            ? 10
            : 0;
      if (delta) (scrollPane ? current.pane : window).scrollBy(0, delta);
      updateTarget();
    }
    frame.current = requestAnimationFrame(scrollDrag);
  };
  const place = (id: string, position: number) => {
    if (
      !Number.isInteger(position) ||
      position < 1 ||
      position > sections.length
    ) {
      setMessage(`Введите целую позицию от 1 до ${sections.length}.`);
      return;
    }
    const next = placeSection(sections, id, position);
    if (next !== sections) {
      onChange(next);
      setMessage(
        `Секция перемещена на позицию ${position}. Сохраните черновик.`,
      );
    }
  };
  const finish = (
    event: PointerEvent<HTMLButtonElement>,
    cancelled = false,
  ) => {
    const current = gesture.current;
    gesture.current = null;
    cancelAnimationFrame(frame.current);
    setOverId(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (!cancelled && current?.active && current.target)
      place(current.id, sections.findIndex((s) => s.id === current.target) + 1);
  };
  return (
    <>
      <p className="muted section-order-help">
        Задайте номер и нажмите Enter либо перетащите за значок ⋮⋮. С клавиатуры
        используйте стрелки.
      </p>
      {sections.map((section, index) => (
        <div
          key={section.id}
          data-section-id={section.id}
          className={`section-row ${section.id === selectedId ? "selected" : ""} ${section.id === overId ? "drop-target" : ""}`}
        >
          <PositionInput
            position={index + 1}
            total={sections.length}
            title={section.title || sectionNames[section.type]}
            onPlace={(position) => place(section.id, position)}
          />
          <button
            className="section-select"
            onClick={() => onSelect(section.id)}
          >
            <span>
              <strong>{section.title || sectionNames[section.type]}</strong>
              <small>
                {sectionNames[section.type]}
                {!section.visible && " · Скрыта"}
              </small>
            </span>
          </button>
          <button
            className="section-drag-handle"
            aria-label={`Перетащить секцию ${section.title}`}
            aria-describedby="section-drag-help"
            onKeyDown={(e) => {
              if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                e.preventDefault();
                place(section.id, index + (e.key === "ArrowUp" ? 0 : 2));
              }
            }}
            onPointerDown={(e) => {
              if (e.button !== 0 || !e.isPrimary) return;
              e.preventDefault();
              e.currentTarget.focus();
              e.currentTarget.setPointerCapture(e.pointerId);
              gesture.current = {
                id: section.id,
                y: e.clientY,
                x: e.clientX,
                pointerY: e.clientY,
                pane: e.currentTarget.closest<HTMLElement>(".section-list")!,
                active: false,
                target: null,
              };
              frame.current = requestAnimationFrame(scrollDrag);
            }}
            onPointerMove={(e) => {
              const current = gesture.current;
              if (!current) return;
              if (Math.abs(e.clientY - current.y) > 6) current.active = true;
              if (!current.active) return;
              current.x = e.clientX;
              current.pointerY = e.clientY;
              updateTarget();
            }}
            onPointerUp={(e) => finish(e)}
            onPointerCancel={(e) => finish(e, true)}
          >
            <GripVertical size={16} />
          </button>
          <div className="section-order">
            <button
              disabled={index === 0}
              aria-label={`Поднять ${section.title}`}
              onClick={() => place(section.id, index)}
            >
              <ArrowUp size={14} />
            </button>
            <button
              disabled={index === sections.length - 1}
              aria-label={`Опустить ${section.title}`}
              onClick={() => place(section.id, index + 2)}
            >
              <ArrowDown size={14} />
            </button>
          </div>
        </div>
      ))}
      <span id="section-drag-help" className="visually-hidden">
        Удерживайте и переместите на другую секцию или используйте клавиши вверх
        и вниз.
      </span>
      <p className="muted" role="status" aria-live="polite">
        {message}
      </p>
    </>
  );
}
