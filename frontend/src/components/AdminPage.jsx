import React from 'react';
import { useNavigate } from 'react-router-dom';

const AdminPage = () => {
    const navigate = useNavigate();

    const menuItems = [
        {
            title: 'User Management',
            description: 'Manage users, roles, and zone access.',
            icon: 'users',
            path: '/admin/users'
        },
        {
            title: 'Reporting Week & Meeting Day',
            description: 'Set the day reporting weeks start, and the district meeting day.',
            icon: 'calendar',
            path: '/admin/meeting-day'
        },
        {
            title: 'Zone Management',
            description: 'Manage zones and geographic divisions.',
            icon: 'map',
            path: '/admin/zones'
        },
        {
            title: 'Member Management',
            description: 'Manage committee members and their roles.',
            icon: 'members',
            path: '/members'
        }
    ];

    return (
        <div className="container">
            <h1>Admin Control Panel</h1>
            <div className="admin-menu">
                {menuItems.map((item) => (
                    <button
                        key={item.path}
                        type="button"
                        className="admin-menu-item"
                        onClick={() => navigate(item.path)}
                    >
                        <AdminIcon name={item.icon} />
                        <span className="admin-menu-text">
                            <span className="admin-menu-title">{item.title}</span>
                            <span className="admin-menu-desc">{item.description}</span>
                        </span>
                        <svg className="admin-menu-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </button>
                ))}
            </div>
        </div>
    );
};

const ICON_PATHS = {
    users: (
        <>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </>
    ),
    calendar: (
        <>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
        </>
    ),
    map: (
        <>
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
            <line x1="8" y1="2" x2="8" y2="18" />
            <line x1="16" y1="6" x2="16" y2="22" />
        </>
    ),
    members: (
        <>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </>
    ),
};

const AdminIcon = ({ name }) => (
    <svg className="admin-menu-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {ICON_PATHS[name]}
    </svg>
);

export default AdminPage;
