import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { escapeHtml, mapTemplate } from "../../utils/templateTokens";

// Tokenları görsel "pill" olarak gösteren contentEditable şablon alanı.
// Kullanıcı {key} ham metnini görmez; kaydederken arka planda {key}'e serialize edilir.

const TemplateField = forwardRef(function TemplateField(
  {
    value,
    variables,
    multiline = false,
    disabled = false,
    placeholder = "",
    onChange,
  },
  ref
) {
  const elRef = useRef(null);
  const lastSerialized = useRef(null);
  const lastLabelsSig = useRef(null);
  const savedRange = useRef(null);

  const labelByKey = useMemo(() => {
    const map = {};
    for (const v of variables || []) map[v.key] = v.label;
    return map;
  }, [variables]);

  const labelsSig = useMemo(
    () => Object.keys(labelByKey).sort().join(","),
    [labelByKey]
  );

  const chipHtml = (key) => {
    const label = labelByKey[key] || key;
    return `<span class="nrm-token-chip" contenteditable="false" data-key="${key}">${escapeHtml(
      label
    )}</span>`;
  };

  const buildHtml = (template) =>
    mapTemplate(template, {
      onText: escapeHtml,
      onToken: (key, raw) => (labelByKey[key] ? chipHtml(key) : escapeHtml(raw)),
    });

  const serialize = () => {
    const el = elRef.current;
    if (!el) return "";
    let out = "";
    const walk = (node) => {
      node.childNodes.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          out += child.nodeValue;
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          if (child.dataset && child.dataset.key) out += `{${child.dataset.key}}`;
          else if (child.tagName === "BR") out += "\n";
          else walk(child);
        }
      });
    };
    walk(el);
    if (!multiline) out = out.replace(/\n/g, " ");
    return out;
  };

  const emit = () => {
    const s = serialize();
    lastSerialized.current = s;
    onChange?.(s);
  };

  // Dış kaynaklı değer/etiket değişiminde içeriği yeniden kur (yazarken kurmaz).
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    if (lastSerialized.current === value && lastLabelsSig.current === labelsSig) {
      return;
    }
    el.innerHTML = buildHtml(value || "");
    lastSerialized.current = value || "";
    lastLabelsSig.current = labelsSig;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, labelsSig]);

  const saveSelection = () => {
    const el = elRef.current;
    const sel = window.getSelection();
    if (el && sel && sel.rangeCount && el.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  };

  useImperativeHandle(ref, () => ({
    insert(key) {
      const el = elRef.current;
      if (!el || disabled) return;
      el.focus();
      const sel = window.getSelection();
      let range = null;
      if (sel && sel.rangeCount && el.contains(sel.anchorNode)) {
        range = sel.getRangeAt(0);
      } else if (savedRange.current && el.contains(savedRange.current.startContainer)) {
        range = savedRange.current;
      } else {
        range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
      }
      range.deleteContents();
      const holder = document.createElement("span");
      holder.innerHTML = chipHtml(key);
      const chip = holder.firstChild;
      range.insertNode(chip);
      const after = document.createRange();
      after.setStartAfter(chip);
      after.collapse(true);
      sel.removeAllRanges();
      sel.addRange(after);
      savedRange.current = after.cloneRange();
      emit();
    },
  }));

  const handleKeyDown = (e) => {
    if (!multiline && e.key === "Enter") e.preventDefault();
  };

  return (
    <div
      ref={elRef}
      className={`nrm-input nrm-template-field ${multiline ? "nrm-textarea" : ""} ${
        disabled ? "is-disabled" : ""
      }`}
      contentEditable={!disabled}
      role="textbox"
      aria-multiline={multiline}
      data-placeholder={placeholder}
      onInput={emit}
      onKeyDown={handleKeyDown}
      onKeyUp={saveSelection}
      onMouseUp={saveSelection}
      onBlur={saveSelection}
      suppressContentEditableWarning
    />
  );
});

export default TemplateField;
