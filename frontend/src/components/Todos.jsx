import React, { useState, useEffect } from 'react';
import { todoAPI } from '../api';
import { FaTrash } from 'react-icons/fa';

const Todos = () => {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newTodo, setNewTodo] = useState({ title: '', description: '', priority: 'medium', due_date: '' });

  useEffect(() => {
    loadTodos();
  }, []);

  const loadTodos = async () => {
    try {
      setLoading(true);
      const response = await todoAPI.getAll();
      setTodos(response.data);
    } catch (err) {
      setError('Failed to load todos');
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
      await todoAPI.create(payload);
      setNewTodo({ title: '', description: '', priority: 'medium', due_date: '' });
      loadTodos(); // Refresh the list
    } catch (err) {
      setError('Failed to create todo');
      console.error(err);
    }
  };

  const handleToggleComplete = async (id, completed) => {
    try {
      await todoAPI.update(id, { completed: !completed });
      loadTodos(); // Refresh the list
    } catch (err) {
      setError('Failed to update todo');
      console.error(err);
    }
  };

  const handleDeleteTodo = async (id) => {
    try {
      await todoAPI.delete(id);
      loadTodos(); // Refresh the list
    } catch (err) {
      setError('Failed to delete todo');
      console.error(err);
    }
  };

  if (loading) return <div>Loading todos...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="todo-container animate-in">
      <div className="section-header">
        <h3>
          <div className="header-icon-wrapper" style={{ background: 'var(--accent-gradient)', width: '32px', height: '32px', fontSize: '1rem' }}>
            📋
          </div>
          Action Items
        </h3>
      </div>

      <form onSubmit={handleCreateTodo} className="todo-form" style={{ marginBottom: '24px' }}>
        <div className="input-wrapper">
          <input
            type="text"
            placeholder="What needs to be done?"
            value={newTodo.title}
            onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
            required
            className="search-input"
          />
          <button type="submit" className="btn-primary" style={{ padding: '8px 24px' }}>Add</button>
        </div>
      </form>

      <div className="todos-list">
        {todos.length === 0 ? (
          <div className="empty-state" style={{ padding: '20px' }}>
            <p>Your agenda is clear. Enjoy the day!</p>
          </div>
        ) : (
          todos.map((todo) => (
            <div key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
              <input
                type="checkbox"
                className="todo-checkbox"
                checked={todo.completed}
                onChange={() => handleToggleComplete(todo.id, todo.completed)}
              />
              <div className={`todo-text ${todo.completed ? 'completed' : ''}`}>
                <p className="font-semibold" style={{ margin: 0, fontSize: '0.95rem' }}>{todo.title}</p>
                {todo.description && <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '2px' }}>{todo.description}</p>}
                {todo.due_date && (
                  <span className="badge-outline" style={{ fontSize: '0.7rem', marginTop: '6px', display: 'inline-block' }}>
                    Due: {new Date(todo.due_date).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="todo-actions">
                <span className={`status-badge ${todo.priority === 'high' ? 'terminated' : todo.priority === 'medium' ? 'inactive' : 'active'}`} style={{ fontSize: '0.7rem' }}>
                  {todo.priority}
                </span>
                <button
                  className="delete-btn"
                  onClick={() => handleDeleteTodo(todo.id)}
                  title="Remove"
                  style={{ padding: '4px 8px' }}
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Todos;