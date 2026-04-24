import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getUser, getUserAccessConfig } from '../services/auth';

// Simple SVG Icons (inline to avoid external dependencies)
const Icons = {
    Form: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
    ),
    Report: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
    ),
    Dashboard: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
    ),
    Admin: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
            <path d="M2 17l10 5 10-5"></path>
            <path d="M2 12l10 5 10-5"></path>
        </svg>
    ),
    QHLS: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            <circle cx="12" cy="12" r="2"></circle>
        </svg>
    ),
    Committee: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
    ),
};

const BottomNavigation = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = getUser();
    const accessConfig = getUserAccessConfig(user);

    // Define tabs based on access config
    const tabs = [];

    // Form tab
    if (accessConfig.showFormTab) {
        tabs.push({
            id: 'form',
            path: '/form',
            label: 'ഫോം',
            icon: Icons.Form,
        });
    }

    // Report tab
    if (accessConfig.showReportTab) {
        tabs.push({
            id: 'report',
            path: '/report',
            label: 'റിപ്പോർട്ട്',
            icon: Icons.Report,
        });
    }

    // Dashboard tab
    if (accessConfig.showDashboardTab) {
        tabs.push({
            id: 'dashboard',
            path: '/dashboard',
            label: 'ഡാഷ്ബോർഡ്',
            icon: Icons.Dashboard,
        });
    }

    // QHLS tab - available to district_admin and admin only
    if (accessConfig.showDashboardTab) {
        tabs.push({
            id: 'qhls',
            path: '/qhls',
            label: 'QHLS',
            icon: Icons.QHLS,
        });
    }

    // Members tab
    if (accessConfig.showMembersTab) {
        tabs.push({
            id: 'members',
            path: '/members',
            label: 'മെമ്പേഴ്സ്',
            icon: Icons.Committee,
        });
    }

    // Admin tab
    if (accessConfig.showAdminTab) {
        tabs.push({
            id: 'admin',
            path: '/admin',
            label: 'അഡ്മിൻ',
            icon: Icons.Admin,
        });
    }

    const handleTabClick = (path) => {
        navigate(path);
    };

    const isActive = (path) => {
        if (path === '/') {
            return location.pathname === '/';
        }
        return location.pathname === path;
    };

    const styles = {
        container: {
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 32px)',
            maxWidth: '500px',
            height: '72px',
            background: 'var(--accent)',
            borderRadius: 'var(--radius-full)',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            padding: '0 12px',
            zIndex: 1000,
            border: '1px solid rgba(255, 255, 255, 0.05)',
        },
        tab: (active) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            padding: '8px 12px',
            cursor: 'pointer',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            color: active ? 'var(--primary)' : 'var(--gray-400)',
            background: 'transparent',
            border: 'none',
            fontFamily: 'Inter, Anek Malayalam, sans-serif',
            minWidth: '50px',
            flex: 1,
            position: 'relative',
        }),
        iconWrapper: (active) => ({
            width: '24px',
            height: '24px',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: active ? 'scale(1.2)' : 'scale(1)',
            filter: active ? 'drop-shadow(0 0 8px rgba(163, 230, 53, 0.4))' : 'none',
        }),
        label: (active) => ({
            fontSize: '0.65rem',
            fontWeight: active ? '800' : '500',
            transition: 'all 0.4s ease',
            whiteSpace: 'nowrap',
            opacity: active ? 1 : 0.7,
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
        }),
    };

    return (
        <nav style={styles.container}>
            {tabs.map((tab) => {
                const active = isActive(tab.path);
                const IconComponent = tab.icon;

                return (
                    <button
                        key={tab.id}
                        onClick={() => handleTabClick(tab.path)}
                        style={styles.tab(active)}
                        aria-label={tab.label}
                        aria-current={active ? 'page' : undefined}
                    >
                        <div style={styles.iconWrapper(active)}>
                            <IconComponent />
                        </div>
                        <span style={styles.label(active)}>{tab.label}</span>
                    </button>
                );
            })}
        </nav>
    );
};

export default BottomNavigation;
