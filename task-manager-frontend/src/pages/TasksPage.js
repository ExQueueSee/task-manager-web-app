import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Chip,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActions,
  IconButton,
  LinearProgress,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PersonIcon from '@mui/icons-material/Person';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';

import { getTasks, createTask, updateTask, deleteTask, assignTask, getAllUsers } from '../api';
import { useAuth } from '../context/AuthContext';
import { STATUS_LABELS, STATUS_COLORS, STATUS_HEX_COLORS } from '../constants/TaskConstants.js';

// Status chip colors
const statusColors = {
  'pending': 'info', // Blue
  'in-progress': 'warning', // Orange/amber
  'completed': 'success', // Green
  'cancelled': 'error', // Red
  'behind-schedule': 'secondary' // Purple
};

// Status labels for better readability
const statusLabels = {
  'pending': 'Available',
  'in-progress': 'In Progress',
  'completed': 'Completed',
  'behind-schedule': 'Behind Schedule',
  'cancelled': 'Cancelled'
};

const TasksPage = () => {
  const { token, isAdmin, user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  
  // Task states
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  
  // Form states
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [assignedUser, setAssignedUser] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [isUnassigned, setIsUnassigned] = useState(false);
  const [allUsers, setAllUsers] = useState([]);

  const fetchTasks = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await getTasks(token);
      setTasks(response.data);
    } catch (error) {
      enqueueSnackbar('Failed to fetch tasks', { variant: 'error' });
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [token, enqueueSnackbar]);

  useEffect(() => {
    fetchTasks();
  }, [token, fetchTasks]);

  const fetchUsers = async () => {
    if (isAdmin) {
      try {
        const response = await getAllUsers(token);
        setAllUsers(response.data);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    }
  };

  const handleOpenDialog = (task = null) => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setDueDate(new Date(task.dueDate || Date.now()));
      setEditMode(true);
      setEditId(task._id);
      setAssignedUser(task.owner ? task.owner._id : '');
    } else {
      setTitle('');
      setDescription('');
      setDueDate(null);
      setEditMode(false);
      setEditId(null);
      setAssignedUser('');
    }
    setOpen(true);
    fetchUsers();
  };

  const handleCloseDialog = () => {
    setOpen(false);
  };

  // Update handleSubmit to properly handle assigned users
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('isUnassigned on submit:', isUnassigned);

    try {
      let taskData = {
        title,
        description,
        dueDate,
        visibility: visibility || 'public'
      };
      
      // Handle task assignment
      if (isUnassigned) {
        // If unassigned checkbox is checked, don't include owner field
        taskData.status = 'pending';
      } else if (assignedUser) {
        // If a user is selected from dropdown, assign to them
        taskData.owner = assignedUser;
        taskData.status = 'in-progress';
      } else {
        // Default: assign to current user
        taskData.owner = user._id;
        taskData.status = 'in-progress';
      }
      
      if (editMode) {
        await updateTask(editId, taskData, token);
        enqueueSnackbar('Task updated successfully', { variant: 'success' });
      } else {
        await createTask(taskData, token);
        enqueueSnackbar('Task created successfully', { variant: 'success' });
      }
      
      handleCloseDialog();
      fetchTasks();
    } catch (error) {
      enqueueSnackbar(editMode ? 'Failed to update task' : 'Failed to create task', { variant: 'error' });
      console.error('Error with task:', error);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await deleteTask(taskId, token);
      enqueueSnackbar('Task deleted successfully', { variant: 'success' });
      fetchTasks();
    } catch (error) {
      enqueueSnackbar('Failed to delete task', { variant: 'error' });
      console.error('Error deleting task:', error);
    }
  };

  const handleTakeTask = async (taskId) => {
    try {
      await assignTask(taskId, user._id, token);
      await updateTask(taskId, { status: 'in-progress' }, token);
      enqueueSnackbar('Task assigned to you successfully', { variant: 'success' });
      fetchTasks();
    } catch (error) {
      enqueueSnackbar('Failed to take task', { variant: 'error' });
      console.error('Error taking task:', error);
    }
  };

  // Update the handleStatusChange function
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await updateTask(taskId, { status: newStatus }, token);
      
      // If status is "pending", show a specific message
      if (newStatus === 'pending') {
        enqueueSnackbar('Task is now available for others to take', { variant: 'info' });
      } else {
        enqueueSnackbar(`Task status updated to ${statusLabels[newStatus]}`, { variant: 'success' });
      }
      
      fetchTasks();
    } catch (error) {
      enqueueSnackbar('Failed to update task status', { variant: 'error' });
      console.error('Error updating task:', error);
    }
  };

  // Add this debugging code
  useEffect(() => {
    if (tasks.length > 0) {
      console.log('Task sample:', tasks[0]);
      console.log('Tasks with no owner:', tasks.filter(t => !t.owner).length);
      console.log('Tasks with current user:', tasks.filter(t => t.owner && t.owner._id === user?._id).length);
      console.log('Available tasks:', tasks.filter(t => !t.owner && t.status === 'pending').length);
      console.log('User ID:', user?._id);
    }
  }, [tasks, user]);

  useEffect(() => {
    if (isUnassigned) {
      setAssignedUser('');  // Clear selected user when making unassigned
    }
  }, [isUnassigned]);
  

  // Filter tasks based on tab
  const filteredTasks = React.useMemo(() => {
    switch (tabValue) {
      case 0: // All
        return tasks;
      case 1: // My Tasks (assigned to current user)
        return tasks.filter(task => 
          task.owner?._id === user?._id && 
          task.status !== 'completed'
        );
      case 2: // Available Tasks (unassigned/pending)
        return tasks.filter(task => 
          (!task.owner || task.owner === null) && 
          task.status === 'pending'
        );
      case 3: // Completed
        return tasks.filter(task => task.status === 'completed');
      default:
        return tasks;
    }
  }, [tasks, tabValue, user]);

  // Either utilize the canEditTask function or remove it to avoid the warning.
  // Here's an implementation that uses it to conditionally enable edit actions:
  const canEditTask = (task) => {
    return isAdmin || (task.owner && task.owner._id === user?._id);
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Tasks Management
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add New Task
        </Button>
      </Box>

      <Tabs
        value={tabValue}
        onChange={(e, newValue) => setTabValue(newValue)}
        indicatorColor="primary"
        textColor="primary"
        sx={{ mb: 3 }}
      >
        <Tab label="All Tasks" />
        <Tab label="My Tasks" />
        <Tab label="Available Tasks" /> {/* New tab */}
        <Tab label="Completed" />
      </Tabs>

      {loading ? (
        <LinearProgress />
      ) : filteredTasks.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 5 }}>
          <Typography variant="h6" color="text.secondary">
            No tasks found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Create your first task to get started
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredTasks.map(task => (
            <Grid item xs={12} sm={6} md={4} key={task._id}>
              <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="h6" component="div" noWrap>
                      {task.title}
                    </Typography>
                    <Chip 
                      label={statusLabels[task.status]} 
                      size="small" 
                      sx={{ 
                        bgcolor: task.status === 'behind-schedule' ? '#9b59b6' : undefined,
                        color: task.status === 'behind-schedule' ? 'white' : undefined
                      }}
                      color={statusColors[task.status] || 'default'} 
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {task.description}
                  </Typography>
                  
                  {task.dueDate && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <AccessTimeIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        Due: {format(new Date(task.dueDate), 'PPp')}
                      </Typography>
                    </Box>
                  )}
                  
                  {task.owner && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <PersonIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        Assigned to: {task.owner._id === user?._id ? 'You' : (task.owner.name || 'Unknown')}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
                
                <CardActions>
                  {/* These buttons are visible based on permissions */}
                  <Box>
                    <Tooltip title="Edit">
                      <IconButton 
                        size="small" 
                        onClick={() => handleOpenDialog(task)}
                        disabled={!canEditTask(task)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => handleDeleteTask(task._id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  
                  {/* For UNASSIGNED tasks: Show Take Task button */}
                  {(!task.owner || task.owner === null) && task.status === 'pending' && (
                    <Button
                      variant="contained"
                      size="small"
                      color="primary"
                      onClick={() => handleTakeTask(task._id)}
                      startIcon={<AssignmentIcon />}
                    >
                      Take Task
                    </Button>
                  )}
                  
                  {/* For YOUR tasks: Show status dropdown */}
                  {task.owner && task.owner._id === user?._id && (
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <Select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task._id, e.target.value)}
                        size="small"
                        variant="outlined"
                      >
                        <MenuItem value="pending">
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Chip size="small" label={STATUS_LABELS.pending} color={STATUS_COLORS.pending} />
                            <Typography variant="caption" sx={{ ml: 1 }}>
                              (Task will become available to others)
                            </Typography>
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
                        {isAdmin && (
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
                        )}
                      </Select>
                    </FormControl>
                  )}
                  
                  {/* For OTHERS' tasks: Just show who owns it (the UI already shows this in the card content) */}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Task Form Dialog */}
      <Dialog open={open} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>{editMode ? 'Edit Task' : 'Create New Task'}</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Title"
              fullWidth
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              variant="outlined"
            />
            <TextField
              margin="dense"
              label="Description"
              fullWidth
              multiline
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              variant="outlined"
            />
            <Box sx={{ mt: 2 }}>
              <DateTimePicker
                label="Due Date"
                value={dueDate}
                onChange={setDueDate}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Box>
            {isAdmin && (
              <>
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel>Assign To</InputLabel>
                  <Select
                    value={assignedUser}
                    label="Assign To"
                    onChange={(e) => setAssignedUser(e.target.value)}
                    disabled={isUnassigned} // Disable when "unassigned" checkbox is checked
                  >
                    <MenuItem value="">Unassigned</MenuItem>
                    {allUsers.map((user) => (
                      <MenuItem key={user._id} value={user._id}>
                        {user.name} ({user.email})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel>Visibility</InputLabel>
                  <Select
                    value={visibility}
                    label="Visibility"
                    onChange={(e) => setVisibility(e.target.value)}
                  >
                    <MenuItem value="public">Public</MenuItem>
                    <MenuItem value="private">Private</MenuItem>
                    <MenuItem value="team">Team</MenuItem>
                  </Select>
                </FormControl>
              </>
            )}
            <FormControlLabel
              control={
                <Checkbox 
                  checked={isUnassigned} 
                  onChange={(e) => {
                    setIsUnassigned(e.target.checked);
                    if (e.target.checked) {
                      // When checking unassigned, clear any selected user
                      setAssignedUser('');
                    }
                  }} 
                />
              }
              label="Create as unassigned task (available for anyone to take)"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              {editMode ? 'Save Changes' : 'Create Task'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Paper>
  );
};

export default TasksPage;