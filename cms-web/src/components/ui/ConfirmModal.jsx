import Button from "./Button";

function ConfirmModal({ open, title, message, onConfirm, onCancel, confirmText = "Confirm" }) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 20,
      }}
    >
      <div style={{ background: "#fff", padding: "20px", borderRadius: "8px", minWidth: "320px" }}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <Button onClick={onCancel}>Cancel</Button>
          <Button onClick={onConfirm}>{confirmText}</Button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
