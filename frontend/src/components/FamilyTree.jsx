import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './FamilyTree.css';

const FamilyTree = ({ member, allMembers = [] }) => {
    const navigate = useNavigate();

    // Ensure allMembers is safe to use
    const safeAllMembers = Array.isArray(allMembers) ? allMembers : [];

    // Helper to lookup member by ID (handles object or ID)
    const findMember = (id) => {
        if (!id) return null;
        const searchId = typeof id === 'object' ? id.member_id : id;
        return safeAllMembers.find(m => String(m.member_id) === String(searchId));
    };

    const relationships = useMemo(() => {
        if (!member) return {};

        const father = findMember(member.father);
        const mother = findMember(member.mother);
        const spouse = findMember(member.married_to);

        // Find children: members where father OR mother is the current member
        const children = safeAllMembers.filter(m => {
            const fatherId = typeof m.father === 'object' ? m.father?.member_id : m.father;
            const motherId = typeof m.mother === 'object' ? m.mother?.member_id : m.mother;
            return (fatherId && String(fatherId) === String(member.member_id)) ||
                (motherId && String(motherId) === String(member.member_id));
        });

        // Find siblings: members sharing at least one parent (excluding self)
        const siblings = safeAllMembers.filter(m => {
            if (m.member_id === member.member_id) return false; // Exclude self

            const mFatherId = typeof m.father === 'object' ? m.father?.member_id : m.father;
            const mMotherId = typeof m.mother === 'object' ? m.mother?.member_id : m.mother;

            const myFatherId = typeof member.father === 'object' ? member.father?.member_id : member.father;
            const myMotherId = typeof member.mother === 'object' ? member.mother?.member_id : member.mother;

            const sharedFather = myFatherId && mFatherId && String(myFatherId) === String(mFatherId);
            const sharedMother = myMotherId && mMotherId && String(myMotherId) === String(mMotherId);

            return sharedFather || sharedMother;
        });

        return { father, mother, spouse, children, siblings };
    }, [member, safeAllMembers]);

    const handleNavigate = (targetId) => {
        if (targetId) navigate(`/members/${targetId}`);
    };

    const getInitials = (name) => name ? name.charAt(0).toUpperCase() : '?';

    // Render a single node
    const Node = ({ data, label, type = 'default', isMain = false }) => {
        if (!data) return (
            <div className={`tree-node placeholder ${type}`}>
                <span>{label}</span>
            </div>
        );

        return (
            <div
                className={`tree-node ${type} ${isMain ? 'main-node' : ''}`}
                onClick={() => handleNavigate(data.member_id)}
                title={data.name}
            >
                <span className="node-label">{label || data.name}</span>
                {/* Optional: Add avatars or more details if needed, for now sticking to the pill design */}
            </div>
        );
    };

    const { father, mother, spouse, children, siblings } = relationships;

    return (
        <div className="family-tree-container animate-in">
            <div className="tree-scroll-wrapper">
                <div className="tree-layout">

                    {/* PARENTS COLUMN */}
                    <div className="tree-column parents-column">
                        <div className="node-group vertical">
                            <Node data={father} label={father ? father.name : "Father"} type="parent" />
                            <Node data={mother} label={mother ? mother.name : "Mother"} type="parent" />
                        </div>
                    </div>

                    {/* CONNECTORS (LEFT) */}
                    <div className="tree-connector left-connector">
                        <svg viewBox="0 0 100 200" preserveAspectRatio="none">
                            {/* 
                 Line from parents to center (for siblings)
                 Line from parents to main member
               */}
                            <path d="M 0 50 C 50 50, 50 100, 100 100" className="connector-path" fill="none" />
                            <path d="M 0 150 C 50 150, 50 100, 100 100" className="connector-path" fill="none" />
                        </svg>
                    </div>

                    {/* MIDDLE COLUMN (Siblings + Member/Spouse) */}
                    <div className="tree-column middle-column">

                        {/* SIBLINGS (Top) */}
                        {siblings.length > 0 && (
                            <div className="siblings-wrapper">
                                <div className="siblings-connector-line"></div>
                                <div className="node-group vertical-start">
                                    {siblings.map(sib => (
                                        <Node key={sib.member_id} data={sib} label={sib.name} type="sibling" />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* MAIN COUPLE */}
                        <div className="couple-wrapper">
                            <Node data={member} label={member.name} type="main" isMain={true} />
                            {spouse && (
                                <Node data={spouse} label={spouse.name} type="spouse" />
                            )}

                            {/* 
                    NOTE: If there is a spouse, we visually connect them. 
                    In the design image, they are stacked or side-by-side.
                    Let's stack them slightly overlapped or connected.
                 */}
                        </div>

                    </div>

                    {/* CONNECTORS (RIGHT) */}
                    <div className="tree-connector right-connector">
                        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                            <path d="M 0 50 L 100 50" className="connector-path" fill="none" />
                        </svg>
                    </div>

                    {/* CHILDREN COLUMN */}
                    <div className="tree-column children-column">
                        <div className="node-group vertical">
                            {children.length > 0 ? (
                                children.map(child => (
                                    <Node key={child.member_id} data={child} label={child.name} type="child" />
                                ))
                            ) : (
                                <span className="no-children-label">No Children Records</span>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            <div className="tree-controls">
                <span className="legend-item"><span className="dot parent"></span> Parents</span>
                <span className="legend-item"><span className="dot main"></span> Active Member</span>
                <span className="legend-item"><span className="dot sibling"></span> Siblings</span>
                <span className="legend-item"><span className="dot child"></span> Children</span>
            </div>
        </div>
    );
};

export default FamilyTree;
