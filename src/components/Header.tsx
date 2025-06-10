import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, Settings, LogOut, Menu, X, Plane } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "@/components/AuthModal";
import ApiKeysManager from "@/components/ApiKeysManager";
import ProfileDialog from "@/components/ProfileDialog";

interface HeaderProps {
  className?: string;
}

function Header({ className = "" }: HeaderProps) {
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const handleAuthSuccess = () => {
    setShowAuth(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const navItems = [
    { to: "/", label: "Home" },
    { to: "/search", label: "Search" },
    { to: "/results", label: "Results" },
    { to: "/analysis", label: "Analysis" },
  ];

  const isActivePath = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  if (isLoading) {
    return (
      <header className={`bg-white shadow-sm border-b ${className}`}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Plane className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">ChasquiFX</span>
            </div>
            <div className="animate-pulse bg-gray-200 h-8 w-24 rounded"></div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className={`bg-white shadow-sm border-b ${className}`}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <Plane className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">ChasquiFX</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActivePath(item.to)
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Auth Section */}
          <div className="hidden md:flex items-center space-x-2">
            {isAuthenticated && user ? (
              <>
                <span className="text-sm text-muted-foreground mr-2">
                  Welcome, {user?.name || user?.email}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowProfile(true)}
                >
                  <User className="h-4 w-4 mr-1" />
                  Profile
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowApiKeys(true)}
                >
                  <Settings className="h-4 w-4 mr-1" />
                  API Keys
                </Button>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-1" />
                  Logout
                </Button>
              </>
            ) : (
              <Button onClick={() => setShowAuth(true)}>
                <User className="h-4 w-4 mr-1" />
                Login
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t">
            <nav className="flex flex-col space-y-3 mt-4">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    isActivePath(item.to)
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}

              {/* Mobile Auth Section */}
              <div className="pt-3 border-t">
                {isAuthenticated && user ? (
                  <>
                    <div className="text-sm text-muted-foreground mb-3">
                      Welcome, {user?.name || user?.email}
                    </div>
                    <div className="flex flex-col space-y-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="justify-start"
                        onClick={() => {
                          setShowProfile(true);
                          setMobileMenuOpen(false);
                        }}
                      >
                        <User className="h-4 w-4 mr-2" />
                        Profile
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="justify-start"
                        onClick={() => {
                          setShowApiKeys(true);
                          setMobileMenuOpen(false);
                        }}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        API Keys
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="justify-start"
                        onClick={() => {
                          handleLogout();
                          setMobileMenuOpen(false);
                        }}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </Button>
                    </div>
                  </>
                ) : (
                  <Button
                    className="w-full justify-start"
                    onClick={() => {
                      setShowAuth(true);
                      setMobileMenuOpen(false);
                    }}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Login
                  </Button>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>

      {/* Authentication Modal */}
      {showAuth && (
        <AuthModal
          open={showAuth}
          onClose={() => setShowAuth(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      )}

      {/* API Keys Manager Modal */}
      {showApiKeys && (
        <ApiKeysManager
          open={showApiKeys}
          onClose={() => setShowApiKeys(false)}
        />
      )}

      {/* Profile Dialog */}
      {showProfile && user && (
        <ProfileDialog
          open={showProfile}
          onClose={() => setShowProfile(false)}
          user={user}
        />
      )}
    </header>
  );
}

export default Header;
