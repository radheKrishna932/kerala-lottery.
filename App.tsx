/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import HomeView from "./components/HomeView";
import BuyTicketView from "./components/BuyTicketView";
import CheckResultView from "./components/CheckResultView";
import AboutView from "./components/AboutView";
import BlogView from "./components/BlogView";
import ContactView from "./components/ContactView";
import PolicyViews from "./components/PolicyViews";
import AdminPanel from "./components/AdminPanel";

export default function App() {
  const [currentPage, setCurrentPage] = React.useState<string>("home");
  
  // High-fidelity administrative state
  const [passcode, setPasscode] = React.useState<string | null>(() => {
    return localStorage.getItem("kerala_admin_passcode") || null;
  });
  const [isAdminLoggedIn, setIsAdminLoggedIn] = React.useState<boolean>(() => {
    return localStorage.getItem("kerala_admin_logged_in") === "true";
  });

  // Package linking state
  const [selectedPackageId, setSelectedPackageId] = React.useState<string | null>(null);

  // Quick lookup connection phone
  const [quickResultPhone, setQuickResultPhone] = React.useState<string>("");

  const handleAdminLogin = (newPasscode: string | null) => {
    if (newPasscode) {
      localStorage.setItem("kerala_admin_passcode", newPasscode);
      localStorage.setItem("kerala_admin_logged_in", "true");
      setPasscode(newPasscode);
      setIsAdminLoggedIn(true);
    }
  };

  const handleLogoutAdmin = () => {
    localStorage.removeItem("kerala_admin_passcode");
    localStorage.setItem("kerala_admin_logged_in", "false");
    setPasscode(null);
    setIsAdminLoggedIn(false);
  };

  // Switch pages elegantly
  const renderView = () => {
    switch (currentPage) {
      case "home":
        return (
          <HomeView 
            setCurrentPage={setCurrentPage} 
            setSelectedPackageId={setSelectedPackageId} 
            setQuickResultPhone={setQuickResultPhone}
          />
        );
      case "buy":
        return (
          <BuyTicketView 
            selectedPackageId={selectedPackageId} 
            setSelectedPackageId={setSelectedPackageId}
            setCurrentPage={setCurrentPage}
          />
        );
      case "result":
        return (
          <CheckResultView 
            initialPhone={quickResultPhone} 
          />
        );
      case "about":
        return <AboutView />;
      case "blog":
        return <BlogView />;
      case "contact":
        return <ContactView />;
      case "faq":
        return <PolicyViews viewType="faq" />;
      case "privacy":
        return <PolicyViews viewType="privacy" />;
      case "terms":
        return <PolicyViews viewType="terms" />;
      case "admin":
        return (
          <AdminPanel 
            passcode={passcode} 
            setPasscode={handleAdminLogin} 
            isAdminLoggedIn={isAdminLoggedIn} 
            setIsAdminLoggedIn={(val) => {
              setIsAdminLoggedIn(val);
              localStorage.setItem("kerala_admin_logged_in", val ? "true" : "false");
            }} 
          />
        );
      default:
        return (
          <HomeView 
            setCurrentPage={setCurrentPage} 
            setSelectedPackageId={setSelectedPackageId} 
            setQuickResultPhone={setQuickResultPhone}
          />
        );
    }
  };

  const [whatsappNumber, setWhatsappNumber] = React.useState<string>("+91 94460 01234");

  React.useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.whatsappNumber) {
          setWhatsappNumber(data.whatsappNumber);
        }
      })
      .catch((err) => console.error("Error loading settings in App.tsx:", err));
  }, [currentPage]); // Reload whenever page switches to ensure up-to-date values

  // Scroll back to top whenever page shifts
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

  return (
    <div className="flex min-h-screen flex-col bg-[#011410] text-[#f2fcf7]">
      {/* Universal Sticky Header Banner with Custom SVG face logo */}
      <Header 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        isAdminLoggedIn={isAdminLoggedIn}
        onLogoutAdmin={handleLogoutAdmin}
      />

      {/* Main active layout */}
      <main className="flex-grow">
        {renderView()}
      </main>

      {/* Common detailed multi-column Footer with policy redirections */}
      <Footer setCurrentPage={setCurrentPage} />

      {/* Floating WhatsApp Action Button */}
      <a
        href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}`}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] text-white shadow-lg shadow-emerald-950/40 hover:bg-[#1ebd5d] hover:scale-110 active:scale-95 transition-all duration-300 border border-emerald-400/20 group animate-pulse"
        title="Chat on WhatsApp"
        id="floating-whatsapp-trigger"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6 stroke-[2.25] rotate-0 group-hover:rotate-[360deg] transition-transform duration-500"
        >
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
        <span className="absolute right-16 scale-0 group-hover:scale-100 bg-[#022c22] text-xs font-bold text-white py-1.5 px-3 rounded-lg shadow-xl border border-emerald-800 transition-all duration-300 origin-right whitespace-nowrap opacity-0 group-hover:opacity-100">
          Chat with Support
        </span>
      </a>
    </div>
  );
}
