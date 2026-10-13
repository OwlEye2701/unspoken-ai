"use client";

import { useState, useActionState } from "react";
import {
  handleGrantTester,
  handleRevokeTester,
  handleGrantCredits,
  type OwnerActionResult,
} from "./actions";

interface UserItem {
  id: string;
  email: string;
  role: string;
  ageEligible: boolean;
  balance: number;
  hasUnlimitedCredits: boolean;
  plan: string;
  status: string;
  createdAt: string;
}

interface AuditItem {
  id: string;
  action: string;
  actorEmail: string;
  targetUserEmail: string;
  details: Record<string, unknown>;
  createdAt: string;
}

const initialActionState: OwnerActionResult = {};

export function OwnerConsoleClient({
  users,
  auditLogs,
}: {
  users: UserItem[];
  auditLogs: AuditItem[];
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [activeTab, setActiveTab] = useState<"users" | "logs">("users");

  const [grantState, grantTesterAction, isGranting] = useActionState(
    handleGrantTester,
    initialActionState
  );
  const [revokeState, revokeTesterAction, isRevoking] = useActionState(
    handleRevokeTester,
    initialActionState
  );
  const [creditState, grantCreditAction, isCrediting] = useActionState(
    handleGrantCredits,
    initialActionState
  );

  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase();
    return u.email.toLowerCase().includes(term) || u.id.toLowerCase().includes(term);
  });

  return (
    <div>
      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: "1.5rem" }}>
        <button
          type="button"
          className={`tab ${activeTab === "users" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          User Accounts & Permissions ({users.length})
        </button>
        <button
          type="button"
          className={`tab ${activeTab === "logs" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("logs")}
        >
          Audit Ledger ({auditLogs.length})
        </button>
      </div>

      {/* Global Alerts for actions */}
      {(grantState.error || revokeState.error || creditState.error) && (
        <div className="alert alert-error" style={{ marginBottom: "1rem" }}>
          <span>⚠</span>
          <span>{grantState.error || revokeState.error || creditState.error}</span>
        </div>
      )}
      {(grantState.message || revokeState.message || creditState.message) && (
        <div className="alert alert-success" style={{ marginBottom: "1rem" }}>
          <span>✓</span>
          <span>{grantState.message || revokeState.message || creditState.message}</span>
        </div>
      )}

      {activeTab === "users" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Search box */}
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <input
              type="text"
              placeholder="Search by user email or ID..."
              className="input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ maxWidth: "400px" }}
            />
          </div>

          {/* User List Table */}
          <div className="card" style={{ padding: 0, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left", background: "var(--bg-surface)" }}>
                  <th style={{ padding: "0.75rem 1rem" }}>User</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Role</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Age Gate (16+)</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Credits</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Plan</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                      No accounts matching query
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: "1px solid var(--border-subtle)",
                        background: selectedUser?.id === u.id ? "rgba(192, 132, 252, 0.05)" : "transparent",
                      }}
                    >
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <div style={{ fontWeight: 500 }}>{u.email}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                          {u.id}
                        </div>
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <span
                          style={{
                            padding: "0.2rem 0.5rem",
                            borderRadius: "4px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            background:
                              u.role === "owner"
                                ? "rgba(192, 132, 252, 0.2)"
                                : u.role === "tester"
                                ? "rgba(251, 191, 36, 0.2)"
                                : "rgba(255, 255, 255, 0.05)",
                            color:
                              u.role === "owner"
                                ? "var(--accent)"
                                : u.role === "tester"
                                ? "var(--warning)"
                                : "var(--text-secondary)",
                          }}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        {u.ageEligible ? (
                          <span style={{ color: "var(--success)" }}>✓ Eligible (16+)</span>
                        ) : (
                          <span style={{ color: "var(--danger)" }}>✗ Unverified</span>
                        )}
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <span style={{ fontWeight: 600 }}>{u.hasUnlimitedCredits ? "∞ Unlimited" : u.balance}</span>
                      </td>
                      <td style={{ padding: "0.75rem 1rem", textTransform: "capitalize" }}>
                        {u.plan} ({u.status})
                      </td>
                      <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedUser(selectedUser?.id === u.id ? null : u)}
                        >
                          {selectedUser?.id === u.id ? "Close" : "Manage"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* User Management Action Drawer / Panel */}
          {selectedUser && (
            <div className="card animate-fadeUp" style={{ padding: "1.5rem", border: "1px solid var(--accent-dim)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 600 }}>
                    Manage Account: <span style={{ color: "var(--accent)" }}>{selectedUser.email}</span>
                  </h3>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    User ID: {selectedUser.id}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setSelectedUser(null)}
                >
                  ✕ Close
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "1.5rem",
                  marginTop: "1rem",
                }}
              >
                {/* Tester Permission Box */}
                <div style={{ padding: "1rem", border: "1px solid var(--border)", borderRadius: "8px" }}>
                  <h4 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                    Tester Permissions
                  </h4>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                    Grant or revoke restricted tester privileges (e.g. for testing pre-release models and features).
                  </p>

                  {selectedUser.role === "tester" ? (
                    <form action={revokeTesterAction}>
                      <input type="hidden" name="targetUserId" value={selectedUser.id} />
                      <button
                        type="submit"
                        className="btn btn-danger btn-sm"
                        disabled={isRevoking}
                        onClick={(e) => {
                          if (!confirm(`Revoke tester permissions from ${selectedUser.email}?`)) {
                            e.preventDefault();
                          }
                        }}
                      >
                        {isRevoking ? "Revoking…" : "Revoke Tester Role"}
                      </button>
                    </form>
                  ) : selectedUser.role === "user" ? (
                    <form action={grantTesterAction} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      <input type="hidden" name="targetUserId" value={selectedUser.id} />
                      <div className="field">
                        <label className="label" style={{ fontSize: "0.75rem" }}>
                          Initial test credits to grant:
                        </label>
                        <input
                          type="number"
                          name="initialCredits"
                          defaultValue={50}
                          min={0}
                          max={1000}
                          className="input"
                          style={{ maxWidth: "120px" }}
                        />
                      </div>
                      <button
                        type="submit"
                        className="btn btn-primary btn-sm"
                        disabled={isGranting || !selectedUser.ageEligible}
                        onClick={(e) => {
                          if (!selectedUser.ageEligible) {
                            alert("Cannot grant tester role: user has not completed 16+ age verification.");
                            e.preventDefault();
                            return;
                          }
                          if (!confirm(`Grant tester role to ${selectedUser.email}?`)) {
                            e.preventDefault();
                          }
                        }}
                      >
                        {isGranting ? "Granting…" : "Grant Tester Role"}
                      </button>
                      {!selectedUser.ageEligible && (
                        <p style={{ fontSize: "0.75rem", color: "var(--danger)" }}>
                          User must pass 16+ age gate before being granted tester status.
                        </p>
                      )}
                    </form>
                  ) : (
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      Account is already an Owner.
                    </p>
                  )}
                </div>

                {/* Grant Additional Credits Box */}
                <div style={{ padding: "1rem", border: "1px solid var(--border)", borderRadius: "8px" }}>
                  <h4 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                    Grant Additional Credits
                  </h4>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                    Manually credit user with a logged reason in the immutable audit ledger.
                  </p>

                  <form action={grantCreditAction} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <input type="hidden" name="targetUserId" value={selectedUser.id} />
                    <div className="field">
                      <label className="label" style={{ fontSize: "0.75rem" }}>
                        Credits Amount:
                      </label>
                      <input
                        type="number"
                        name="amount"
                        defaultValue={25}
                        min={1}
                        max={10000}
                        required
                        className="input"
                        style={{ maxWidth: "140px" }}
                      />
                    </div>
                    <div className="field">
                      <label className="label" style={{ fontSize: "0.75rem" }}>
                        Reason / Notes:
                      </label>
                      <input
                        type="text"
                        name="reason"
                        placeholder="e.g. VIP test allowance, goodwill credit"
                        required
                        className="input"
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn btn-secondary btn-sm"
                      disabled={isCrediting || !selectedUser.ageEligible}
                    >
                      {isCrediting ? "Crediting…" : "Grant Credits"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "logs" && (
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left", background: "var(--bg-surface)" }}>
                <th style={{ padding: "0.75rem 1rem" }}>Timestamp</th>
                <th style={{ padding: "0.75rem 1rem" }}>Action</th>
                <th style={{ padding: "0.75rem 1rem" }}>Actor</th>
                <th style={{ padding: "0.75rem 1rem" }}>Target User</th>
                <th style={{ padding: "0.75rem 1rem" }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                    No audit records yet
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>{log.action}</td>
                    <td style={{ padding: "0.75rem 1rem" }}>{log.actorEmail}</td>
                    <td style={{ padding: "0.75rem 1rem" }}>{log.targetUserEmail}</td>
                    <td style={{ padding: "0.75rem 1rem", fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
