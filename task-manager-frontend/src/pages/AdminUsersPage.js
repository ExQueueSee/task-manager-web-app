import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Select,
  FormControl, InputLabel
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { getAllUsers, updateUser, deleteUser } from '../api';
import { useAuth } from '../context/AuthContext';
import { useSnackbar } from 'notistack';
import { updateUserApproval } from '../api';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import useDocumentTitle from '../hooks/useDocumentTitle';

const AdminUsersPage = () => {
  useDocumentTitle('Users');
  const { token } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'ascending'
  });

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAllUsers(token);
      setUsers(response.data);
    } catch (error) {
      enqueueSnackbar('Failed to fetch users', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [token, enqueueSnackbar]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'ascending') {
        direction = 'descending';
      } else if (sortConfig.direction === 'descending') {
        return setSortConfig({ key: null, direction: 'ascending' });
      }
    }
    setSortConfig({ key, direction });
  };

  const getSortedUsers = useCallback(() => {
    if (!sortConfig.key) return users;
    
    return [...users].sort((a, b) => {
      if (sortConfig.key === 'createdAt' || sortConfig.key === 'lastLogin') {
        const aDate = a[sortConfig.key] ? new Date(a[sortConfig.key]) : new Date(0);
        const bDate = b[sortConfig.key] ? new Date(b[sortConfig.key]) : new Date(0);
        
        return sortConfig.direction === 'ascending' 
          ? aDate - bDate
          : bDate - aDate;
      }
      
      if (typeof a[sortConfig.key] === 'boolean') {
        if (sortConfig.direction === 'ascending') {
          return a[sortConfig.key] === b[sortConfig.key] ? 0 : a[sortConfig.key] ? 1 : -1;
        } else {
          return a[sortConfig.key] === b[sortConfig.key] ? 0 : a[sortConfig.key] ? -1 : 1;
        }
      }
      
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
      
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  }, [users, sortConfig]);

  const sortedUsers = getSortedUsers();

  const handleEditClick = (user) => {
    setCurrentUser(user);
    setEditName(user.name);
    setEditRole(user.role);
    setEditDialogOpen(true);
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setCurrentUser(null);
  };

  const handleEditSubmit = async () => {
    try {
      await updateUser(currentUser._id, { name: editName, role: editRole }, token);
      enqueueSnackbar('User updated successfully', { variant: 'success' });
      fetchUsers();
      handleEditClose();
    } catch (error) {
      enqueueSnackbar('Failed to update user', { variant: 'error' });
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteUser(userId, token);
        enqueueSnackbar('User deleted successfully', { variant: 'success' });
        fetchUsers();
      } catch (error) {
        enqueueSnackbar('Failed to delete user', { variant: 'error' });
      }
    }
  };

  const handleApprovalClick = (user) => {
    setSelectedUser(user);
    setApprovalDialogOpen(true);
  };

  const handleApprove = async () => {
    try {
      await updateUserApproval(selectedUser._id, 'approved', token);
      enqueueSnackbar('User approved successfully', { variant: 'success' });
      fetchUsers();
      setApprovalDialogOpen(false);
    } catch (error) {
      enqueueSnackbar('Failed to update approval status', { variant: 'error' });
      console.error('Error approving user:', error);
    }
  };

  const handleDecline = async () => {
    try {
      await updateUserApproval(selectedUser._id, 'declined', token);
      enqueueSnackbar('User declined successfully', { variant: 'success' });
      fetchUsers();
      setApprovalDialogOpen(false);
    } catch (error) {
      enqueueSnackbar('Failed to update approval status', { variant: 'error' });
      console.error('Error declining user:', error);
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        User Management
      </Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
          <Typography>Loading users...</Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ mt: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell onClick={() => requestSort('name')} sx={{ cursor: 'pointer' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  Name
                  {sortConfig.key === 'name' && (
                    <Box component="span" sx={{ ml: 0.5 }}>
                      {sortConfig.direction === 'ascending' ? '▲' : '▼'}
                    </Box>
                  )}
                </Box>
              </TableCell>
              <TableCell onClick={() => requestSort('email')} sx={{ cursor: 'pointer' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  Email
                  {sortConfig.key === 'email' && (
                    <Box component="span" sx={{ ml: 0.5 }}>
                      {sortConfig.direction === 'ascending' ? '▲' : '▼'}
                    </Box>
                  )}
                </Box>
              </TableCell>
              <TableCell onClick={() => requestSort('isAdmin')} sx={{ cursor: 'pointer' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  Role
                  {sortConfig.key === 'isAdmin' && (
                    <Box component="span" sx={{ ml: 0.5 }}>
                      {sortConfig.direction === 'ascending' ? '▲' : '▼'}
                    </Box>
                  )}
                </Box>
              </TableCell>
              <TableCell onClick={() => requestSort('approvalStatus')} sx={{ cursor: 'pointer' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  Registered
                  {sortConfig.key === 'approvalStatus' && (
                    <Box component="span" sx={{ ml: 0.5 }}>
                      {sortConfig.direction === 'ascending' ? '▲' : '▼'}
                    </Box>
                  )}
                </Box>
              </TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">Loading users...</TableCell>
              </TableRow>
            ) : sortedUsers.map(user => (
              <TableRow key={user._id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Chip 
                    label={user.role}
                    color={user.role === 'admin' ? 'secondary' : 'primary'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {user.approvalStatus === 'approved' ? (
                      <Chip
                        icon={<CheckCircleIcon />}
                        label="Approved"
                        color="success"
                        size="small"
                      />
                    ) : user.approvalStatus === 'declined' ? (
                      <Chip
                        icon={<CancelIcon />}
                        label="Declined"
                        color="error"
                        size="small"
                      />
                    ) : (
                      <Chip
                        icon={<HourglassEmptyIcon />}
                        label="Pending"
                        color="warning"
                        size="small"
                      />
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    color={
                      user.approvalStatus === 'approved' 
                        ? 'success' 
                        : user.approvalStatus === 'declined' 
                          ? 'error' 
                          : 'warning'
                    }
                    onClick={() => handleApprovalClick(user)}
                  >
                    {user.approvalStatus === 'approved' ? (
                      <CheckCircleIcon fontSize="small" />
                    ) : user.approvalStatus === 'declined' ? (
                      <CancelIcon fontSize="small" />
                    ) : (
                      <HourglassEmptyIcon fontSize="small" />
                    )}
                  </IconButton>
                  
                  {/* Keep your existing edit/delete buttons */}
                  <IconButton size="small" onClick={() => handleEditClick(user)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    color="error" 
                    onClick={() => handleDeleteUser(user._id)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      )}
      
      <Dialog open={editDialogOpen} onClose={handleEditClose}>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            variant="outlined"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Role</InputLabel>
            <Select
              value={editRole}
              label="Role"
              onChange={(e) => setEditRole(e.target.value)}
            >
              <MenuItem value="user">User</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose}>Cancel</Button>
          <Button onClick={handleEditSubmit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={approvalDialogOpen} onClose={() => setApprovalDialogOpen(false)}>
        <DialogTitle>
          User Approval: {selectedUser?.name}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Current status: 
            <strong>
              {selectedUser?.approvalStatus === 'approved' 
                ? ' Approved' 
                : selectedUser?.approvalStatus === 'declined' 
                  ? ' Declined' 
                  : ' Pending'}
            </strong>
          </Typography>
          
          <Typography variant="body2" color="text.secondary">
            Email: {selectedUser?.email}
          </Typography>
          
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2">
              Change approval status:
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setApprovalDialogOpen(false)} 
            color="inherit"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDecline}
            variant="outlined" 
            color="error"
            startIcon={<CancelIcon />}
          >
            Decline
          </Button>
          <Button 
            onClick={handleApprove} 
            variant="contained" 
            color="success"
            startIcon={<CheckCircleIcon />}
          >
            Approve
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default AdminUsersPage;