import { BrowserRouter, Routes, Route } from "react-router";
import Home from "./pages/Home";
import CreateBoard from "./pages/CreateBoard";
import Dashboard from "./pages/Dashboard";
import BoardDisplay from "./pages/BoardDisplay";
import PaymentPage from "./pages/PaymentPage";
import Footer from "./components/Footer";
import Header from "./components/Header";
import ZapMe from "./pages/ZapMe";
import ExplorePage from "./pages/ExplorePage";

function App() {
    return (
        <BrowserRouter>
            <div className="flex flex-col min-h-screen ">
                <Header />
                <div className="grow">
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/create" element={<CreateBoard />} />
                        <Route path="/explore" element={<ExplorePage />} />
                        <Route path="/dashboard/:boardId" element={<Dashboard />} />
                        <Route path="/board/:boardId" element={<BoardDisplay />} />
                        <Route path="/pay/:boardId" element={<PaymentPage />} />
                        <Route path="/zapme" element={<ZapMe />} />
                    </Routes>
                </div>
            </div>
            <div>
                <Footer />
            </div>
        </BrowserRouter>
    );
}

export default App;
