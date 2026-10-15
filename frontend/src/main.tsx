import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { store } from "./store";
import { PublicSite } from "./pages/PublicSite";
import { Admin } from "./pages/Admin";
import { Workspace } from "./pages/Workspace";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <Routes>
          <Route path="/admin/*" element={<Admin />} />
          <Route path="/analytics/*" element={<Workspace mode="analytics" />} />
          <Route path="/management/*" element={<Workspace mode="management" />} />
          <Route path="*" element={<PublicSite />} />
        </Routes>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>,
);
