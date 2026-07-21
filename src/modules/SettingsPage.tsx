import React from "react";
import { useStore } from "../lib/store";
import { Card } from "../components/ui";
import { Icon } from "../components/Icon";

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, toast } = useStore();
  return (
    <div className="col" style={{ gap: 16, maxWidth: 760 }}>
      <Card title="Identity" sub="Personalize the platform for your desk">
        <div className="grid g-2" style={{ gap: 14 }}>
          <label className="field">Your name<input className="input" value={settings.brokerName} onChange={(e) => updateSettings({ brokerName: e.target.value })} /></label>
          <label className="field">Firm<input className="input" value={settings.firmName} onChange={(e) => updateSettings({ firmName: e.target.value })} /></label>
        </div>
      </Card>

      <Card title="AI Analyst" sub="Connect Anthropic to unlock full cross-market reasoning">
        <div className="col" style={{ gap: 14 }}>
          <label className="field">Anthropic API key
            <input className="input" type="password" placeholder="sk-ant-…" value={settings.anthropicKey} onChange={(e) => updateSettings({ anthropicKey: e.target.value })} />
          </label>
          <label className="field">Model
            <select className="select" value={settings.model} onChange={(e) => updateSettings({ model: e.target.value })}>
              <option value="claude-opus-4-8">Claude Opus 4.8 — deepest analysis</option>
              <option value="claude-sonnet-5">Claude Sonnet 5 — balanced (recommended)</option>
              <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 — fastest</option>
            </select>
          </label>
          <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
            <Icon name="info" size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />
            The key is stored only in this browser and used to call Anthropic directly from the page. Without a key, the Analyst still answers from your live data using a built-in local model. Get a key at <span className="mono">console.anthropic.com</span>.
          </div>
        </div>
      </Card>

      <Card title="Live public data (Redress)" sub="Optional keys for live benchmark pulls">
        <div className="col" style={{ gap: 14 }}>
          <label className="field">FRED API key (inflation / SOFR)
            <input className="input" type="password" placeholder="Optional — free at fredaccount.stlouisfed.org" value={settings.fredKey} onChange={(e) => updateSettings({ fredKey: e.target.value })} />
          </label>
          <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
            <Icon name="info" size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />
            The <strong>Redress</strong> button (top bar) pulls the latest US Treasury yield curve (no key required) and — with a FRED key — CPI &amp; SOFR. If a source can't be reached from your browser, the app keeps the last-known values and tells you.
          </div>
        </div>
      </Card>

      <Card title="Appearance">
        <div className="row" style={{ gap: 10 }}>
          <button className={"btn " + (settings.theme === "dark" ? "btn-primary" : "")} onClick={() => updateSettings({ theme: "dark" })}><Icon name="moon" size={15} /> Dark</button>
          <button className={"btn " + (settings.theme === "light" ? "btn-primary" : "")} onClick={() => updateSettings({ theme: "light" })}><Icon name="sun" size={15} /> Light</button>
        </div>
      </Card>

      <Card title="How Meridian is built" sub="Architecture at a glance">
        <div className="col" style={{ gap: 8, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
          <div><strong style={{ color: "var(--text-primary)" }}>Local-first.</strong> All records live in your browser (private). Nothing is sent anywhere unless you export, refresh public data, or ask the AI.</div>
          <div><strong style={{ color: "var(--text-primary)" }}>Excel is the loading dock.</strong> Import/export uses .xlsx; the analytics and underwriting math run in versioned code — not spreadsheet cells — so results are reliable and auditable.</div>
          <div><strong style={{ color: "var(--text-primary)" }}>Public vs internal.</strong> Every record is tagged; public-sourced data flows into the Redress queue for verification before it informs a valuation.</div>
        </div>
      </Card>
    </div>
  );
};
