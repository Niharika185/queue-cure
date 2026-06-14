import { useEffect, useState } from "react";
import axios from "axios";
import { socket, API_BASE } from "../socket";

export default function WaitingRoom() {
  const [state, setState] = useState({
    serving: null,
    waiting: [],
    avgConsultationTime: 5,
    totalWaiting: 0,
  });

  useEffect(() => {
    // Initial load
    axios.get(`${API_BASE}/api/queue`).then((res) => setState(res.data));

    // Live updates
    socket.on("queue:updated", (data) => setState(data));

    return () => socket.off("queue:updated");
  }, []);

  return (
    <div className="page">
      <h1>Patient Waiting Room</h1>

      <section className="card center">
        <h2>Now Serving</h2>
        {state.serving ? (
          <div className="big-token">#{state.serving.tokenNumber}</div>
        ) : (
          <div className="big-token muted">--</div>
        )}
        {state.serving && (
          <p className="patient-name">{state.serving.patientName}</p>
        )}
      </section>

      <section className="card center">
        <h2>Tokens Ahead of You</h2>
        <div className="big-number">{state.totalWaiting}</div>
        <p className="muted">
          Average consultation time: {state.avgConsultationTime} min
        </p>
      </section>

      <section className="card">
        <h2>Up Next</h2>
        {state.waiting.length === 0 ? (
          <p className="muted">No one is waiting.</p>
        ) : (
          <table className="queue-table">
            <thead>
              <tr>
                <th>Token</th>
                <th>Patient</th>
                <th>Est. Wait</th>
              </tr>
            </thead>
            <tbody>
              {state.waiting.map((p) => (
                <tr key={p._id}>
                  <td>#{p.tokenNumber}</td>
                  <td>{p.patientName}</td>
                  <td>{p.estimatedWaitMinutes} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}