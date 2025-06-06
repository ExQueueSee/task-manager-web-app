import React, { useState, useEffect, useCallback } from 'react';
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
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Menu,
  useMediaQuery
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PersonIcon from '@mui/icons-material/Person';
import StarIcon from '@mui/icons-material/Star';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import AttachmentIcon from '@mui/icons-material/Attachment';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { styled } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import useDocumentTitle from '../hooks/useDocumentTitle.js';
import TaskSkeleton from '../components/TaskSkeleton';

import { getTasks, createTask, updateTask, deleteTask, assignTask, getAllUsers, exportTasks } from '../api';
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

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

const TasksPage = () => {
  useDocumentTitle('Tasks');
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
  const [attachmentFile, setAttachmentFile] = useState(null);

  // Function to check and update tasks that are behind schedule
  const checkBehindScheduleTasks = useCallback((tasksList) => {
    // Safety check before mapping
    if (!tasksList || !Array.isArray(tasksList)) {
      console.warn('Expected array of tasks but got:', tasksList);
      return [];
    }
    const now = new Date();
    const updatedTasks = tasksList.map(task => {
      // Check if task has due date and is overdue
      if (task.dueDate && new Date(task.dueDate) < now &&
        task.status !== 'completed' &&
        task.status !== 'cancelled' &&
        task.status !== 'behind-schedule') {
        // Automatically update the status on the UI
        return { ...task, status: 'behind-schedule' };
      }
      return task;
    });

    return updatedTasks;
  }, []);

  const fetchTasks = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await getTasks(token);
      //console.log('API Response:', response); // Debug log

      // Handle different response formats
      let tasksData;

      if (response && response.data) {
        // Case 1: Response has a data property
        tasksData = Array.isArray(response.data)
          ? response.data
          : (response.data.tasks || response.data.results || []);
      } else if (Array.isArray(response)) {
        // Case 2: Response is directly an array
        tasksData = response;
      } else {
        // Case 3: Unexpected format
        console.warn('Unexpected response format:', response);
        tasksData = [];
      }

      // Make sure we have an array before trying to map
      if (!Array.isArray(tasksData)) {
        console.error('Tasks data is not an array:', tasksData);
        tasksData = [];
      }

      // Safely process tasks
      const updatedTasks = checkBehindScheduleTasks(tasksData);
      setTasks(updatedTasks);

    } catch (error) {
      console.error('Error fetching tasks:', error);
      enqueueSnackbar('Failed to load tasks', { variant: 'error' });
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [token, enqueueSnackbar, checkBehindScheduleTasks]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();

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
        // Can't upload file when editing (according to requirements)
        await updateTask(editId, taskData, token);
        enqueueSnackbar('Task updated successfully', { variant: 'success' });
      } else {
        // Use the updated createTask function with attachment
        await createTask(taskData, attachmentFile, token);
        enqueueSnackbar('Task created successfully', { variant: 'success' });
      }

      handleCloseDialog();
      fetchTasks();
      setAttachmentFile(null); // Reset file state
    } catch (error) {
      enqueueSnackbar(editMode ? 'Failed to update task' : 'Failed to create task', { variant: 'error' });
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

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const task = tasks.find(t => t._id === taskId);

      if (!task) return;

      // Check if task is behind schedule
      const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
      const isBehindSchedule = task.status === 'behind-schedule';

      if ((isOverdue || isBehindSchedule) && !isAdmin) {
        enqueueSnackbar('Task is behind schedule. Status can only be modified by an admin.', {
          variant: 'warning'
        });
        return;
      }

      // For admin users with behind schedule tasks
      if ((isOverdue || isBehindSchedule) && isAdmin && newStatus !== 'cancelled') {
        enqueueSnackbar('Behind schedule tasks can only be cancelled. To enable other statuses, please update the due date first.', {
          variant: 'warning'
        });
        return;
      }

      await updateTask(taskId, { status: newStatus }, token);

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

  // Uncomment for debug purposes
  /*
  useEffect(() => {
    if (tasks.length > 0) {
      console.log('Task sample:', tasks[0]);
      console.log('Tasks with no owner:', tasks.filter(t => !t.owner).length);
      console.log('Tasks with current user:', tasks.filter(t => t.owner && t.owner._id === user?._id).length);
      console.log('Available tasks:', tasks.filter(t => !t.owner && t.status === 'pending').length);
      console.log('User ID:', user?._id);
    }
  }, [tasks, user]);
  */

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

  const canEditTask = (task) => {
    return isAdmin || (task.owner && task.owner._id === user?._id);
  };

  // Set up interval to check for overdue tasks
  useEffect(() => {
    // Check every once in a while for tasks that might have become overdue
    const interval = setInterval(() => {
      setTasks(prevTasks => {
        const now = new Date();
        return prevTasks.map(task => {
          if (task.dueDate && new Date(task.dueDate) < now &&
            task.status !== 'completed' &&
            task.status !== 'cancelled' &&
            task.status !== 'behind-schedule') {
            // If found any newly overdue task, fetch fresh data from server
            fetchTasks();
            return task; // Original return since fetchTasks will update state
          }
          return task;
        });
      });
    }, 5000); // Check every 5 sec

    return () => clearInterval(interval);
  }, [fetchTasks]);

  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  const openExportMenu = Boolean(exportAnchorEl);

  const handleExportClick = (event) => {
    setExportAnchorEl(event.currentTarget);
  };

  const handleExportClose = () => {
    setExportAnchorEl(null);
  };

  const handleExport = async (filterType) => {
    try {
      await exportTasks(filterType);
      enqueueSnackbar(`Exporting ${filterType} tasks...`, { variant: 'info' });
    } catch (error) {
      enqueueSnackbar('Failed to export tasks', { variant: 'error' });
    }
    handleExportClose();
  };

  const handleDownloadAttachment = async (taskId, filename) => {
    try {
      const response = await fetch(`http://localhost:3000/tasks/${taskId}/attachment`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download attachment');
      }

      // Create a blob from the response
      const blob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'attachment';
      document.body.appendChild(a);
      a.click();

      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      enqueueSnackbar('Downloading attachment...', { variant: 'success' });
    } catch (error) {
      console.error('Download error:', error);
      enqueueSnackbar('Failed to download attachment', { variant: 'error' });
    }
  };

  return (
    <Paper sx={{ 
      p: { xs: 1, sm: 2, md: 3 },  // Responsive padding
      borderRadius: { xs: 1, sm: 2 },  // Responsive border radius
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Tasks Management
        </Typography>
        <Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ mr: 1 }}
          >
            Add New Task
          </Button>

          <Button
            variant="outlined"
            color="primary"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportClick}
          >
            Export
          </Button>
          <Menu
            anchorEl={exportAnchorEl}
            open={openExportMenu}
            onClose={handleExportClose}
          >
            <MenuItem onClick={() => handleExport('all')}>All Tasks</MenuItem>
            <MenuItem onClick={() => handleExport('my')}>My Tasks</MenuItem>
            <MenuItem onClick={() => handleExport('available')}>Available Tasks</MenuItem>
            <MenuItem onClick={() => handleExport('in-progress')}>In Progress Tasks</MenuItem>
            <MenuItem onClick={() => handleExport('completed')}>Completed Tasks</MenuItem>
            <MenuItem onClick={() => handleExport('cancelled')}>Cancelled Tasks</MenuItem>
            <MenuItem onClick={() => handleExport('behind-schedule')}>Behind Schedule Tasks</MenuItem>
          </Menu>
        </Box>
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
        <Grid container spacing={{ xs: 1, sm: 2, md: 3 }}>
          {Array.from(new Array(8)).map((_, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} xl={2} key={index}>
              <TaskSkeleton />
            </Grid>
          ))}
        </Grid>
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
        <Grid container spacing={{ xs: 1, sm: 2, md: 3 }}>
          {filteredTasks.map(task => (
            <Grid 
              item 
              xs={12}
              sm={6} 
              md={4} 
              lg={3}
              xl={2}
              // Add specific breakpoints for fold devices
              sx={{ 
                '@media (max-width: 360px)': {
                  maxWidth: '100%',
                  flexBasis: '100%',
                }
              }} 
              key={task._id}
            >
              <Card
                variant="outlined"
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  overflow: 'visible',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    borderRadius: 'inherit',
                    boxShadow: '0 10px 30px -15px rgba(0, 0, 0, 0.15)',
                    opacity: 0,
                    transition: 'opacity 0.3s ease',
                  },
                  '@media (hover: hover)': {
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      '&::before': {
                        opacity: 1,
                      },
                    },
                  },
                  transition: 'transform 0.3s ease',
                }}
              >
                {/* Status bar at the top of the card */}
                <Box
                  sx={{
                    height: '5px',
                    width: '100%',
                    backgroundColor:
                      task.status === 'completed' ? '#4caf50' :
                        task.status === 'in-progress' ? '#ff9800' :
                          task.status === 'behind-schedule' ? '#9b59b6' :
                            task.status === 'cancelled' ? '#f44336' :
                              '#2196f3',
                    borderTopLeftRadius: 'inherit',
                    borderTopRightRadius: 'inherit',
                  }}
                />

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

                      {/* Credit indicator */}
                      {task.status !== 'completed' && task.status !== 'cancelled' && (
                        <Tooltip title={
                          new Date(task.dueDate) > new Date()
                            ? "Complete before deadline to earn credits"
                            : "This task is past due and may affect your credits negatively"
                        }>
                          <Chip
                            icon={<StarIcon fontSize="small" />}
                            label={new Date(task.dueDate) > new Date() ? "+1-2" : "-1"}
                            size="small"
                            color={new Date(task.dueDate) > new Date() ? "primary" : "error"}
                            sx={{ ml: 1 }}
                          />
                        </Tooltip>
                      )}
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

                <CardActions sx={{
                  flexWrap: 'wrap',
                  gap: 1,
                  justifyContent: {
                    xs: 'center',  // Center on mobile
                    sm: 'flex-start'  // Left-align on larger screens
                  }
                }}>
                  {/* These buttons are visible based on permissions */}
                  <Box>
                    <Tooltip title={canEditTask(task) ? "Edit" : "You cannot edit this task"}>
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(task)}
                          disabled={!canEditTask(task)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </span>
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
                  {task.attachment && (
                    <Tooltip title={(task.attachment && task.attachment.filename) ? "Download Attachment" : "No attachment available"}>
                      <span>
                        <IconButton
                          size="small"
                          color={(task.attachment && task.attachment.filename) ? "primary" : "default"}
                          onClick={(task.attachment && task.attachment.filename) ? () => handleDownloadAttachment(
                            task._id,
                            task.attachment.filename
                          ) : undefined}
                          disabled={!(task.attachment && task.attachment.filename)}
                        >
                          <AttachmentIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Task Form Dialog */}
      <Dialog
        open={open}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        fullScreen={useMediaQuery((theme) => theme.breakpoints.down('sm'))}
        sx={{
          '& .MuiDialog-paper': {
            width: { xs: '95%', sm: '80%', md: '600px' },
            margin: { xs: '16px', sm: '32px', md: 'auto' },
          }
        }}
      >
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
                slotProps={{ textField: { fullWidth: true } }}
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
            <Box sx={{ mt: 2 }}>
              <Button
                component="label"
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                sx={{ mt: 2 }}
              >
                Upload Attachment (Max 10MB)
                <VisuallyHiddenInput 
                  type="file" 
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file && file.size <= 10 * 1024 * 1024) { // 10MB limit
                      setAttachmentFile(file);
                    } else if (file) {
                      enqueueSnackbar('File size exceeds 10MB limit', { variant: 'error' });
                    }
                  }}
                />
              </Button>
              {attachmentFile && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Selected file: {attachmentFile.name} ({(attachmentFile.size / 1024 / 1024).toFixed(2)} MB)
                </Typography>
              )}
            </Box>
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