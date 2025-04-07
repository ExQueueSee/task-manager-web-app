import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Box,
  Chip,
  Avatar,
  CircularProgress
} from '@mui/material';
import { getLeaderboard } from '../api';
import { useAuth } from '../context/AuthContext';
import { useSnackbar } from 'notistack';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import useDocumentTitle from '../hooks/useDocumentTitle';

const AdminLeaderboardPage = () => {
  useDocumentTitle('Leaderboard');
  const { token } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const response = await getLeaderboard();
        console.log('Leaderboard data:', response.data);
        setUsers(response.data);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
        enqueueSnackbar('Failed to fetch leaderboard', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [token, enqueueSnackbar]);

  // Helper function to get initials for avatar
  const getInitials = (name) => {
    if (!name) return '';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  };

  // Helper to get medal color for top ranks
  const getMedalColor = (rank) => {
    switch (rank) {
      case 1:
        return '#FFD700'; // Gold
      case 2:
        return '#C0C0C0'; // Silver
      case 3:
        return '#CD7F32'; // Bronze
      default:
        return null; // No medal
    }
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
      }}
    >
      <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <EmojiEventsIcon sx={{ mr: 1, fontSize: 32 }} />
        Business Cred Leaderboard
      </Typography>
      
      <Typography variant="body2" color="text.secondary" paragraph>
        Users are ranked based on their performance with tasks. Gain credits by completing tasks before deadlines and lose credits when tasks are late.
      </Typography>

      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Rank</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Email</TableCell>
                <TableCell align="right">Business Cred</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user, index) => {
                const rank = index + 1;
                const medalColor = getMedalColor(rank);
                
                return (
                  <TableRow 
                  key={user._id} 
                  sx={{ 
                    backgroundColor: rank <= 3 ? `${medalColor}22` : 'inherit',
                    '&:hover': {
                    backgroundColor: (theme) => 
                      theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.05)' 
                      : 'rgba(0, 0, 0, 0.02)'
                    }
                  }}
                  >
                  <TableCell>
                    {rank <= 3 ? (
                    <Chip 
                      label={`#${rank}`}
                      sx={{ 
                      bgcolor: medalColor,
                      color: '#000',
                      fontWeight: 'bold'
                      }}
                    />
                    ) : `#${rank}`}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar 
                      sx={{ 
                      mr: 2, 
                      bgcolor: rank <= 3 ? medalColor : 'primary.main'
                      }}
                    >
                      {getInitials(user.name || 'N/A')}
                    </Avatar>
                    {user.name || 'Unknown User'}
                    </Box>
                  </TableCell>
                  <TableCell>{user.email || 'No Email Provided'}</TableCell>
                  <TableCell align="right">
                    <Chip 
                    label={user.credits != null ? user.credits : 'N/A'} 
                    color={
                      user.credits >= 10 ? 'success' :
                      user.credits > 0 ? 'primary' :
                      user.credits < 0 ? 'error' : 'default'
                    }
                    />
                  </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};

export default AdminLeaderboardPage;