"use client";

import { useEffect, useMemo, useState } from "react";
import {
  approvePrompt,
  createAdminLlm,
  deleteAdminLlm,
  fetchAdminLlms,
  fetchPendingPrompts,
  rejectPrompt,
} from "@/data/adminApi";
import { Prompt } from "@/types/prompt";
import { LlmOption } from "@/data/llmApi";

export default function SecretAdminPage() {
  const [secret, setSecret] = useState("");

  const [tab, setTab] = useState<"pending" | "llms">("pending");
  const [pending, setPending] = useState<Prompt[]>([]);
  const [llms, setLlms] = useState<LlmOption[]>([]);
  const [newLlmName, setNewLlmName] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pendingCount = pending.length;
  const activeLlms = useMemo(() => llms.filter((m) => m.active), [llms]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  }

  async function loadPending() {
    if (!secret) return;
    setLoading(true);
    try {
      setPending(await fetchPendingPrompts(secret));
    } finally {
      setLoading(false);
    }
  }

  async function loadLlms() {
    if (!secret) return;
    setLoading(true);
    try {
      setLlms(await fetchAdminLlms(secret));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSecret((params.get("secret") ?? "").trim());
  }, []);

  useEffect(() => {
    if (tab === "pending") void loadPending();
    if (tab === "llms") void loadLlms();
  }, [tab, secret]);

  return (
    <main>
      <header>
        <div className="header-inner">
          <a className="logo" href="/">
            <div className="logo-icon">MP</div>Marketplace<span> de Prompts</span>
          </a>
          <div className="nav-pills">
            <span>~/secret-admin</span>
          </div>
          <div className="header-right">
            <div className="stats-bar">
              <span>
                pendentes: <b>{pendingCount}</b>
              </span>
              <span>
                llms ativas: <b>{activeLlms.length}</b>
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="main-wrap">
        <aside className="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-label">// admin</div>
            <div className="view-actions">
              <button className={`btn-md ${tab === "pending" ? "active-tab" : ""}`} onClick={() => setTab("pending")} type="button">
                prompts pendentes
              </button>
              <button className={`btn-md ${tab === "llms" ? "active-tab" : ""}`} onClick={() => setTab("llms")} type="button">
                llms
              </button>
            </div>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-label">// segredo</div>
            <div className="tag-list">
              <div className="tag-item">
                <span>{secret ? `secret: ${secret}` : "adicione ?secret=... na URL"}</span>
              </div>
            </div>
          </div>
        </aside>

        <main>
          {!secret ? (
            <div className="empty" style={{ padding: 24 }}>
              <div style={{ fontSize: "14px", color: "var(--text2)" }}>falta o segredo</div>
              <p style={{ marginTop: 8 }}>
                Abra esta pagina como <code>/s?secret=SEU_ADMIN_SECRET</code>.
              </p>
            </div>
          ) : (
            <>
              {loading ? <p>Carregando...</p> : null}

              {tab === "pending" ? (
                pending.length ? (
                  pending.map((p) => (
                    <div key={p.id} className="card" style={{ cursor: "default" }}>
                      <div className="card-header">
                        <div className="card-title">{p.title}</div>
                        <div className="view-actions" style={{ marginLeft: "auto" }}>
                          <button
                            className="btn-copy"
                            type="button"
                            onClick={async () => {
                              try {
                                await approvePrompt(secret, p.id);
                                await loadPending();
                                showToast("aprovado");
                              } catch (err) {
                                showToast((err as Error).message);
                              }
                            }}
                          >
                            aprovar
                          </button>
                          <button
                            className="btn-md"
                            type="button"
                            onClick={async () => {
                              try {
                                await rejectPrompt(secret, p.id);
                                await loadPending();
                                showToast("reprovado");
                              } catch (err) {
                                showToast((err as Error).message);
                              }
                            }}
                          >
                            reprovar
                          </button>
                        </div>
                      </div>
                      <div className="card-desc">{p.desc || "sem descricao"}</div>
                      <div className="card-preview">
                        {p.body.slice(0, 240)}
                        {p.body.length > 240 ? "..." : ""}
                      </div>
                      <div className="card-footer">
                        <span className="meta">email: {p.author || "—"}</span>
                        {p.model ? <span className="meta">modelo: {p.model}</span> : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty" style={{ padding: 24 }}>
                    <div style={{ fontSize: "14px", color: "var(--text2)" }}>sem prompts pendentes</div>
                  </div>
                )
              ) : (
                <>
                  <div className="view-actions" style={{ marginBottom: 12 }}>
                    <input
                      className="field-input"
                      placeholder="nova llm (ex.: gpt-4.1)"
                      value={newLlmName}
                      onChange={(e) => setNewLlmName(e.target.value)}
                    />
                    <button
                      className="btn-copy"
                      type="button"
                      onClick={async () => {
                        const name = newLlmName.trim();
                        if (!name) {
                          showToast("Digite o nome da LLM");
                          return;
                        }
                        try {
                          await createAdminLlm(secret, name);
                          setNewLlmName("");
                          await loadLlms();
                          showToast("LLM cadastrada");
                        } catch (err) {
                          showToast((err as Error).message);
                        }
                      }}
                    >
                      cadastrar
                    </button>
                  </div>

                  {llms.length ? (
                    llms.map((m) => (
                      <div key={m.id} className="card" style={{ cursor: "default" }}>
                        <div className="card-header">
                          <div className="card-title">
                            {m.name} {!m.active ? <span className="llm-inactive-pill">inativa</span> : null}
                          </div>
                          <div className="view-actions" style={{ marginLeft: "auto" }}>
                            <button
                              className="btn-md"
                              type="button"
                              onClick={async () => {
                                try {
                                  const result = await deleteAdminLlm(secret, m.id);
                                  await loadLlms();
                                  showToast(result.deleted ? "LLM removida" : "LLM inativada (ja estava em uso)");
                                } catch (err) {
                                  showToast((err as Error).message);
                                }
                              }}
                            >
                              remover/inativar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty" style={{ padding: 24 }}>
                      <div style={{ fontSize: "14px", color: "var(--text2)" }}>nenhuma llm cadastrada</div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </main>
      </div>

      {toast ? (
        <div className="toast">
          <span className="dot" />
          {toast}
        </div>
      ) : null}
    </main>
  );
}

