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
import SignInPage from './pages/SignInPage';
import RoiEstimatorInputPage from './tools/roi-estimator/RoiEstimatorInputPage';
import RoiEstimatorResultsPage from './tools/roi-estimator/RoiEstimatorResultsPage';
import RoiProjectionViewPage from './tools/roi-estimator/RoiProjectionViewPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen">
        <Routes>
          <Route path="/" element={<Navigate to="/tools" replace />} />
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/tools" element={<RequireAuth />}>
            <Route index element={<ToolsLandingPage />} />
            <Route path="budget-estimator" element={<RequireAuth requiredToolId="budget-estimator" />}>
              <Route index element={<LandingPage />} />
              <Route path="property" element={<PropertyInputPage />} />
              <Route path="rooms" element={<RoomConfigurationPage />} />
              <Route path="results" element={<ResultsPage />} />
              <Route path="estimate/edit/:estimateId" element={<EstimateEditPage />} />
              <Route path="estimate/view/:estimateId" element={<ViewEstimatePage />} />
            </Route>
            <Route path="roi-estimator" element={<RequireAuth requiredToolId="roi-estimator" />}>
              <Route index element={<RoiEstimatorInputPage />} />
              <Route path="results" element={<RoiEstimatorResultsPage />} />
              <Route path="projection/view/:projectionId" element={<RoiProjectionViewPage />} />
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
