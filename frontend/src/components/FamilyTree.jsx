import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaMale, FaFemale, FaHeart, FaCrown } from 'react-icons/fa';
import Xarrow, { Xwrapper, useXarrow } from 'react-xarrows';
import './FamilyTree.css';

const FamilyTree = ({ member, allMembers = [] }) => {
    const navigate = useNavigate();
    const updateXarrow = useXarrow();

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

        const father = findMember(member.father) || (member.father_name ? { dummyId: 'unconnected-father', name: member.father_name, surname: member.father_surname, isUnconnected: true, gender: 'male' } : null);
        const mother = findMember(member.mother) || (member.mother_name ? { dummyId: 'unconnected-mother', name: member.mother_name, surname: member.mother_surname, isUnconnected: true, gender: 'female' } : null);
        const spouse = findMember(member.married_to) || (member.married_to_name ? { dummyId: 'unconnected-spouse', name: member.married_to_name, surname: member.married_to_surname, isUnconnected: true, gender: member.gender === 'male' ? 'female' : 'male' } : null);
        const secondSpouse = findMember(member.second_spouse) || (member.second_spouse_name ? { dummyId: 'unconnected-second-spouse', name: member.second_spouse_name, surname: member.second_spouse_surname, isUnconnected: true, gender: member.gender === 'male' ? 'female' : 'male' } : null);

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

        return { father, mother, spouse, secondSpouse, children, siblings };
    }, [member, safeAllMembers]);

    const handleNavigate = (targetId) => {
        if (targetId) navigate(`/members/${targetId}`);
    };

    // Render a single node
    const Node = ({ data, label, type = 'default', isMain = false, icon = null, idOverride = null }) => {
        const nodeId = idOverride || (data ? `node-${data.member_id || data.dummyId}` : `placeholder-${type}-${Math.random()}`);

        if (!data) return (
            <div id={nodeId} className={`tree-card placeholder ${type}`}>
                <div className="card-content">
                    <div className="avatar-placeholder">?</div>
                    <span className="name">{label}</span>
                </div>
            </div>
        );

        const genderIcon = data.gender === 'female' ? <FaFemale /> : <FaMale />;

        return (
            <div
                id={nodeId}
                className={`tree-card ${type} ${isMain ? 'main-highlight' : ''} ${data.isUnconnected ? 'unconnected' : ''}`}
                onClick={() => !data.isUnconnected && handleNavigate(data.member_id)}
                title={data.name}
                style={data.isUnconnected ? { border: '2px dashed #ff4d4f', cursor: 'default' } : {}}
            >
                {isMain && <div className="crown-icon"><FaCrown /></div>}
                <div className="card-content">
                    <div className={`avatar ${data.gender || 'male'}`} style={data.isUnconnected ? { background: '#ffe4e6', color: '#ff4d4f' } : {}}>
                        {icon || genderIcon}
                    </div>
                    <div className="info">
                        <span className="name">{data.name}</span>
                        {data.surname && <span className="surname">{data.surname}</span>}
                        <span className="role-badge">{label}</span>
                        {data.isUnconnected && (
                            <span className="unconnected-badge" style={{
                                display: 'inline-block',
                                background: '#ff4d4f',
                                color: 'white',
                                fontSize: '0.65rem',
                                padding: '3px 6px',
                                borderRadius: '4px',
                                marginTop: '6px',
                                fontWeight: 'bold'
                            }}>
                                Not Connected
                            </span>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const { father, mother, spouse, secondSpouse, children, siblings } = relationships;

    // Line Styles
    const lineStyle = {
        strokeWidth: 1.5,
        color: '#bcccdc',
        path: 'smooth',
        curveness: 0.8,
        startAnchor: 'bottom',
        endAnchor: 'top'
    };

    // Marriage Line Style
    const marriageLineStyle = {
        ...lineStyle,
        startAnchor: 'right',
        endAnchor: 'left',
        path: 'straight',
        showHead: false
    };

    return (
        <div className="family-tree-wrapper animate-fade-in" onScroll={updateXarrow}>
            <div className="tree-scroll-container">
                <Xwrapper>
                    <div className="tree-structure">

                        {/* Level 1: Parents */}
                        <div className="level parents-level">
                            {father && <Node data={father} label="Father" type="parent" idOverride="node-father" />}
                            {mother && <Node data={mother} label="Mother" type="parent" idOverride="node-mother" />}
                        </div>

                        {/* Level 2: Ego + Siblings + Spouse */}
                        <div className="level middle-level">

                            {/* Siblings */}
                            {siblings.length > 0 && (
                                <div className="siblings-group">
                                    {siblings.map(sib => (
                                        <Node key={sib.member_id} data={sib} label="Sibling" type="sibling" />
                                    ))}
                                </div>
                            )}

                            {/* Ego + Spouse */}
                            <div className="couple-group">
                                <Node data={member} label="You" type="main" isMain={true} idOverride="node-ego" />
                                {spouse && <Node data={spouse} label="Spouse" type="spouse" idOverride="node-spouse" />}
                                {secondSpouse && <Node data={secondSpouse} label="Second Spouse" type="spouse" idOverride="node-second-spouse" />}
                            </div>
                        </div>

                        {/* Level 3: Children */}
                        {(children.length > 0) && (
                            <div className="level children-level">
                                {children.map(child => (
                                    <Node key={child.member_id} data={child} label="Child" type="child" />
                                ))}
                            </div>
                        )}

                        {children.length === 0 && <div className="no-children-msg">No Children Recorded</div>}

                        {/* --- XARROWS CONNECTORS --- */}

                        {/* Parents Marriage (Optional visual link) */}
                        {father && mother && (
                            <Xarrow start="node-father" end="node-mother" {...marriageLineStyle} showHead={false} />
                        )}

                        {/* Father to Ego */}
                        {father && (
                            <Xarrow start="node-father" end="node-ego" {...lineStyle} />
                        )}
                        {/* Mother to Ego (if Father missing, or both) */}
                        {!father && mother && (
                            <Xarrow start="node-mother" end="node-ego" {...lineStyle} />
                        )}

                        {/* Parents to Siblings */}
                        {/* Ideally we connect from a central point between parents, but simpler is Parent -> Sibling */}
                        {siblings.map(sib => (
                            <Xarrow
                                key={sib.member_id}
                                start={father ? "node-father" : "node-mother"}
                                end={`node-${sib.member_id}`}
                                {...lineStyle}
                                startAnchor="bottom"
                            />
                        ))}

                        {/* Ego to Spouse */}
                        {spouse && (
                            <Xarrow start="node-ego" end="node-spouse" {...marriageLineStyle} />
                        )}

                        {/* Ego to Second Spouse */}
                        {secondSpouse && (
                            <Xarrow start="node-ego" end="node-second-spouse" {...marriageLineStyle} />
                        )}

                        {/* Ego/Spouse to Children */}
                        {children.map(child => (
                            <Xarrow
                                key={child.member_id}
                                start="node-ego"
                                end={`node-${child.member_id}`}
                                {...lineStyle}
                            />
                        ))}
                        {/* Connect Spouse to Children too? Usually just one parent is enough for visual tree, 
                            but maybe connect both for 'joint' look? 
                            Let's stick to Ego -> Children for clarity, or if Ego has spouse, start from Spouse? 
                            Standard is usually from the 'Union' line, but Xarrows makes that hard.
                            Let's just do Ego -> Child.
                        */}

                    </div>
                </Xwrapper>
            </div>

            <div className="tree-legend">
                <div className="legend-item"><span className="dot parent"></span> Parents</div>
                <div className="legend-item"><span className="dot main"></span> Active</div>
                <div className="legend-item"><span className="dot spouse"></span> Spouse</div>
                <div className="legend-item"><span className="dot sibling"></span> Sibling</div>
                <div className="legend-item"><span className="dot child"></span> Child</div>
            </div>
        </div>
    );
};

export default FamilyTree;
