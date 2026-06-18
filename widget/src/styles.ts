export const styles = (accent: string) => `
  :host { all: initial; }
  .ai-root { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; color: #111827; }

  .ai-fab {
    position: fixed; right: 24px; bottom: 24px; width: 56px; height: 56px;
    border-radius: 9999px; border: 0; cursor: pointer;
    background: ${accent}; color: #fff;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 10px 25px rgba(0,0,0,.15);
    transition: transform .12s ease;
  }
  .ai-fab:hover { transform: translateY(-2px); }
  .ai-fab--hidden { display: none; }

  .ai-panel {
    position: fixed; right: 24px; bottom: 24px;
    width: min(380px, calc(100vw - 32px));
    height: min(560px, calc(100vh - 32px));
    background: #fff; border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0,0,0,.2);
    display: none; flex-direction: column;
    overflow: hidden;
  }
  .ai-panel--open { display: flex; }

  .ai-header {
    padding: 14px 16px;
    border-bottom: 1px solid #e5e7eb;
    display: flex; justify-content: space-between; align-items: center;
    background: ${accent}; color: #fff;
  }
  .ai-header strong { font-weight: 600; }
  .ai-close { background: transparent; border: 0; color: #fff; font-size: 22px; line-height: 1; cursor: pointer; }

  .ai-log { flex: 1; overflow-y: auto; padding: 16px; background: #f9fafb; display: flex; flex-direction: column; gap: 10px; }
  .ai-empty { color: #6b7280; font-size: 13px; text-align: center; padding-top: 40%; }

  .ai-msg { max-width: 85%; padding: 10px 12px; border-radius: 12px; line-height: 1.45; word-wrap: break-word; }
  .ai-msg p { margin: 0; white-space: pre-wrap; }
  .ai-msg-user { align-self: flex-end; background: ${accent}; color: #fff; }
  .ai-msg-assistant { align-self: flex-start; background: #fff; border: 1px solid #e5e7eb; }

  .ai-chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
  .ai-chip {
    display: inline-flex; align-items: center;
    font-size: 11px; padding: 2px 6px;
    border-radius: 9999px; background: #eef2ff; color: #3730a3;
    text-decoration: none;
  }
  .ai-chip:hover { background: #c7d2fe; }

  .ai-input { display: flex; gap: 8px; padding: 10px 12px; border-top: 1px solid #e5e7eb; background: #fff; }
  .ai-input input {
    flex: 1; border: 1px solid #d1d5db; border-radius: 8px; padding: 8px 10px;
    font: inherit; outline: none; background: #fff; color: inherit;
  }
  .ai-input input:focus { border-color: ${accent}; }
  .ai-input button {
    border: 0; border-radius: 8px; padding: 0 14px;
    background: ${accent}; color: #fff; font-size: 18px; cursor: pointer;
  }

  .ai-footer { padding: 6px 12px; font-size: 11px; color: #9ca3af; text-align: center; background: #fff; }
  .ai-footer a { color: #6b7280; text-decoration: none; }
  .ai-footer a:hover { text-decoration: underline; }
`;
