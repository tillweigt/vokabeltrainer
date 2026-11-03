// Dateien wählen oder hierher ziehen. Gelesen wird nur im Browser, nichts wird hochgeladen.

import { useState } from "react";

export function FileLoader({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [dragging, setDragging] = useState(false);
  return (
    <div
      className={dragging ? "loader dragging" : "loader"}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        onFiles([...event.dataTransfer.files]);
      }}
    >
      <label htmlFor="files" className="button">
        Sicherungsdateien wählen
      </label>
      <input
        id="files"
        className="visually-hidden"
        type="file"
        accept=".json,application/json"
        multiple
        onChange={(event) => {
          onFiles([...(event.target.files ?? [])]);
          event.target.value = ""; // dieselben Dateien lassen sich so erneut wählen
        }}
      />
      <span className="muted">
        oder hierher ziehen. Am besten alle auf einmal. Die Daten bleiben auf diesem Rechner.
      </span>
    </div>
  );
}
