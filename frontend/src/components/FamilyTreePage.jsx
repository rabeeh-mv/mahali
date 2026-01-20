import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { memberAPI } from '../api';
import FamilyTree from './FamilyTree';
import { FaArrowLeft } from 'react-icons/fa';
import './FamilyTree.css'; // Reuse existing CSS or create specific if needed

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
                // Fetch family tree (includes target member + relatives)
                const treeRes = await memberAPI.getFamilyTree(memberId);
                const familyMembers = treeRes.data;

                setAllMembers(familyMembers);

                // Set the specific member object from the response list
                const foundMember = familyMembers.find(m => String(m.member_id) === String(memberId));
                setMember(foundMember);

            } catch (error) {
                console.error("Failed to load family tree data", error);
            } finally {
                setLoading(false);
            }
        };

        if (memberId) {
            loadData();
        }
    }, [memberId]);

    const handleBack = () => {
        navigate(`/members/${memberId}`);
    };

    if (loading) {
        return (
            <div className="data-section" style={{ padding: '40px', textAlign: 'center' }}>
                <div className="spinner"></div>
                <p>Loading family tree...</p>
            </div>
        );
    }

    if (!member) {
        return (
            <div className="data-section">
                <p>Member not found.</p>
                <button onClick={() => navigate('/members')}>Back to Members</button>
            </div>
        );
    }

    return (
        <div className="family-tree-page-wrapper animate-in" style={{ padding: '20px', maxWidth: '95%', margin: '0 auto' }}>
            <div className="page-header" style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '16px' }}>
                <button onClick={handleBack} className="back-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', border: 'none', background: '#e0e0e0', borderRadius: '8px', cursor: 'pointer' }}>
                    <FaArrowLeft /> Back
                </button>
                <h2 style={{ margin: 0 }}>Family Tree: {member.name} {member.surname}</h2>
            </div>

            <div className="tree-visual-container" style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', padding: '20px' }}>
                <FamilyTree member={member} allMembers={allMembers} />
            </div>
        </div>
    );
};

export default FamilyTreePage;
