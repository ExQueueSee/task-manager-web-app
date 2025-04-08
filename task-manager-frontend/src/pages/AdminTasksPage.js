import React, { useState, useEffect } from 'react';
import { 
  Typography, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Chip, IconButton,
  Button, Dialog, DialogActions, DialogContent, DialogTitle,
  TextField, MenuItem, Select, FormControl, InputLabel, Box,
  FormControlLabel, Checkbox, Menu
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  PersonAdd as AssignIcon,
  FileDownload as FileDownloadIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useAuth } from '../context/AuthContext';
import { useSnackbar } from 'notistack';
import { getAllTasks, updateTask, deleteTask, getAllUsers, exportTasks } from '../api';
import { STATUS_LABELS, STATUS_COLORS, STATUS_HEX_COLORS } from '../constants/TaskConstants.js';
import useDocumentTitle from '../hooks/useDocumentTitle.js';
import UserMultiSelect from '../components/UserMultiSelect';

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

const AdminTasksPage = () => {
  useDocumentTitle('Manage Tasks');
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
    visibleTo: [],
    isPublic: true
  });
  const [selectedUserId, setSelectedUserId] = useState('');

  // State variables for the new task dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    status: 'pending',
    dueDate: '',
    visibleTo: [],
    isPublic: true
  });
  const [selectedAssignee, setSelectedAssignee] = useState('');

  // State variables for export menu
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  const openExportMenu = Boolean(exportAnchorEl);

  // State for file attachment
  const [attachmentFile, setAttachmentFile] = useState(null);

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
      // Check for and update behind schedule tasks
      const updatedTasks = response.data.map(task => {
        if (task.dueDate && new Date(task.dueDate) < new Date() && 
            task.status !== 'completed' && 
            task.status !== 'cancelled' &&
            task.status !== 'behind-schedule') {
          return { ...task, status: 'behind-schedule' };
        }
        return task;
      });
      setTasks(updatedTasks);
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
      visibleTo: task.visibleTo || [],
      isPublic: task.isPublic !== undefined ? task.isPublic : true
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
      // Find the original task we're editing
      const originalTask = tasks.find(t => t._id === currentTask._id);
      const isOverdue = originalTask.dueDate && new Date(originalTask.dueDate) < new Date();
      const wasBehindSchedule = originalTask.status === 'behind-schedule';

      // Special handling for behind schedule tasks
      if ((wasBehindSchedule || isOverdue) && 
          originalTask.status !== 'completed' && 
          originalTask.status !== 'cancelled') {
        
        // If trying to change status of a behind-schedule task
        if (originalTask.status !== editTask.status) {
          // Only allow completed or cancelled status changes
          const allowedStatuses = ['completed', 'cancelled', 'behind-schedule'];
          if (!allowedStatuses.includes(editTask.status)) {
            enqueueSnackbar('Behind schedule tasks can only be set to completed or cancelled', { 
              variant: 'warning' 
            });
            return;
          }
        }
        
        // Handle due date extension
        const newDueDate = editTask.dueDate ? new Date(editTask.dueDate) : null;
        const currentDate = new Date();
        const isDueDateExtended = newDueDate && newDueDate > currentDate;
        
        if (isDueDateExtended) {
          // Due date is being extended to the future, allow the update
          // The backend will handle the status change based on owner
        }
      }
      
      await updateTask(currentTask._id, editTask, token);
      enqueueSnackbar('Task updated successfully', { variant: 'success' });
      fetchTasks();
      setEditDialogOpen(false);
    } catch (error) {
      enqueueSnackbar(error.response?.data?.error || 'Failed to update task', { variant: 'error' });
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

  // Handler functions
  const handleCreateDialogOpen = () => {
    setNewTask({
      title: '',
      description: '',
      status: 'pending',
      dueDate: '',
      visibleTo: [],
      isPublic: true
    });
    setSelectedAssignee('');
    setCreateDialogOpen(true);
  };

  const handleCreateDialogClose = () => {
    setCreateDialogOpen(false);
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.size <= 10 * 1024 * 1024) { // 10MB limit
      setAttachmentFile(file);
    } else if (file) {
      enqueueSnackbar('File size exceeds 10MB limit', { variant: 'error' });
    }
  };

  const handleCreateTask = async () => {
    try {
      const taskData = { ...newTask };
      
      // Add owner if a user is selected
      if (selectedAssignee) {
        taskData.owner = selectedAssignee;
        taskData.status = 'in-progress';
      }
      
      // Create FormData to send file
      const formData = new FormData();
      
      // Append all task data
      Object.keys(taskData).forEach(key => {
        if (key === 'visibleTo' && Array.isArray(taskData[key])) {
          taskData[key].forEach(id => formData.append('visibleTo[]', id));
        } else {
          formData.append(key, taskData[key]);
        }
      });
      
      // Add file if selected
      if (attachmentFile) {
        formData.append('attachment', attachmentFile);
      }
      
      // Send request with FormData
      await fetch('http://localhost:3000/tasks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      enqueueSnackbar('Task created successfully', { variant: 'success' });
      fetchTasks();
      setCreateDialogOpen(false);
      setAttachmentFile(null); // Reset file state
    } catch (error) {
      enqueueSnackbar(error.message || 'Failed to create task', { variant: 'error' });
    }
  };

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

  return (
    <Paper 
      sx={{ 
        p: 3,
        borderRadius: 2,
        backdropFilter: 'blur(10px)',
        backgroundColor: (theme) => 
          theme.palette.mode === 'dark' 
            ? 'rgba(18, 18, 18, 0.8)' 
            : 'rgba(255, 255, 255, 0.9)',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
        transition: 'transform 0.3s ease-in-out',
        '&:hover': {
          transform: 'translateY(-5px)'
        }
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Task Management (Admin) 
        </Typography>
        
        <Box>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleCreateDialogOpen}
            sx={{ mr: 1 }}
          >
            Create New Task
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
      
      <TableContainer
        sx={{
          borderRadius: 1,
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
          '& .MuiTableHead-root': {
            backgroundColor: (theme) => 
              theme.palette.mode === 'dark' 
                ? 'rgba(30, 30, 30, 0.8)' 
                : theme.palette.primary.light,
            '& .MuiTableCell-head': {
              color: (theme) => 
                theme.palette.mode === 'dark' 
                  ? theme.palette.common.white 
                  : theme.palette.primary.contrastText,
              fontWeight: 600
            }
          },
          '& .MuiTableRow-root': {
            transition: 'background-color 0.2s',
            '&:hover': {
              backgroundColor: (theme) => 
                theme.palette.mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.05)' 
                  : 'rgba(0, 0, 0, 0.02)'
            }
          }
        }}
      >
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
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton 
                      size="small" 
                      sx={{ 
                        bgcolor: 'primary.light', 
                        color: 'primary.contrastText',
                        '&:hover': { transform: 'scale(1.1)' },
                        transition: 'transform 0.2s'
                      }}
                      onClick={() => handleEditClick(task)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small"
                      sx={{ 
                        bgcolor: 'secondary.light', 
                        color: 'secondary.contrastText',
                        '&:hover': { transform: 'scale(1.1)' },
                        transition: 'transform 0.2s'
                      }}
                      onClick={() => handleAssignClick(task)}
                    >
                      <AssignIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small"
                      sx={{ 
                        bgcolor: 'error.light', 
                        color: 'error.contrastText',
                        '&:hover': { transform: 'scale(1.1)' },
                        transition: 'transform 0.2s'
                      }}
                      onClick={() => handleDeleteTask(task._id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
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
          <FormControl fullWidth margin="dense">
            <FormControlLabel
              control={
                <Checkbox 
                  checked={editTask.isPublic} 
                  onChange={(e) => setEditTask({...editTask, isPublic: e.target.checked, visibleTo: e.target.checked ? [] : editTask.visibleTo})}
                />
              }
              label="Visible to everyone"
            />
          </FormControl>

          {!editTask.isPublic && (
            <UserMultiSelect
              users={users}
              selectedUserIds={editTask.visibleTo}
              onChange={(selectedUsers) => setEditTask({...editTask, visibleTo: selectedUsers})}
            />
          )}
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
            <FormControlLabel
              control={
                <Checkbox 
                  checked={newTask.isPublic} 
                  onChange={(e) => setNewTask({...newTask, isPublic: e.target.checked, visibleTo: e.target.checked ? [] : newTask.visibleTo})}
                />
              }
              label="Visible to everyone"
            />
          </FormControl>

          {!newTask.isPublic && (
            <UserMultiSelect
              users={users}
              selectedUserIds={newTask.visibleTo}
              onChange={(selectedUsers) => setNewTask({...newTask, visibleTo: selectedUsers})}
            />
          )}
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
                onChange={handleFileChange} 
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