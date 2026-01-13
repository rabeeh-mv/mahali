import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { memberAPI } from '../api';
import FamilyTree from './FamilyTree';
import { FaArrowLeft } from 'react-icons/fa';
import './FamilyTree.css'; // Reuse existing CSS

const FamilyTreePage = () => {
    const { memberId } = useParams();
    const navigate = useNavigate();
    const [member, setMember] = useState(null);
    const [allMembers, setAllMembers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                // Parallel fetch
                const [memberRes, allMembersRes] = await Promise.all([
                    memberAPI.get(memberId),
                    memberAPI.getAll()
                ]);

                setMember(memberRes.data);

                // Handle potential pagination
                const membersData = Array.isArray(allMembersRes.data)
                    ? allMembersRes.data
                    : (allMembersRes.data.results || []);
                setAllMembers(membersData);

            } catch (error) {
                console.error("Error loading family tree data:", error);
            } finally {
                setLoading(false);
            }
        };

        if (memberId) {
            loadData();
        }
    }, [memberId]);

    if (loading) {
        return <div className="loading-screen">Loading Family Tree...</div>;
    }

    if (!member) {
        return <div className="error-screen">Member not found</div>;
    }

    return (
        <div className="family-tree-page-wrapper" style={{ padding: '20px', minHeight: '100vh', background: '#f5f7fa' }}>
            <div className="header-actions" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <button
                    onClick={() => navigate(`/members/${memberId}`)}
                    className="back-btn"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        border: 'none',
                        background: '#fff',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        fontSize: '0.95rem',
                        fontWeight: 500
                    }}
                >
                    <FaArrowLeft /> Back to Member
                </button>
                <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#1a1a2e' }}>Genealogical Tree: {member.name}</h2>
            </div>

            <div className="tree-content-card" style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <FamilyTree member={member} allMembers={allMembers} />
            </div>
        </div>
    );
};

export default FamilyTreePage;
