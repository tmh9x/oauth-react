import { Route, Routes } from "react-router-dom";

import About from "./components/About";
import Home from "./components/Home";
import Login from "./components/Login";
import MeinBereich from "./components/MeinBereich";
import React from "react";

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='about' element={<About />} />
        <Route path='login' element={<Login />} />
        <Route path='myspace' element={<MeinBereich />} />
      </Routes>
    </div>
  );
}

export default App