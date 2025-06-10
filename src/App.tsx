import * as React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { HomePage } from "./page-components/HomePage";
import { SearchPage } from "./page-components/SearchPage";
import { ResultsPage } from "./page-components/ResultsPage";
import { AnalysisPage } from "./page-components/AnalysisPage";
import { AuthProvider } from "./contexts/AuthContext";

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-background">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/analysis" element={<AnalysisPage />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
