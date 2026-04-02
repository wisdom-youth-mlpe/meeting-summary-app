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
    Campaign: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.65 3.42 2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.54a16 16 0 0 0 6.06 6.06l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"></path>
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

    // Campaigns tab — visible to all authenticated users
    tabs.push({
        id: 'campaigns',
        path: '/campaigns',
        label: 'Campaigns',
        icon: Icons.Campaign,
    });

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
            bottom: 0,
            left: 0,
            right: 0,
            height: '70px',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            padding: '0 16px',
            zIndex: 1000,
            borderTop: '1px solid var(--gray-200)',
        },
        tab: (active) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            padding: '8px 16px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            color: active ? 'var(--primary)' : 'var(--gray-500)',
            background: 'transparent',
            border: 'none',
            fontFamily: 'Anek Malayalam, sans-serif',
            minWidth: '60px',
            flex: 1,
            maxWidth: '100px',
        }),
        iconWrapper: (active) => ({
            width: '24px',
            height: '24px',
            transition: 'transform 0.3s ease',
            transform: active ? 'scale(1.1)' : 'scale(1)',
        }),
        label: (active) => ({
            fontSize: '0.75rem',
            fontWeight: active ? '700' : '500',
            transition: 'all 0.3s ease',
            whiteSpace: 'nowrap',
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
