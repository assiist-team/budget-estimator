import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import PropertyInputPage from './pages/PropertyInputPage';
import RoomConfigurationPage from './pages/RoomConfigurationPage';
import ResultsPage from './pages/ResultsPage';
import AdminPage from './pages/AdminPage';
import EstimateEditPage from './pages/EstimateEditPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/property" element={<PropertyInputPage />} />
          <Route path="/rooms" element={<RoomConfigurationPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/edit/:estimateId" element={<EstimateEditPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
