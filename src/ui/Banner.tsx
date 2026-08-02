interface BannerProps {
  message: string;
  onDismiss: () => void;
}

/** Error/notice banner — icon + text, never color-only (Bible §14). */
export function Banner({ message, onDismiss }: BannerProps) {
  return (
    <div className="banner" role="alert">
      <span aria-hidden="true" className="banner-icon">
        ⚠
      </span>
      <span>{message}</span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss message">
        ✕
      </button>
    </div>
  );
}
