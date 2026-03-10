import React, { useState, useEffect } from 'react';
import { todoAPI } from '../api';
import { FaTrash, FaCheck, FaPlus, FaClock, FaFilter, FaFolderOpen, FaTimes } from 'react-icons/fa';

const Todos = () => {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI State
  const [isAdding, setIsAdding] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'completed'
  const [sortBy, setSortBy] = useState('due_date'); // 'due_date', 'priority', 'newest'

  // Form State
  const [newTodo, setNewTodo] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: 'General',
    due_date: ''
  });

  useEffect(() => {
    loadTodos();
  }, []);

  const loadTodos = async () => {
    try {
      setLoading(true);
      const response = await todoAPI.getAll();
      setTodos(response.data);
    } catch (err) {
      setError('Failed to load tasks');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTodo = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...newTodo };
      if (!payload.due_date) {
        payload.due_date = null;
      }
      if (!payload.category) {
        payload.category = 'General';
      }
      await todoAPI.create(payload);
      setNewTodo({ title: '', description: '', priority: 'medium', category: 'General', due_date: '' });
      setIsAdding(false);
      loadTodos(); // Refresh the list
    } catch (err) {
      setError('Failed to create task');
      console.error(err);
    }
  };

  const handleToggleComplete = async (todo) => {
    try {
      // Optimistic update
      setTodos(todos.map(t => t.id === todo.id ? { ...t, completed: !todo.completed } : t));
      await todoAPI.partialUpdate ? await todoAPI.partialUpdate(todo.id, { completed: !todo.completed }) : await todoAPI.update(todo.id, { ...todo, completed: !todo.completed });
    } catch (err) {
      setError('Failed to update task status');
      console.error(err);
      loadTodos(); // Revert on failure
    }
  };

  const handleDeleteTodo = async (id) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      setTodos(todos.filter(t => t.id !== id));
      await todoAPI.delete(id);
    } catch (err) {
      setError('Failed to delete task');
      console.error(err);
      loadTodos();
    }
  };

  // Derived state
  const pendingCount = todos.filter(t => !t.completed).length;

  const filteredAndSortedTodos = todos.filter(t => {
    if (filter === 'pending') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  }).sort((a, b) => {
    if (sortBy === 'due_date') {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    }
    if (sortBy === 'priority') {
      const pMap = { high: 3, medium: 2, low: 1 };
      return pMap[b.priority] - pMap[a.priority];
    }
    // newest First
    return new Date(b.created_at || Date.now()) - new Date(a.created_at || Date.now());
  });

  const uniqueCategories = [...new Set(todos.map(t => t.category).filter(Boolean))];

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading tasks...</div>;
  if (error) return <div className="error" style={{ margin: '1rem' }}>Error: {error}</div>;

  return (
    <div className="todo-container animate-in" style={{ paddingBottom: '2rem' }}>
      {/* Header Section */}
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3>
          <div className="header-icon-wrapper" style={{ background: 'var(--accent-gradient)', width: '36px', height: '36px', fontSize: '1.2rem' }}>
            📋
          </div>
          Task Manager
          <span className="badge-outline" style={{ marginLeft: '12px', fontSize: '0.8rem' }}>
            {pendingCount} Pending
          </span>
        </h3>
        {!isAdding && (
          <button className="btn-primary" onClick={() => setIsAdding(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaPlus /> New Task
          </button>
        )}
      </div>

      {/* Advanced Create Task Form */}
      {isAdding && (
        <form onSubmit={handleCreateTodo} className="todo-form grid-card" style={{ marginBottom: '24px', padding: '20px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>Create New Task</h4>
            <button type="button" onClick={() => setIsAdding(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <FaTimes />
            </button>
          </div>

          <div className="form-grid" style={{ gap: '16px' }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Task Title <span style={{ color: 'red' }}>*</span></label>
              <input
                type="text"
                className="search-input"
                placeholder="What needs to be done?"
                value={newTodo.title}
                onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Description</label>
              <textarea
                className="search-input"
                placeholder="Add more details..."
                value={newTodo.description}
                onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
                rows="2"
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            <div className="form-group">
              <label>Category</label>
              <input
                type="text"
                className="search-input"
                placeholder="e.g., Work, Personal, Shopping"
                value={newTodo.category}
                onChange={(e) => setNewTodo({ ...newTodo, category: e.target.value })}
                list="category-options"
                style={{ width: '100%' }}
              />
              <datalist id="category-options">
                {uniqueCategories.map(cat => <option key={cat} value={cat} />)}
              </datalist>
            </div>

            <div className="form-group">
              <label>Priority</label>
              <select
                className="search-input"
                value={newTodo.priority}
                onChange={(e) => setNewTodo({ ...newTodo, priority: e.target.value })}
                style={{ width: '100%' }}
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>

            <div className="form-group">
              <label>Due Date</label>
              <input
                type="date"
                className="search-input"
                value={newTodo.due_date}
                onChange={(e) => setNewTodo({ ...newTodo, due_date: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button type="button" className="btn-secondary" onClick={() => setIsAdding(false)}>Cancel</button>
              <button type="submit" className="btn-primary">Save Task</button>
            </div>
          </div>
        </form>
      )}

      {/* Toolbar: Filtering and Sorting */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', marginBottom: '20px', background: 'var(--surface-alt)', padding: '12px', borderRadius: '8px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`btn-secondary ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
            style={filter === 'all' ? { background: 'var(--primary)', color: 'white', borderColor: 'var(--primary)' } : {}}
          >
            All
          </button>
          <button
            className={`btn-secondary ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
            style={filter === 'pending' ? { background: 'var(--primary)', color: 'white', borderColor: 'var(--primary)' } : {}}
          >
            Pending
          </button>
          <button
            className={`btn-secondary ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
            style={filter === 'completed' ? { background: 'var(--primary)', color: 'white', borderColor: 'var(--primary)' } : {}}
          >
            Completed
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaFilter style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Sort by:</span>
          <select
            className="search-input"
            style={{ padding: '6px 12px', minWidth: '150px' }}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="due_date">Due Date</option>
            <option value="priority">Priority</option>
            <option value="newest">Newest First</option>
          </select>
        </div>
      </div>

      {/* Tasks List */}
      <div className="todos-list">
        {filteredAndSortedTodos.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px', background: 'var(--surface)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
            <div style={{ fontSize: '3rem', opacity: 0.5, marginBottom: '16px' }}>🍵</div>
            <h4 style={{ margin: '0 0 8px 0' }}>No tasks found</h4>
            <p className="text-muted" style={{ margin: 0 }}>
              {filter !== 'all' ? "Try changing your filters to see more tasks." : "Your agenda is beautifully clear. Enjoy!"}
            </p>
            {filter !== 'all' && (
              <button className="btn-secondary" style={{ marginTop: '16px' }} onClick={() => setFilter('all')}>View All Tasks</button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredAndSortedTodos.map((todo) => {
              const isOverdue = todo.due_date && new Date(todo.due_date) < new Date(new Date().setHours(0, 0, 0, 0)) && !todo.completed;

              return (
                <div
                  key={todo.id}
                  className={`todo-item grid-card ${todo.completed ? 'completed' : ''}`}
                  style={{
                    padding: '16px',
                    display: 'flex',
                    gap: '16px',
                    alignItems: 'flex-start',
                    borderLeft: `4px solid ${todo.priority === 'high' ? 'var(--danger, #ef4444)' :
                        todo.priority === 'medium' ? 'var(--warning, #f59e0b)' :
                          'var(--success, #10b981)'
                      }`,
                    opacity: todo.completed ? 0.6 : 1,
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {/* Custom Checkbox */}
                  <div
                    onClick={() => handleToggleComplete(todo)}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      border: `2px solid ${todo.completed ? 'var(--primary)' : 'var(--text-muted)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      background: todo.completed ? 'var(--primary)' : 'transparent',
                      color: 'white',
                      flexShrink: 0,
                      marginTop: '2px'
                    }}
                  >
                    {todo.completed && <FaCheck size={12} />}
                  </div>

                  <div className={`todo-text ${todo.completed ? 'completed' : ''}`} style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                      <p className="font-semibold" style={{
                        margin: 0,
                        fontSize: '1.05rem',
                        textDecoration: todo.completed ? 'line-through' : 'none',
                        wordBreak: 'break-word'
                      }}>
                        {todo.title}
                      </p>

                      {/* Priority Tag */}
                      <span className={`status-badge ${todo.priority === 'high' ? 'terminated' : todo.priority === 'medium' ? 'inactive' : 'live'}`} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                        {todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)}
                      </span>
                    </div>

                    {todo.description && (
                      <p className="text-muted" style={{
                        fontSize: '0.9rem',
                        margin: '8px 0',
                        lineHeight: '1.4',
                        textDecoration: todo.completed ? 'line-through' : 'none',
                        wordBreak: 'break-word'
                      }}>
                        {todo.description}
                      </p>
                    )}

                    <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
                      {todo.category && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--bg-document)', padding: '2px 8px', borderRadius: '12px' }}>
                          <FaFolderOpen /> {todo.category}
                        </span>
                      )}

                      {todo.due_date && (
                        <span style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.8rem',
                          color: isOverdue ? 'var(--danger, #ef4444)' : 'var(--text-muted)',
                          background: isOverdue ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-document)',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontWeight: isOverdue ? 'bold' : 'normal'
                        }}>
                          <FaClock />
                          {isOverdue ? "Overdue: " : "Due: "}
                          {new Date(todo.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="todo-actions" style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteTodo(todo.id)}
                      title="Delete Task"
                      style={{
                        padding: '8px',
                        background: 'transparent',
                        color: 'var(--text-muted)',
                        border: 'none',
                        cursor: 'pointer',
                        borderRadius: '4px'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.color = 'var(--danger, #ef4444)';
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.color = 'var(--text-muted)';
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <FaTrash size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Todos;