import React from 'react';
import { useNavigate } from 'react-router-dom';

const AdminPage = () => {
    const navigate = useNavigate();

    const menuItems = [
        {
            title: 'User Management',
            description: 'Manage users, roles, and zone access.',
            icon: '👥',
            path: '/admin/users'
        },
        {
            title: 'Edit District Meeting Day',
            description: 'Change the day used to define the weekly cycle.',
            icon: '📅',
            path: '/admin/meeting-day'
        }
    ];

    const styles = {
        grid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
            marginTop: '20px'
        },
        card: {
            padding: '24px',
            background: 'white',
            borderRadius: '16px',
            boxShadow: 'var(--shadow-md)',
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
        },
        icon: {
            fontSize: '32px',
            marginBottom: '8px'
        },
        title: {
            fontSize: '1.2rem',
            fontWeight: '700',
            color: 'var(--primary)'
        },
        description: {
            fontSize: '0.9rem',
            color: 'var(--gray-600)',
            lineHeight: '1.5'
        }
    };

    return (
        <div className="container">
            <h1>Admin Control Panel</h1>
            <div style={styles.grid}>
                {menuItems.map((item, index) => (
                    <div 
                        key={index} 
                        style={styles.card}
                        onClick={() => navigate(item.path)}
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                        }}
                    >
                        <div style={styles.icon}>{item.icon}</div>
                        <div style={styles.title}>{item.title}</div>
                        <div style={styles.description}>{item.description}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminPage;
