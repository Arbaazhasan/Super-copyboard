import React from 'react';
import { AppSettings } from '../lib/types';
import { X, Shield, Clock, HardDrive, Monitor, Keyboard, Check } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSetting,
}) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 overflow-hidden animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm max-h-[88vh] flex flex-col bg-yaru-cardBg border border-white/15 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header - Fixed at top */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-bold text-white">Copyboard Settings</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content - Scrollable area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs no-scrollbar">

          {/* History Limit */}
          <div className="space-y-1.5">
            <label className="flex items-center space-x-2 font-medium text-white/90">
              <HardDrive className="w-3.5 h-3.5 text-yaru-orange" />
              <span>History Limit</span>
            </label>
            <p className="text-[11px] text-yaru-textMuted">
              Maximum unpinned entries retained in local SQLite database.
            </p>
            <select
              value={settings.historyLimit}
              onChange={(e) => onUpdateSetting('historyLimit', Number(e.target.value))}
              className="w-full px-3 py-1.5 bg-yaru-darkBg border border-white/10 rounded-lg text-white outline-none focus:border-yaru-orange text-xs"
            >
              <option value={100}>100 items</option>
              <option value={500}>500 items (Recommended)</option>
              <option value={1000}>1,000 items</option>
              <option value={5000}>5,000 items</option>
            </select>
          </div>

          {/* Auto-delete retention */}
          <div className="space-y-1.5">
            <label className="flex items-center space-x-2 font-medium text-white/90">
              <Clock className="w-3.5 h-3.5 text-yaru-orange" />
              <span>Auto-Purge Retention</span>
            </label>
            <p className="text-[11px] text-yaru-textMuted">
              Automatically purge unpinned items older than this duration.
            </p>
            <select
              value={settings.autoDeleteDuration}
              onChange={(e) =>
                onUpdateSetting('autoDeleteDuration', e.target.value as AppSettings['autoDeleteDuration'])
              }
              className="w-full px-3 py-1.5 bg-yaru-darkBg border border-white/10 rounded-lg text-white outline-none focus:border-yaru-orange text-xs"
            >
              <option value="never">Never auto-delete</option>
              <option value="1h">After 1 hour</option>
              <option value="24h">After 24 hours</option>
              <option value="7d">After 7 days</option>
              <option value="30d">After 30 days</option>
            </select>
          </div>

          {/* Privacy & Password Detection */}
          <div className="pt-2 border-t border-white/5 flex items-center justify-between">
            <div className="space-y-0.5 pr-2">
              <div className="flex items-center space-x-2 font-medium text-white/90">
                <Shield className="w-3.5 h-3.5 text-yaru-orange" />
                <span>Password & Secret Shield</span>
              </div>
              <p className="text-[11px] text-yaru-textMuted">
                Ignore password manager hints, API keys & bearer tokens.
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.ignorePasswords}
              onChange={(e) => onUpdateSetting('ignorePasswords', e.target.checked)}
              className="w-4 h-4 rounded accent-yaru-orange cursor-pointer"
            />
          </div>

          {/* Wayland Paste Method */}
          <div className="space-y-1.5 pt-2 border-t border-white/5">
            <label className="flex items-center space-x-2 font-medium text-white/90">
              <Monitor className="w-3.5 h-3.5 text-yaru-orange" />
              <span>Wayland Paste Method</span>
            </label>
            <select
              value={settings.pasteMethod}
              onChange={(e) =>
                onUpdateSetting('pasteMethod', e.target.value as AppSettings['pasteMethod'])
              }
              className="w-full px-3 py-1.5 bg-yaru-darkBg border border-white/10 rounded-lg text-white outline-none focus:border-yaru-orange text-xs"
            >
              <option value="auto">Auto-detect (wtype / xdotool)</option>
              <option value="wtype">wtype (Native Wayland)</option>
              <option value="xdotool">xdotool (X11 / Xwayland)</option>
              <option value="manual">Manual copy only (No synthetic paste)</option>
            </select>
          </div>

          {/* Global Shortcut */}
          <div className="space-y-1.5 pt-2 border-t border-white/5">
            <label className="flex items-center space-x-2 font-medium text-white/90">
              <Keyboard className="w-3.5 h-3.5 text-yaru-orange" />
              <span>Global Shortcut</span>
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={settings.shortcut}
                readOnly
                className="w-full px-3 py-1.5 bg-yaru-darkBg border border-white/10 rounded-lg text-white font-mono text-xs"
              />
              <span className="text-[10px] text-yaru-textMuted whitespace-nowrap">
                Win + V / Super + V
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer - Fixed at bottom */}
        <div className="flex-shrink-0 px-4 py-2.5 bg-yaru-darkBg/95 border-t border-white/10 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 text-xs font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-yaru-orange hover:bg-yaru-orange-hover text-white rounded-lg text-xs font-semibold shadow-md shadow-yaru-orange/20 transition-all active:scale-95"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save & Done</span>
          </button>
        </div>

      </div>
    </div>
  );
};
