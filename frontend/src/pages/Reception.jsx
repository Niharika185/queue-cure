import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { socket, API_BASE } from "../socket";

export default function Reception() {
  const [state, setState] = useState({
    serving: null,
    waiting: [],
    avgConsultationTime: 5,
    totalWaiting: 0,
  });
  const [patientName, setPatientName] = useState("");
  const [avgInput, setAvgInput] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const nameInputRef = useRef(null);

  useEffect(() => {
    // Initial load
    axios.get(`${API_BASE}/api/queue`).then((res) => {
      setState(res.data);
      setAvgInput(res.data.avgConsultationTime);
    });

    // Live updates
    socket.on("queue:updated", (data) => {
      setState(data);
      // Don't clobber the receptionist's in-progress edit of avg time
      setAvgInput((prev) =>
        document.activeElement?.id === "avgInput" ? prev : data.avgConsultationTime
      );
    });

    return () => socket.off("queue:updated");
  }, []);

  const addPatient = async (e) => {
    e.preventDefault();
    const name = patientName.trim();
    if (!name) {
      setError("Please enter a patient name.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/api/queue/add`, { patientName: name });
      setPatientName("");
      nameInputRef.current?.focus();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add patient.");
    } finally {
      setLoading(false);
    }
  };

  const callNext = async () => {
    setLoading(true);
    setError("");
    try {
      await axios.post(`${API_BASE}/api/queue/call-next`);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to call next.");
    } finally {
      setLoading(false);
    }
  };

  const updateAvgTime = async (e) => {
    e.preventDefault();
    const value = Number(avgInput);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Average time must be a positive number.");
      return;
    }
    setError("");
    try {
      await axios.post(`${API_BASE}/api/queue/settings`, {
        avgConsultationTime: value,
      });
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update settings.");
    }
  };

  const resetQueue = async () => {
    if (!window.confirm("Reset the entire queue? This cannot be undone.")) {
      return;
    }
    await axios.post(`${API_BASE}/api/queue/reset`);
  };

  return (
    <div className="page">
      <h1>Receptionist Dashboard</h1>

      {error && <div className="error-banner">{error}</div>}

      <div className="grid">
        {/* Now serving + Call Next */}
        <section className="card">
          <h2>Now Serving</h2>
          {state.serving ? (
            <div className="now-serving">
              <span className="token-number">#{state.serving.tokenNumber}</span>
              <span className="patient-name">{state.serving.patientName}</span>
            </div>
          ) : (
            <p className="muted">No one is currently being served.</p>
          )}

          <button
            className="btn primary"
            onClick={callNext}
            disabled={loading || state.totalWaiting === 0}
          >
            {state.totalWaiting === 0 ? "No patients waiting" : "Call Next"}
          </button>
        </section>

        {/* Add patient */}
        <section className="card">
          <h2>Add Patient</h2>
          <form onSubmit={addPatient} className="form-row">
            <input
              ref={nameInputRef}
              type="text"
              placeholder="Patient name"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              disabled={loading}
              autoFocus
            />
            <button className="btn" type="submit" disabled={loading}>
              Add to Queue
            </button>
          </form>
        </section>

        {/* Avg consultation time */}
        <section className="card">
          <h2>Average Consultation Time</h2>
          <form onSubmit={updateAvgTime} className="form-row">
            <input
              id="avgInput"
              type="number"
              min="1"
              value={avgInput}
              onChange={(e) => setAvgInput(e.target.value)}
            />
            <span>minutes</span>
            <button className="btn" type="submit">
              Update
            </button>
          </form>
          <p className="muted small">
            Used to estimate wait times shown to patients.
          </p>
        </section>
      </div>

      {/* Waiting list */}
      <section className="card">
        <h2>Waiting List ({state.totalWaiting})</h2>
        {state.waiting.length === 0 ? (
          <p className="muted">Queue is empty.</p>
        ) : (
          <table className="queue-table">
            <thead>
              <tr>
                <th>Token</th>
                <th>Patient</th>
                <th>Position</th>
                <th>Est. Wait</th>
              </tr>
            </thead>
            <tbody>
              {state.waiting.map((p, idx) => (
                <tr key={p._id}>
                  <td>#{p.tokenNumber}</td>
                  <td>{p.patientName}</td>
                  <td>{idx + 1}</td>
                  <td>{p.estimatedWaitMinutes} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <button className="btn danger small" onClick={resetQueue}>
        Reset Queue
      </button>
    </div>
  );
}