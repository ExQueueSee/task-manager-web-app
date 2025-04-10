import React, { useState, useEffect, useCallback } from 'react';
import { 
  Typography, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Chip, IconButton,
  Button, Dialog, DialogActions, DialogContent, DialogTitle,
  TextField, MenuItem, Select, FormControl, InputLabel, Box,
  FormControlLabel, Checkbox, Menu, Tooltip, useMediaQuery, useTheme
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  PersonAdd as AssignIcon,
  FileDownload as FileDownloadIcon,
  Attachment as AttachmentIcon
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

  // State variables for sorting
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'ascending'
  });

  // Add these lines near the top of your component
  const theme = useTheme();
  const isExtraSmallScreen = useMediaQuery('(max-width:400px)');
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const isMediumScreen = useMediaQuery(theme.breakpoints.down('md'));

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

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'ascending') {
        direction = 'descending';
      } else if (sortConfig.direction === 'descending') {
        // If already descending, clear the sort
        return setSortConfig({ key: null, direction: 'ascending' });
      }
    }
    setSortConfig({ key, direction });
  };

  const getSortedTasks = useCallback(() => {
    if (!sortConfig.key) return tasks;
    
    return [...tasks].sort((a, b) => {
      // Handle nested properties like owner.name
      if (sortConfig.key === 'assignedTo') {
        const aOwner = a.owner ? (typeof a.owner === 'object' ? a.owner.name : '') : '';
        const bOwner = b.owner ? (typeof b.owner === 'object' ? b.owner.name : '') : '';
        
        // Make comparison case-insensitive for names
        if (aOwner.toLowerCase() < bOwner.toLowerCase()) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aOwner.toLowerCase() > bOwner.toLowerCase()) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      }
      
      // Handle date comparisons
      if (sortConfig.key === 'dueDate') {
        const aDate = a.dueDate ? new Date(a.dueDate) : new Date(0);
        const bDate = b.dueDate ? new Date(b.dueDate) : new Date(0);
        
        return sortConfig.direction === 'ascending' 
          ? aDate - bDate
          : bDate - aDate;
      }
      
      // Handle string comparisons (case-insensitive)
      if (typeof a[sortConfig.key] === 'string' && typeof b[sortConfig.key] === 'string') {
        const aValue = a[sortConfig.key].toLowerCase();
        const bValue = b[sortConfig.key].toLowerCase();
        
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      }
      
      // Handle other types (numbers, booleans)
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  }, [tasks, sortConfig]);

  const sortedTasks = getSortedTasks();

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

  // Add this function to handle downloads
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
    <Paper 
      sx={{ 
        p: { xs: 1, sm: 2, md: 3 },
        borderRadius: { xs: 1, sm: 2 },
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
      <Box sx={{ 
        display: 'flex', 
        flexDirection: isMediumScreen ? 'column' : 'row',
        gap: isMediumScreen ? 2 : 0,
        justifyContent: 'space-between', 
        alignItems: isMediumScreen ? 'flex-start' : 'center', 
        mb: 3 
      }}>
        <Typography 
          variant={isMediumScreen ? "h5" : "h4"} 
          component="h1" 
          gutterBottom={isMediumScreen}
        >
          Task Management (Admin) 
        </Typography>
        
        <Box sx={{ 
          display: 'flex',
          width: isMediumScreen ? '100%' : 'auto',
          justifyContent: isMediumScreen ? 'space-between' : 'flex-end'
        }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleCreateDialogOpen}
            sx={{ mr: 1 }}
            size={isMediumScreen ? "medium" : "large"}
          >
            Create New Task
          </Button>
          
          <Button
            variant="outlined"
            color="primary"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportClick}
            size={isMediumScreen ? "medium" : "large"}
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
        component={Paper}
        sx={{ 
          overflowX: 'auto',
          maxWidth: '100%',
          '&::-webkit-scrollbar': {
            height: '8px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: '4px',
          },
        }}
      >
        <Table size={isSmallScreen ? "small" : "medium"}>
          <TableHead>
            <TableRow>
              <TableCell onClick={() => requestSort('title')} sx={{ cursor: 'pointer' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  Title
                  {sortConfig.key === 'title' && (
                    <Box component="span" sx={{ ml: 0.5 }}>
                      {sortConfig.direction === 'ascending' ? '▲' : '▼'}
                    </Box>
                  )}
                </Box>
              </TableCell>
              
              {!isExtraSmallScreen && (
                <TableCell 
                  onClick={() => requestSort('description')} 
                  sx={{ 
                    cursor: 'pointer',
                    maxWidth: isMediumScreen ? 150 : 'none',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    Description
                    {sortConfig.key === 'description' && (
                      <Box component="span" sx={{ ml: 0.5 }}>
                        {sortConfig.direction === 'ascending' ? '▲' : '▼'}
                      </Box>
                    )}
                  </Box>
                </TableCell>
              )}
              
              <TableCell onClick={() => requestSort('status')} sx={{ cursor: 'pointer' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  Status
                  {sortConfig.key === 'status' && (
                    <Box component="span" sx={{ ml: 0.5 }}>
                      {sortConfig.direction === 'ascending' ? '▲' : '▼'}
                    </Box>
                  )}
                </Box>
              </TableCell>
              
              {!isExtraSmallScreen && (
                <TableCell 
                  onClick={() => requestSort('assignedTo')} 
                  sx={{ 
                    cursor: 'pointer',
                    maxWidth: isMediumScreen ? 180 : 'none',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    Assigned To
                    {sortConfig.key === 'assignedTo' && (
                      <Box component="span" sx={{ ml: 0.5 }}>
                        {sortConfig.direction === 'ascending' ? '▲' : '▼'}
                      </Box>
                    )}
                  </Box>
                </TableCell>
              )}
              
              {!isSmallScreen && (
                <TableCell onClick={() => requestSort('dueDate')} sx={{ cursor: 'pointer' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    Due Date
                    {sortConfig.key === 'dueDate' && (
                      <Box component="span" sx={{ ml: 0.5 }}>
                        {sortConfig.direction === 'ascending' ? '▲' : '▼'}
                      </Box>
                    )}
                  </Box>
                </TableCell>
              )}
              
              {!isSmallScreen && <TableCell>Attachment</TableCell>}
              
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={isExtraSmallScreen ? 3 : isSmallScreen ? 4 : 7} align="center">Loading tasks...</TableCell>
              </TableRow>
            ) : sortedTasks.map(task => (
              <TableRow key={task._id}>
                <TableCell sx={{ 
                  maxWidth: isMediumScreen ? 150 : 'none',
                  whiteSpace: isMediumScreen ? 'nowrap' : 'normal',
                  overflow: isMediumScreen ? 'hidden' : 'visible',
                  textOverflow: isMediumScreen ? 'ellipsis' : 'clip',
                }}>
                  {isMediumScreen && task.title.length > 20 ? (
                    <Tooltip title={task.title}>
                      <span>{task.title.substring(0, 20)}...</span>
                    </Tooltip>
                  ) : (
                    task.title
                  )}
                </TableCell>
                
                {!isExtraSmallScreen && (
                  <TableCell sx={{ 
                    maxWidth: isMediumScreen ? 150 : 'none',
                    whiteSpace: isMediumScreen ? 'nowrap' : 'normal',
                    overflow: isMediumScreen ? 'hidden' : 'visible',
                    textOverflow: isMediumScreen ? 'ellipsis' : 'clip',
                  }}>
                    {isMediumScreen && task.description.length > 40 ? (
                      <Tooltip title={task.description}>
                        <span>{task.description.substring(0, 40)}...</span>
                      </Tooltip>
                    ) : (
                      task.description
                    )}
                  </TableCell>
                )}
                
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
                
                {!isExtraSmallScreen && (
                  <TableCell sx={{ 
                    maxWidth: isMediumScreen ? 180 : 'none',
                    whiteSpace: isMediumScreen ? 'nowrap' : 'normal',
                    overflow: isMediumScreen ? 'hidden' : 'visible',
                    textOverflow: isMediumScreen ? 'ellipsis' : 'clip',
                  }}>
                    {task.owner ? (
                      (() => {
                        const ownerId = typeof task.owner === 'object' ? task.owner._id : task.owner;
                        const assignedUser = users.find(u => u._id === ownerId);
                        const userDisplay = assignedUser ? `${assignedUser.name} (${assignedUser.email})` : 'Unknown User';
                        
                        if (isMediumScreen && userDisplay.length > 25) {
                          return (
                            <Tooltip title={userDisplay}>
                              <span>{userDisplay.substring(0, 25)}...</span>
                            </Tooltip>
                          );
                        }
                        return userDisplay;
                      })()
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Unassigned
                      </Typography>
                    )}
                  </TableCell>
                )}
                
                {!isSmallScreen && (
                  <TableCell>
                    {task.dueDate ? (
                      isMediumScreen ? 
                        new Date(task.dueDate).toLocaleDateString() : 
                        new Date(task.dueDate).toLocaleString()
                    ) : (
                      <Typography variant="body2" color="text.secondary">No due date</Typography>
                    )}
                  </TableCell>
                )}
                
                {!isSmallScreen && (
                  <TableCell>
                    {task.attachment && task.attachment.filename ? (
                      <Tooltip title={`Download ${task.attachment.filename}`}>
                        <IconButton 
                          size="small" 
                          onClick={() => handleDownloadAttachment(task._id, task.attachment.filename)}
                        >
                          <AttachmentIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Typography variant="body2" color="text.secondary">None</Typography>
                    )}
                  </TableCell>
                )}
                
                <TableCell>
                  <Box sx={{ 
                    display: 'flex', 
                    gap: { xs: 0.5, sm: isMediumScreen ? 0.5 : 1 },
                    flexWrap: 'wrap'
                  }}>
                    <IconButton 
                      size="small" 
                      sx={{ 
                        bgcolor: 'primary.light', 
                        color: 'primary.contrastText',
                        padding: isExtraSmallScreen ? '4px' : isMediumScreen ? '6px' : '8px',
                        '&:hover': { transform: 'scale(1.1)' },
                        transition: 'transform 0.2s'
                      }}
                      onClick={() => handleEditClick(task)}
                    >
                      <EditIcon fontSize={isExtraSmallScreen ? "inherit" : "small"} />
                    </IconButton>
                    
                    <IconButton 
                      size="small"
                      sx={{ 
                        bgcolor: 'secondary.light', 
                        color: 'secondary.contrastText',
                        padding: isExtraSmallScreen ? '4px' : isMediumScreen ? '6px' : '8px',
                        '&:hover': { transform: 'scale(1.1)' },
                        transition: 'transform 0.2s'
                      }}
                      onClick={() => handleAssignClick(task)}
                    >
                      <AssignIcon fontSize={isExtraSmallScreen ? "inherit" : "small"} />
                    </IconButton>
                    
                    <IconButton 
                      size="small"
                      sx={{ 
                        bgcolor: 'error.light', 
                        color: 'error.contrastText',
                        padding: isExtraSmallScreen ? '4px' : isMediumScreen ? '6px' : '8px',
                        '&:hover': { transform: 'scale(1.1)' },
                        transition: 'transform 0.2s'
                      }}
                      onClick={() => handleDeleteTask(task._id)}
                    >
                      <DeleteIcon fontSize={isExtraSmallScreen ? "inherit" : "small"} />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      <Dialog 
        open={editDialogOpen} 
        onClose={handleEditClose}
        fullScreen={isSmallScreen}
        maxWidth="md"
        PaperProps={{
          sx: {
            width: isMediumScreen && !isSmallScreen ? '80%' : undefined,
            maxHeight: isMediumScreen && !isSmallScreen ? '90%' : undefined,
          }
        }}
      >
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
        <DialogActions sx={{ padding: isMediumScreen ? 2 : undefined }}>
          <Button onClick={handleEditClose}>Cancel</Button>
          <Button onClick={handleEditSave} variant={isMediumScreen ? "contained" : "text"}>Save</Button>
        </DialogActions>
      </Dialog>
      
      <Dialog 
        open={assignDialogOpen} 
        onClose={handleAssignClose}
        fullScreen={isSmallScreen}
        maxWidth="md"
        PaperProps={{
          sx: {
            width: isMediumScreen && !isSmallScreen ? '80%' : undefined,
            maxHeight: isMediumScreen && !isSmallScreen ? '90%' : undefined,
          }
        }}
      >
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
        <DialogActions sx={{ padding: isMediumScreen ? 2 : undefined }}>
          <Button onClick={handleAssignClose}>Cancel</Button>
          <Button onClick={handleAssignSave} variant={isMediumScreen ? "contained" : "text"}>Assign</Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={createDialogOpen} 
        onClose={handleCreateDialogClose} 
        fullScreen={isSmallScreen}
        maxWidth="md"
        PaperProps={{
          sx: {
            width: isMediumScreen && !isSmallScreen ? '80%' : undefined,
            maxHeight: isMediumScreen && !isSmallScreen ? '90%' : undefined,
          }
        }}
      >
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
        <DialogActions sx={{ padding: isMediumScreen ? 2 : undefined }}>
          <Button onClick={handleCreateDialogClose}>Cancel</Button>
          <Button 
            onClick={handleCreateTask} 
            variant="contained" 
            color="primary"
            disabled={!newTask.title || !newTask.description}
            size={isMediumScreen ? "medium" : "large"}
          >
            Create Task
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default AdminTasksPage;