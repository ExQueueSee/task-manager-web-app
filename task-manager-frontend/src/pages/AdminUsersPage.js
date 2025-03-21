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

const AdminUsersPage = () => {
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
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Approval Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map(user => (
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