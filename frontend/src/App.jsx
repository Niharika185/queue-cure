import { Routes, Route, Link } from "react-router-dom";
import Reception from "./pages/Reception.jsx";
import WaitingRoom from "./pages/WaitingRoom.jsx";

export default function App() {
  return (
    <div>
      <nav className="nav">
        <span className="brand">Queue Cure</span>
        <div className="nav-links">
          <Link to="/reception">Receptionist</Link>
          <Link to="/waiting">Patient Waiting Room</Link>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<WaitingRoom />} />
        <Route path="/reception" element={<Reception />} />
        <Route path="/waiting" element={<WaitingRoom />} />
      </Routes>
    </div>
  );
}