"use client";

type RefreshButtonProps = {
  loading?: boolean;
  onClick: () => void;
  title?: string;
};

export default function RefreshButton({
  loading = false,
  onClick,
  title = "Refresh",
}: RefreshButtonProps) {
  return (
    <button
      type="button"
      className="admin-icon-button"
      onClick={onClick}
      disabled={loading}
      title={title}
      aria-label={title}
    >
      <span
        className={loading ? "admin-refresh-icon spinning" : "admin-refresh-icon"}
      >
        ⟳
      </span>
    </button>
  );
}