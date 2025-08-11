import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Link, NavLink } from "react-router-dom";
import App from "./App.jsx";
import "./styles.css";

function Root() {
  return (
    <BrowserRouter>
      <header className="site-header">
        <div className="container row">
          <h1 className="logo">EHS</h1>
          <nav className="nav">
            <NavLink to="/" end>Bell Schedule</NavLink>
            <NavLink to="/announcements">Announcements</NavLink>
            <NavLink to="/admin">Admin</NavLink>
          </nav>
        </div>
      </header>
      <main className="container">
        <App />
      </main>
      <footer className="site-footer">
        <div className="container">
          <small>© {new Date().getFullYear()} EHS</small>
        </div>
      </footer>
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")).render(<Root />);