import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import PropertyInputPage from './pages/PropertyInputPage';
import RoomConfigurationPage from './pages/RoomConfigurationPage';
import ResultsPage from './pages/ResultsPage';
import AdminPage from './pages/AdminPage';
import EstimateEditPage from './pages/EstimateEditPage';
import ViewEstimatePage from './pages/ViewEstimatePage';
import ToolsLandingPage from './pages/ToolsLandingPage';
import RequireAuth from './components/RequireAuth';
import RequireOptIn from './components/RequireOptIn';
import OptInPage from './pages/OptInPage';
import RoiEstimatorLandingPage from './tools/roi-estimator/RoiEstimatorLandingPage';
import RoiEstimatorInputPage from './tools/roi-estimator/RoiEstimatorInputPage';
import RoiEstimatorResultsPage from './tools/roi-estimator/RoiEstimatorResultsPage';
import RoiProjectionViewPage from './tools/roi-estimator/RoiProjectionViewPage';
import ReportsPage from './pages/reports/ReportsPage';
import RoiProjectionEditPage from './tools/roi-estimator/RoiProjectionEditPage';
import OptInCallbackPage from './pages/OptInCallbackPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen">
        <Routes>
          <Route path="/" element={<Navigate to="/tools" replace />} />
          <Route path="/sign-in" element={<Navigate to="/" replace />} />
          <Route path="/opt-in" element={<OptInPage />} />
          <Route path="/opt-in/callback" element={<OptInCallbackPage />} />
          <Route path="/tools" element={<RequireOptIn />}>
            <Route index element={<ToolsLandingPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="budget-estimator">
              <Route index element={<LandingPage />} />
              <Route path="property" element={<PropertyInputPage />} />
              <Route path="rooms" element={<RoomConfigurationPage />} />
              <Route path="results" element={<ResultsPage />} />
              <Route path="estimate/edit/:estimateId" element={<EstimateEditPage />} />
              <Route path="estimate/view/:estimateId" element={<ViewEstimatePage />} />
            </Route>
            <Route path="roi-estimator">
              <Route index element={<RoiEstimatorLandingPage />} />
              <Route path="inputs" element={<RoiEstimatorInputPage />} />
              <Route path="results" element={<RoiEstimatorResultsPage />} />
              <Route path="projection/view/:projectionId" element={<RoiProjectionViewPage />} />
              <Route path="projection/edit/:projectionId" element={<RoiProjectionEditPage />} />
            </Route>
          </Route>
          <Route path="/admin" element={<RequireAuth requireAdmin />}>
            <Route index element={<AdminPage />} />
          </Route>
          <Route path="/property" element={<Navigate to="/tools/budget-estimator/property" replace />} />
          <Route path="/rooms" element={<Navigate to="/tools/budget-estimator/rooms" replace />} />
          <Route path="/results" element={<Navigate to="/tools/budget-estimator/results" replace />} />
          <Route path="/estimate/edit/:estimateId" element={<Navigate to="/tools/budget-estimator/estimate/edit/:estimateId" replace />} />
          <Route path="/estimate/view/:estimateId" element={<Navigate to="/tools/budget-estimator/estimate/view/:estimateId" replace />} />
          <Route path="*" element={<Navigate to="/tools" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
