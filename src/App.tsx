/* eslint-disable max-len */
/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  USER_ID,
  getTodos,
  addTodo,
  updateTodo,
  deleteTodo,
} from './api/todos';
import { Todo } from './types/Todo';

type Filter = 'all' | 'active' | 'completed';

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [newTitle, setNewTitle] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [savingIds, setSavingIds] = useState<number[]>([]); // loading state for individual todos

  const errorTimeoutRef = useRef<number>();

  const showError = useCallback((msg: string) => {
    clearTimeout(errorTimeoutRef.current);
    setErrorMsg(msg);
    errorTimeoutRef.current = window.setTimeout(() => {
      setErrorMsg(null);
    }, 3000);
  }, []);

  const clearError = useCallback(() => {
    clearTimeout(errorTimeoutRef.current);
    setErrorMsg(null);
  }, []);

  const loadTodos = useCallback(async () => {
    clearError();
    setLoading(true);
    try {
      const response = await getTodos();

      setTodos(response);
    } catch {
      showError('Unable to load todos');
    } finally {
      setLoading(false);
    }
  }, [clearError, showError]);

  useEffect(() => {
    if (!USER_ID) {
      return;
    }

    loadTodos();
  }, [loadTodos]);

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      showError('Title should not be empty');

      return;
    }

    clearError();
    setLoading(true);
    try {
      const newTodo = await addTodo(newTitle.trim());

      setTodos(prev => [...prev, newTodo]);
      setNewTitle('');
    } catch {
      showError('Unable to add a todo');
    } finally {
      setLoading(false);
    }
  };

  const toggleTodo = async (todo: Todo) => {
    clearError();
    setSavingIds(ids => [...ids, todo.id]);
    try {
      const updated = await updateTodo({ ...todo, completed: !todo.completed });

      setTodos(prev => prev.map(t => (t.id === updated.id ? updated : t)));
    } catch {
      showError('Unable to update a todo');
    } finally {
      setSavingIds(ids => ids.filter(id => id !== todo.id));
    }
  };

  const removeTodo = async (id: number) => {
    clearError();
    setSavingIds(ids => [...ids, id]);
    try {
      await deleteTodo(id);
      setTodos(prev => prev.filter(t => t.id !== id));
    } catch {
      showError('Unable to delete a todo');
    } finally {
      setSavingIds(ids => ids.filter(i => i !== id));
    }
  };

  const startEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditingTitle(todo.title);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId === null) {
      return;
    }

    if (!editingTitle.trim()) {
      await removeTodo(editingId);
      cancelEdit();

      return;
    }

    clearError();
    setSavingIds(ids => [...ids, editingId]);
    try {
      const updated = await updateTodo({
        id: editingId,
        userId: USER_ID,
        title: editingTitle.trim(),
        completed: todos.find(t => t.id === editingId)?.completed ?? false,
      });

      setTodos(prev => prev.map(t => (t.id === updated.id ? updated : t)));
      cancelEdit();
    } catch {
      showError('Unable to update a todo');
    } finally {
      setSavingIds(ids => ids.filter(id => id !== editingId));
    }
  };

  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') {
      return !todo.completed;
    }

    if (filter === 'completed') {
      return todo.completed;
    }

    return true;
  });

  const allCompleted = todos.length > 0 && todos.every(t => t.completed);
  const completedCount = todos.filter(t => t.completed).length;
  const activeCount = todos.length - completedCount;

  const onRequestStart = () => {
    clearError();
  };

  return (
    <div className="todoapp">
      {!USER_ID ? (
        <div>Please register user first</div>
      ) : (
        <>
          <h1 className="todoapp__title">todos</h1>

          <div className="todoapp__content">
            <header className="todoapp__header">
              <button
                type="button"
                className={`todoapp__toggle-all ${allCompleted ? 'active' : ''}`}
                data-cy="ToggleAllButton"
                onClick={async () => {
                  onRequestStart();
                  setLoading(true);
                  try {
                    const updatedTodos = await Promise.all(
                      todos.map(t =>
                        updateTodo({ ...t, completed: !allCompleted }),
                      ),
                    );

                    setTodos(updatedTodos);
                  } catch {
                    showError('Unable to update a todo');
                  } finally {
                    setLoading(false);
                  }
                }}
              />

              <form onSubmit={handleAddTodo}>
                <input
                  data-cy="NewTodoField"
                  type="text"
                  className="todoapp__new-todo"
                  placeholder="What needs to be done?"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  onFocus={clearError}
                />
              </form>
            </header>

            {/* Скрыть список, если нет тудушек */}
            {todos.length > 0 && (
              <>
                <section className="todoapp__main" data-cy="TodoList">
                  {filteredTodos.map(todo => {
                    const isSaving = savingIds.includes(todo.id);
                    const isEditing = editingId === todo.id;

                    return (
                      <div
                        key={todo.id}
                        data-cy="Todo"
                        className={`todo ${todo.completed ? 'completed' : ''}`}
                        onDoubleClick={() => startEdit(todo)}
                      >
                        <label className="todo__status-label">
                          <input
                            data-cy="TodoStatus"
                            type="checkbox"
                            className="todo__status"
                            checked={todo.completed}
                            disabled={isSaving}
                            onChange={() => toggleTodo(todo)}
                          />
                        </label>

                        {!isEditing && (
                          <>
                            <span data-cy="TodoTitle" className="todo__title">
                              {todo.title}
                            </span>

                            <button
                              type="button"
                              className="todo__remove"
                              data-cy="TodoDelete"
                              disabled={isSaving}
                              onClick={() => removeTodo(todo.id)}
                            >
                              ×
                            </button>
                          </>
                        )}

                        {isEditing && (
                          <form onSubmit={saveEdit}>
                            <input
                              data-cy="TodoTitleField"
                              type="text"
                              className="todo__title-field"
                              placeholder="Empty todo will be deleted"
                              value={editingTitle}
                              onChange={e => setEditingTitle(e.target.value)}
                              onBlur={saveEdit}
                              autoFocus
                            />
                          </form>
                        )}

                        <div
                          data-cy="TodoLoader"
                          className={`modal overlay ${isSaving ? 'is-active' : ''}`}
                        >
                          <div className="modal-background has-background-white-ter" />
                          <div className="loader" />
                        </div>
                      </div>
                    );
                  })}
                </section>

                <footer className="todoapp__footer" data-cy="Footer">
                  <span className="todo-count" data-cy="TodosCounter">
                    {activeCount} item{activeCount !== 1 ? 's' : ''} left
                  </span>

                  <nav className="filter" data-cy="Filter">
                    <a
                      href="#/"
                      className={`filter__link ${filter === 'all' ? 'selected' : ''}`}
                      data-cy="FilterLinkAll"
                      onClick={e => {
                        e.preventDefault();
                        setFilter('all');
                      }}
                    >
                      All
                    </a>

                    <a
                      href="#/active"
                      className={`filter__link ${filter === 'active' ? 'selected' : ''}`}
                      data-cy="FilterLinkActive"
                      onClick={e => {
                        e.preventDefault();
                        setFilter('active');
                      }}
                    >
                      Active
                    </a>

                    <a
                      href="#/completed"
                      className={`filter__link ${filter === 'completed' ? 'selected' : ''}`}
                      data-cy="FilterLinkCompleted"
                      onClick={e => {
                        e.preventDefault();
                        setFilter('completed');
                      }}
                    >
                      Completed
                    </a>
                  </nav>

                  <button
                    type="button"
                    className="todoapp__clear-completed"
                    data-cy="ClearCompletedButton"
                    disabled={completedCount === 0}
                    onClick={async () => {
                      onRequestStart();
                      setLoading(true);
                      try {
                        await Promise.all(
                          todos
                            .filter(t => t.completed)
                            .map(t => deleteTodo(t.id)),
                        );
                        setTodos(prev => prev.filter(t => !t.completed));
                      } catch {
                        showError('Unable to delete a todo');
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    Clear completed
                  </button>
                </footer>
              </>
            )}
          </div>

          {/* Notification */}
          <div
            data-cy="ErrorNotification"
            className={`notification is-danger is-light has-text-weight-normal ${
              errorMsg ? '' : 'hidden'
            }`}
          >
            <button
              data-cy="HideErrorButton"
              type="button"
              className="delete"
              onClick={() => setErrorMsg(null)}
            />
            {errorMsg}
          </div>

          {/* Overlay loader */}
          <div
            data-cy="LoadingOverlay"
            className={`modal overlay ${loading ? 'is-active' : ''}`}
          >
            <div className="modal-background has-background-white-ter" />
            <div className="loader" />
          </div>
        </>
      )}
    </div>
  );
};
