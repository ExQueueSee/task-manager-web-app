import React, { useState, useEffect, useMemo } from 'react';
import { 
    Box, 
    Typography, 
    Grid, 
    Paper, 
    List, 
    ListItem, 
    ListItemText, 
    Divider,
    LinearProgress,
    Chip
} from '@mui/material';
import { 
    PieChart, 
    Pie, 
    Cell, 
    ResponsiveContainer,
    Tooltip, 
    Legend,
    Sector
} from 'recharts';
import { getTasks } from '../api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import useDocumentTitle from '../hooks/useDocumentTitle';

const DashboardPage = () => {
  useDocumentTitle('Dashboard');
  
  const { token, user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(null);
  const [upcomingTasks, setUpcomingTasks] = useState([]);

  //Add "cancelled" to your status colors object wrapped in useMemo
  const statusColors = useMemo(() => ({
    'pending': '#3498db',     // Blue
    'in-progress': '#f39c12', // Orange/amber
    'completed': '#2ecc71',   // Green
    'cancelled': '#e74c3c',   // Red
    'behind-schedule': '#9b59b6' // Purple
  }), []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const tasksResponse = await getTasks(token);
        setTasks(tasksResponse.data);
        
        // Apply the filter for upcoming tasks
        setUpcomingTasks(getUpcomingTasks(tasksResponse.data));
        
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchData();
    }
  }, [token]);

  // Filter function for upcoming tasks
  const getUpcomingTasks = (tasks) => {
    if (!tasks) return [];
    
    // Filter out completed, cancelled, behind-schedule tasks and tasks without due date
    return tasks
      .filter(task => 
        task.status !== 'completed' && 
        task.status !== 'cancelled' && 
        task.status !== 'behind-schedule' &&
        task.dueDate !== null
      )
      .sort((a, b) => {
        // Sort by due date (ascending)
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      })
      .slice(0, 5); // Limit to 5 tasks
  };

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const pendingTasks = tasks.filter(task => task.status === 'pending').length;
  const inProgressTasks = tasks.filter(task => task.status === 'in-progress').length;
  const cancelledTasks = tasks.filter(task => task.status === 'cancelled').length;
  const behindScheduleTasks = tasks.filter(task => task.status === 'behind-schedule').length;

  // Chart data - filter out zero values
  const statusData = [
    { name: 'Completed', value: completedTasks, color: statusColors['completed'] },
    { name: 'In Progress', value: inProgressTasks, color: statusColors['in-progress'] },
    { name: 'Pending', value: pendingTasks, color: statusColors['pending'] },
    { name: 'Cancelled', value: cancelledTasks, color: statusColors['cancelled'] },
    { name: 'Behind Schedule', value: behindScheduleTasks, color: statusColors['behind-schedule'] }
  ].filter(item => item.value > 0);

  // Custom active shape for pie chart
  const renderActiveShape = (props) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 30) * cos;
    const my = cy + (outerRadius + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 6}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333">{`${payload.name}: ${value}`}</text>
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey + 18} textAnchor={textAnchor} fill="#999" fontSize={12}>
          {`(${(percent * 100).toFixed(0)}%)`}
        </text>
      </g>
    );
  };

  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };

  // Recently completed tasks
  const recentlyCompleted = [...tasks]
    .filter(task => task.status === 'completed')
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    .slice(0, 5);

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 4 }}>
        Dashboard
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Welcome back, {user?.name}!
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Here's an overview of your tasks and progress.
        </Typography>
      </Box>
      
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
            <Typography variant="h6" color="text.secondary">Total Tasks</Typography>
            <Typography variant="h3">{totalTasks}</Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', height: '100%', bgcolor: 'success.light' }}>
            <Typography variant="h6" color="white">Completed</Typography>
            <Typography variant="h3" color="white">{completedTasks}</Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', height: '100%', bgcolor: 'warning.light' }}>
            <Typography variant="h6" color="white">In Progress</Typography>
            <Typography variant="h3" color="white">{inProgressTasks}</Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', height: '100%', bgcolor: 'info.light' }}>
            <Typography variant="h6" color="white">Pending</Typography>
            <Typography variant="h3" color="white">{pendingTasks}</Typography>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Charts & Lists */}
      <Grid container spacing={3}>
        {/* Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Task Status Distribution</Typography>
            {totalTasks > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    activeIndex={activeIndex}
                    activeShape={renderActiveShape}
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    onMouseEnter={onPieEnter}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ textAlign: 'center', py: 5 }}>
                <Typography color="text.secondary">No tasks available</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        
        {/* Upcoming Tasks */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Tasks With Deadlines</Typography>
            {upcomingTasks.length > 0 ? (
              <List>
                {upcomingTasks.map((task) => (
                  <React.Fragment key={task._id}>
                    <ListItem>
                      <ListItemText
                        primary={task.title}
                        secondary={
                          <>
                            <Typography component="span" variant="body2" color="text.primary">
                              {task.description.substring(0, 60)}
                              {task.description.length > 60 ? '...' : ''}
                            </Typography>
                            {task.dueDate && (
                              <Typography component="span" variant="body2" display="block">
                                Due: {format(new Date(task.dueDate), 'PPp')}
                              </Typography>
                            )}
                          </>
                        }
                      />
                      <Chip 
                        label={task.status} 
                        size="small" 
                        color={
                          task.status === 'pending' ? 'info' : 
                          task.status === 'in-progress' ? 'warning' : 'default'
                        } 
                      />
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Box sx={{ textAlign: 'center', py: 5 }}>
                <Typography color="text.secondary">No upcoming tasks</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        
        {/* Recently Completed Tasks */}
        <Grid item xs={12} md={12}>
          <Paper sx={{ p: 2, mt: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Recently Completed Tasks</Typography>
            {recentlyCompleted.length > 0 ? (
              <List>
                {recentlyCompleted.map((task) => (
                  <React.Fragment key={task._id}>
                    <ListItem>
                      <ListItemText
                        primary={task.title}
                        secondary={
                          <>
                            <Typography component="span" variant="body2" color="text.primary">
                              {task.description.substring(0, 60)}
                              {task.description.length > 60 ? '...' : ''}
                            </Typography>
                            <Typography component="span" variant="body2" display="block">
                              Completed: {format(new Date(task.updatedAt || task.createdAt), 'PPp')}
                            </Typography>
                          </>
                        }
                      />
                      <Chip label="Completed" size="small" color="success" />
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Box sx={{ textAlign: 'center', py: 5 }}>
                <Typography color="text.secondary">No completed tasks</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;