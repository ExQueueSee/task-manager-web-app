import React, { useState, useEffect } from 'react';
import { 
  Typography, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Chip, IconButton,
  Button, Dialog, DialogActions, DialogContent, DialogTitle,
  TextField, MenuItem, Select, FormControl, InputLabel, Box
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  PersonAdd as AssignIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useSnackbar } from 'notistack';
import { getAllTasks, updateTask, deleteTask, getAllUsers } from '../api';
import { STATUS_LABELS, STATUS_COLORS, STATUS_HEX_COLORS } from '../constants/TaskConstants.js';

const statusColors = {
  'pending': 'info', // Blue
  'in-progress': 'warning', // Orange/amber
  'completed': 'success', // Green
  'cancelled': 'error', // Red
  'behind-schedule': 'secondary' // Purple
};

const statusLabels = {
  'pending': 'Available',
  'in-progress': 'In Progress',
  'completed': 'Completed',
  'cancelled': 'Cancelled',
  'behind-schedule': 'Behind Schedule'
};

const AdminTasksPage = () => {
  const { token } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const [editTask, setEditTask] = useState({
    title: '',
    description: '',
    status: '',
    dueDate: '',
  });
  const [selectedUserId, setSelectedUserId] = useState('');

  // Add state variables for the new task dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    status: 'pending',
    dueDate: '',
    visibility: 'public'
  });
  const [selectedAssignee, setSelectedAssignee] = useState('');

  // Fetch all tasks and users on component mount
  useEffect(() => {
    fetchTasks();
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await getAllTasks(token);
      setTasks(response.data);
    } catch (error) {
      enqueueSnackbar('Failed to fetch tasks', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await getAllUsers(token);
      setUsers(response.data);
    } catch (error) {
      enqueueSnackbar('Failed to fetch users', { variant: 'error' });
    }
  };

  const handleEditClick = (task) => {
    setCurrentTask(task);
    setEditTask({
      title: task.title,
      description: task.description,
      status: task.status,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : '',
    });
    setEditDialogOpen(true);
  };

  const handleAssignClick = (task) => {
    setCurrentTask(task);
    setSelectedUserId(task.owner || '');
    setAssignDialogOpen(true);
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
  };

  const handleAssignClose = () => {
    setAssignDialogOpen(false);
  };

  const handleEditSave = async () => {
    try {
      await updateTask(currentTask._id, editTask, token);
      enqueueSnackbar('Task updated successfully', { variant: 'success' });
      fetchTasks();
      setEditDialogOpen(false);
    } catch (error) {
      enqueueSnackbar('Failed to update task', { variant: 'error' });
    }
  };

  const handleAssignSave = async () => {
    try {
      await updateTask(
        currentTask._id, 
        { 
          owner: selectedUserId,
          status: selectedUserId ? 'in-progress' : 'pending'
        }, 
        token
      );
      enqueueSnackbar('Task assigned successfully', { variant: 'success' });
      fetchTasks();
      setAssignDialogOpen(false);
    } catch (error) {
      enqueueSnackbar('Failed to assign task', { variant: 'error' });
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(taskId, token);
        enqueueSnackbar('Task deleted successfully', { variant: 'success' });
        fetchTasks();
      } catch (error) {
        enqueueSnackbar('Failed to delete task', { variant: 'error' });
      }
    }
  };

  // Add handler functions
  const handleCreateDialogOpen = () => {
    setNewTask({
      title: '',
      description: '',
      status: 'pending',
      dueDate: '',
      visibility: 'public'
    });
    setSelectedAssignee('');
    setCreateDialogOpen(true);
  };

  const handleCreateDialogClose = () => {
    setCreateDialogOpen(false);
  };

  const handleCreateTask = async () => {
    try {
      const taskData = { ...newTask };
      
      // Add owner if a user is selected
      if (selectedAssignee) {
        taskData.owner = selectedAssignee;
        taskData.status = 'in-progress';
      }
      
      // Create the task
      const response = await fetch('http://localhost:3000/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(taskData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create task');
      }
      
      enqueueSnackbar('Task created successfully', { variant: 'success' });
      fetchTasks();
      setCreateDialogOpen(false);
    } catch (error) {
      enqueueSnackbar(error.message || 'Failed to create task', { variant: 'error' });
      console.error('Create task error:', error);
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Task Management
      </Typography>
      
      <Button 
        variant="contained" 
        color="primary" 
        sx={{ mb: 3 }}
        onClick={handleCreateDialogOpen}
      >
        Create New Task
      </Button>
      
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Assigned To</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">Loading tasks...</TableCell>
              </TableRow>
            ) : tasks.map(task => (
              <TableRow key={task._id}>
                <TableCell>{task.title}</TableCell>
                <TableCell>{task.description}</TableCell>
                <TableCell>
                  <Chip 
                    label={statusLabels[task.status]} 
                    color={statusColors[task.status] || 'default'}
                    size="small"
                    sx={{ 
                      bgcolor: task.status === 'behind-schedule' ? '#9b59b6' : undefined,
                      color: task.status === 'behind-schedule' ? 'white' : undefined
                    }}
                  />
                </TableCell>
                <TableCell>
                  {task.owner ? (
                    (() => {
                      // Owner might be either a string ID or an object with _id property
                      const ownerId = typeof task.owner === 'object' ? task.owner._id : task.owner;
                      const assignedUser = users.find(u => u._id === ownerId);
                      return assignedUser ? `${assignedUser.name} (${assignedUser.email})` : 'Unknown User';
                    })()
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Unassigned
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  {task.dueDate ? new Date(task.dueDate).toLocaleString() : 'No due date'}
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => handleEditClick(task)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleAssignClick(task)}>
                    <AssignIcon fontSize="small" />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    color="error" 
                    onClick={() => handleDeleteTask(task._id)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Edit Task Dialog */}
      <Dialog open={editDialogOpen} onClose={handleEditClose}>
        <DialogTitle>Edit Task</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Title"
            fullWidth
            value={editTask.title}
            onChange={(e) => setEditTask({...editTask, title: e.target.value})}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={4}
            value={editTask.description}
            onChange={(e) => setEditTask({...editTask, description: e.target.value})}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Status</InputLabel>
            <Select
              value={editTask.status}
              label="Status"
              onChange={(e) => setEditTask({...editTask, status: e.target.value})}
            >
              <MenuItem value="pending">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Chip size="small" label={STATUS_LABELS.pending} color={STATUS_COLORS.pending} />
                </Box>
              </MenuItem>
              <MenuItem value="in-progress">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Chip size="small" label={STATUS_LABELS["in-progress"]} color={STATUS_COLORS["in-progress"]} />
                </Box>
              </MenuItem>
              <MenuItem value="completed">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Chip size="small" label={STATUS_LABELS.completed} color={STATUS_COLORS.completed} />
                </Box>
              </MenuItem>
              <MenuItem value="cancelled">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Chip size="small" label={STATUS_LABELS.cancelled} color={STATUS_COLORS.cancelled} />
                </Box>
              </MenuItem>
              <MenuItem value="behind-schedule">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Chip 
                    size="small" 
                    label={STATUS_LABELS["behind-schedule"]} 
                    color={STATUS_COLORS["behind-schedule"]} 
                    sx={{ 
                      bgcolor: STATUS_HEX_COLORS["behind-schedule"],
                      color: 'white'
                    }}
                  />
                </Box>
              </MenuItem>
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Due Date"
            type="datetime-local"
            fullWidth
            value={editTask.dueDate}
            onChange={(e) => setEditTask({...editTask, dueDate: e.target.value})}
            InputLabelProps={{
              shrink: true,
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose}>Cancel</Button>
          <Button onClick={handleEditSave}>Save</Button>
        </DialogActions>
      </Dialog>
      
      {/* Assign Task Dialog */}
      <Dialog open={assignDialogOpen} onClose={handleAssignClose}>
        <DialogTitle>Assign Task</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="dense">
            <InputLabel>Assign To</InputLabel>
            <Select
              value={selectedUserId}
              label="Assign To"
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <MenuItem value="">
                <em>Unassigned</em>
              </MenuItem>
              {users.map(user => (
                <MenuItem key={user._id} value={user._id}>
                  {user.name} ({user.email})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAssignClose}>Cancel</Button>
          <Button onClick={handleAssignSave}>Assign</Button>
        </DialogActions>
      </Dialog>

      {/* Create Task Dialog */}
      <Dialog open={createDialogOpen} onClose={handleCreateDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>Create New Task</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Title"
            fullWidth
            value={newTask.title}
            onChange={(e) => setNewTask({...newTask, title: e.target.value})}
            required
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={4}
            value={newTask.description}
            onChange={(e) => setNewTask({...newTask, description: e.target.value})}
            required
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Status</InputLabel>
            <Select
              value={newTask.status}
              label="Status"
              onChange={(e) => setNewTask({...newTask, status: e.target.value})}
            >
              <MenuItem value="pending">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Chip size="small" label={STATUS_LABELS.pending} color={STATUS_COLORS.pending} />
                </Box>
              </MenuItem>
              <MenuItem value="in-progress">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Chip size="small" label={STATUS_LABELS["in-progress"]} color={STATUS_COLORS["in-progress"]} />
                </Box>
              </MenuItem>
              <MenuItem value="completed">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Chip size="small" label={STATUS_LABELS.completed} color={STATUS_COLORS.completed} />
                </Box>
              </MenuItem>
              <MenuItem value="cancelled">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Chip size="small" label={STATUS_LABELS.cancelled} color={STATUS_COLORS.cancelled} />
                </Box>
              </MenuItem>
              <MenuItem value="behind-schedule">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Chip 
                    size="small" 
                    label={STATUS_LABELS["behind-schedule"]} 
                    color={STATUS_COLORS["behind-schedule"]} 
                    sx={{ 
                      bgcolor: STATUS_HEX_COLORS["behind-schedule"],
                      color: 'white'
                    }}
                  />
                </Box>
              </MenuItem>
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Due Date"
            type="datetime-local"
            fullWidth
            value={newTask.dueDate}
            onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
            InputLabelProps={{
              shrink: true,
            }}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Visibility</InputLabel>
            <Select
              value={newTask.visibility}
              label="Visibility"
              onChange={(e) => setNewTask({...newTask, visibility: e.target.value})}
            >
              <MenuItem value="public">Public</MenuItem>
              <MenuItem value="private">Private</MenuItem>
              <MenuItem value="team">Team</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth margin="dense">
            <InputLabel>Assign To</InputLabel>
            <Select
              value={selectedAssignee}
              label="Assign To"
              onChange={(e) => setSelectedAssignee(e.target.value)}
            >
              <MenuItem value="">
                <em>Unassigned</em>
              </MenuItem>
              {users.map(user => (
                <MenuItem key={user._id} value={user._id}>
                  {user.name} ({user.email})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCreateDialogClose}>Cancel</Button>
          <Button 
            onClick={handleCreateTask} 
            variant="contained" 
            color="primary"
            disabled={!newTask.title || !newTask.description}
          >
            Create Task
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default AdminTasksPage;