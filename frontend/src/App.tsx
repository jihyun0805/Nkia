import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Finding from "./pages/Finding";
import Activity from "./pages/Activity";
import Bid from "./pages/Bid";
import Contract from "./pages/Contract";
import Project from "./pages/Project";
import Maintenance from "./pages/Maintenance";
import PostSales from "./pages/PostSales";
import Admin from "./pages/Admin";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="finding" element={<Finding />} />
          <Route path="activity" element={<Activity />} />
          <Route path="bid" element={<Bid />} />
          <Route path="contract" element={<Contract />} />
          <Route path="project" element={<Project />} />
          <Route path="maintenance" element={<Maintenance />} />
          <Route path="post-sales" element={<PostSales />} />
          <Route path="admin" element={<Admin />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
