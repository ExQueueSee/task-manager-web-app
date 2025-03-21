import React, { useState, useEffect } from 'react';
import { getTasks, createTask, updateTask, deleteTask } from './api';

const Tasks = ({ token }) => {
    const [tasks, setTasks] = useState([]);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const response = await getTasks(token);
                setTasks(response.data);
            } catch (error) {
                console.error('Error fetching tasks:', error);
            }
        };
        fetchTasks();
    }, [token]);

    const handleCreateTask = async (e) => {
        e.preventDefault();
        try {
            const response = await createTask({ title, description }, token);
            setTasks([...tasks, response.data]);
            setTitle('');
            setDescription('');
        } catch (error) {
            console.error('Error creating task:', error);
        }
    };

    const handleUpdateTask = async (taskId, updatedTask) => {
        try {
            const response = await updateTask(taskId, updatedTask, token);
            setTasks(tasks.map(task => (task._id === taskId ? response.data : task)));
        } catch (error) {
            console.error('Error updating task:', error);
        }
    };

    const handleDeleteTask = async (taskId) => {
        try {
            await deleteTask(taskId, token);
            setTasks(tasks.filter(task => task._id !== taskId));
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    };

    return (
        <div>
            <h2>Tasks</h2>
            <form onSubmit={handleCreateTask}>
                <input type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                <input type="text" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} required />
                <button type="submit">Create Task</button>
            </form>
            <ul>
                {tasks.map(task => (
                    <li key={task._id}>
                        <h3>{task.title}</h3>
                        <p>{task.description}</p>
                        <button onClick={() => handleUpdateTask(task._id, { ...task, status: 'completed' })}>Complete</button>
                        <button onClick={() => handleDeleteTask(task._id)}>Delete</button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Tasks;