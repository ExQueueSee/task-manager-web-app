import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  List, 
  ListItem, 
  ListItemText, 
  Divider,
  LinearProgress,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import Grid from '@mui/material/Grid'; // Import Grid
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  Tooltip, 
  Legend,
  Sector
} from 'recharts';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import StarIcon from '@mui/icons-material/Star';
import { getTasks, getUserRank } from '../api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import useDocumentTitle from '../hooks/useDocumentTitle';

const Dashboard = () => {
  useDocumentTitle('Dashboard');
  
  const { token, user } = useAuth();
  const [tasks, setTasks] = useState([]); // Ensure tasks is initialized as an array
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(null);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [userRank, setUserRank] = useState({ rank: 0, credits: 0 });
  const [loadingRank, setLoadingRank] = useState(true);

  const theme = useTheme();
  const isExtraSmallScreen = useMediaQuery('(max-width:400px)');
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

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
    setLoadingRank(true);
    
    const [tasksResponse, rankResponse] = await Promise.all([
      getTasks(token),
      getUserRank()
    ]);
    
    setTasks(Array.isArray(tasksResponse.data) ? tasksResponse.data : []); // Ensure tasks is an array
    setUpcomingTasks(getUpcomingTasks(tasksResponse.data));
    setUserRank(rankResponse.data);
    } catch (error) {
    console.error('Error fetching data:', error);
    } finally {
    setLoading(false);
    setLoadingRank(false);
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
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill={fill}>{`${payload.name}: ${value}`}</text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey + 18} textAnchor={textAnchor} fill={fill} fontSize={12}>
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
    {/* Adjust header typography for extra small screens */}
    <Typography 
      variant={isExtraSmallScreen ? "h5" : "h4"} 
      sx={{ 
        mb: { xs: 1.5, sm: 2, md: 4 },
        fontSize: isExtraSmallScreen ? '1.4rem' : undefined
      }}
    >
      Dashboard
    </Typography>
    
    <Box sx={{ mb: isExtraSmallScreen ? 1 : 2 }}>
      <Typography 
        variant={isExtraSmallScreen ? "subtitle1" : "h6"} 
        sx={{ mb: isExtraSmallScreen ? 0.5 : 1 }}
      >
        Welcome back, {user?.name}!
      </Typography>
      <Typography 
        variant="body2" 
        color="text.secondary"
        sx={{ fontSize: isExtraSmallScreen ? '0.75rem' : undefined }}
      >
        Here's an overview of your tasks and progress.
      </Typography>
    </Box>
    
    {/* Stats Cards - adjust spacing and layout for extra small screens */}
    <Grid 
      container 
      spacing={{ xs: isExtraSmallScreen ? 0.5 : 1, sm: 2, md: 3 }} 
      sx={{ mb: { xs: isExtraSmallScreen ? 1 : 2, sm: 4 } }}
    >
      {/* Business Cred Card */}
      <Grid item xs={isExtraSmallScreen ? 6 : 12} sm={6} md={3}>
        <Paper 
          sx={{ 
            p: { xs: isExtraSmallScreen ? 0.75 : 1, sm: 2 }, 
            textAlign: 'center', 
            height: '100%', 
            background: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <StarIcon sx={{ 
            fontSize: { 
              xs: isExtraSmallScreen ? 40 : 60, 
              sm: 100 
            }, 
            position: 'absolute', 
            right: isExtraSmallScreen ? -10 : -20, 
            bottom: isExtraSmallScreen ? -10 : -15, 
            opacity: 0.2 
          }} />
          <Typography 
            variant={isExtraSmallScreen ? "body2" : (isSmallScreen ? "subtitle1" : "h6")} 
            color="white"
          >
            Business Cred
          </Typography>
          <Typography 
            variant={isExtraSmallScreen ? "h5" : (isSmallScreen ? "h4" : "h3")} 
            color="white"
            sx={{ fontSize: isExtraSmallScreen ? '1.25rem' : undefined }}
          >
            {loadingRank ? '...' : userRank.credits}
          </Typography>
        </Paper>
      </Grid>
      
      {/* Rank Card */}
      <Grid item xs={isExtraSmallScreen ? 6 : 12} sm={6} md={3}>
        <Paper 
          sx={{ 
            p: { xs: isExtraSmallScreen ? 0.75 : 1, sm: 2 }, 
            textAlign: 'center', 
            height: '100%', 
            background: 'linear-gradient(135deg, #FF9800 0%, #FF5722 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <EmojiEventsIcon sx={{ 
            fontSize: { 
              xs: isExtraSmallScreen ? 40 : 60, 
              sm: 100 
            }, 
            position: 'absolute', 
            right: isExtraSmallScreen ? -10 : -20, 
            bottom: isExtraSmallScreen ? -10 : -15, 
            opacity: 0.2 
          }} />
          <Typography 
            variant={isExtraSmallScreen ? "body2" : (isSmallScreen ? "subtitle1" : "h6")} 
            color="white"
          >
            Rank
          </Typography>
          <Typography 
            variant={isExtraSmallScreen ? "h5" : (isSmallScreen ? "h4" : "h3")} 
            color="white"
            sx={{ fontSize: isExtraSmallScreen ? '1.25rem' : undefined }}
          >
            #{loadingRank ? '...' : userRank.rank}
          </Typography>
        </Paper>
      </Grid>

      {/* Total Tasks Card */}
      <Grid item xs={isExtraSmallScreen ? 6 : 12} sm={6} md={3}>
        <Paper sx={{ 
          p: { xs: isExtraSmallScreen ? 0.75 : 1, sm: 2 }, 
          textAlign: 'center', 
          height: '100%' 
        }}>
          <Typography 
            variant={isExtraSmallScreen ? "body2" : (isSmallScreen ? "subtitle1" : "h6")} 
            color="text.secondary"
          >
            Total Tasks
          </Typography>
          <Typography 
            variant={isExtraSmallScreen ? "h5" : (isSmallScreen ? "h4" : "h3")}
            sx={{ fontSize: isExtraSmallScreen ? '1.25rem' : undefined }}
          >
            {totalTasks}
          </Typography>
        </Paper>
      </Grid>
      
      {/* Completed Card */}
      <Grid item xs={isExtraSmallScreen ? 6 : 12} sm={6} md={3}>
        <Paper sx={{ 
          p: { xs: isExtraSmallScreen ? 0.75 : 1, sm: 2 }, 
          textAlign: 'center', 
          height: '100%', 
          bgcolor: 'success.light' 
        }}>
          <Typography 
            variant={isExtraSmallScreen ? "body2" : (isSmallScreen ? "subtitle1" : "h6")} 
            color="white"
          >
            Completed
          </Typography>
          <Typography 
            variant={isExtraSmallScreen ? "h5" : (isSmallScreen ? "h4" : "h3")} 
            color="white"
            sx={{ fontSize: isExtraSmallScreen ? '1.25rem' : undefined }}
          >
            {completedTasks}
          </Typography>
        </Paper>
      </Grid>
      
      {/* In Progress Card */}
      <Grid item xs={isExtraSmallScreen ? 6 : 12} sm={6} md={3}>
        <Paper sx={{ 
          p: { xs: isExtraSmallScreen ? 0.75 : 1, sm: 2 }, 
          textAlign: 'center', 
          height: '100%', 
          bgcolor: 'warning.light' 
        }}>
          <Typography 
            variant={isExtraSmallScreen ? "body2" : (isSmallScreen ? "subtitle1" : "h6")} 
            color="white"
          >
            In Progress
          </Typography>
          <Typography 
            variant={isExtraSmallScreen ? "h5" : (isSmallScreen ? "h4" : "h3")} 
            color="white"
            sx={{ fontSize: isExtraSmallScreen ? '1.25rem' : undefined }}
          >
            {inProgressTasks}
          </Typography>
        </Paper>
      </Grid>
      
      {/* Pending Card */}
      <Grid item xs={isExtraSmallScreen ? 6 : 12} sm={6} md={3}>
        <Paper sx={{ 
          p: { xs: isExtraSmallScreen ? 0.75 : 1, sm: 2 }, 
          textAlign: 'center', 
          height: '100%', 
          bgcolor: 'info.light' 
        }}>
          <Typography 
            variant={isExtraSmallScreen ? "body2" : (isSmallScreen ? "subtitle1" : "h6")} 
            color="white"
          >
            Pending
          </Typography>
          <Typography 
            variant={isExtraSmallScreen ? "h5" : (isSmallScreen ? "h4" : "h3")} 
            color="white"
            sx={{ fontSize: isExtraSmallScreen ? '1.25rem' : undefined }}
          >
            {pendingTasks}
          </Typography>
        </Paper>
      </Grid>
    </Grid>
    
    {/* Charts & Lists with extra small screen adjustments */}
    <Grid container spacing={{ xs: isExtraSmallScreen ? 0.5 : 1, sm: 2, md: 3 }}>
      {/* Chart */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ 
          p: { xs: isExtraSmallScreen ? 0.75 : 1, sm: 2 }, 
          height: '100%' 
        }}>
          <Typography 
            variant={isExtraSmallScreen ? "subtitle1" : "h6"} 
            sx={{ 
              mb: { xs: isExtraSmallScreen ? 0.5 : 1, sm: 2 },
              fontSize: isExtraSmallScreen ? '1rem' : undefined
            }}
          >
            Task Status Distribution
          </Typography>
          {totalTasks > 0 ? (
            <ResponsiveContainer 
              width="100%" 
              height={isExtraSmallScreen ? 200 : isSmallScreen ? 250 : 300}
            >
              <PieChart>
                <Pie
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={isExtraSmallScreen ? 40 : 60}
                  outerRadius={isExtraSmallScreen ? 60 : 80}
                  fill="#8884d8"
                  dataKey="value"
                  onMouseEnter={onPieEnter}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend 
                  iconSize={isExtraSmallScreen ? 8 : 10}
                  iconType="circle"
                  layout={isExtraSmallScreen ? "horizontal" : "vertical"}
                  verticalAlign={isExtraSmallScreen ? "bottom" : "middle"}
                  align={isExtraSmallScreen ? "center" : "right"}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Box sx={{ textAlign: 'center', py: isExtraSmallScreen ? 3 : 5 }}>
              <Typography 
                color="text.secondary"
                sx={{ fontSize: isExtraSmallScreen ? '0.75rem' : undefined }}
              >
                No tasks available
              </Typography>
            </Box>
          )}
        </Paper>
      </Grid>
      
      {/* Upcoming Tasks */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ 
          p: { xs: isExtraSmallScreen ? 0.75 : 1, sm: 2 }, 
          height: '100%' 
        }}>
          <Typography 
            variant={isExtraSmallScreen ? "subtitle1" : "h6"} 
            sx={{ 
              mb: { xs: isExtraSmallScreen ? 0.5 : 1, sm: 2 },
              fontSize: isExtraSmallScreen ? '1rem' : undefined
            }}
          >
            Tasks With Deadlines
          </Typography>
          {upcomingTasks.length > 0 ? (
            <List sx={{ 
              '& .MuiListItem-root': { 
                py: isExtraSmallScreen ? 0.5 : 1,
                px: isExtraSmallScreen ? 1 : 2
              } 
            }}>
              {upcomingTasks.map((task) => (
                <React.Fragment key={task._id}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Typography 
                          variant={isExtraSmallScreen ? "body2" : "body1"}
                          sx={{ fontWeight: 500 }}
                        >
                          {task.title}
                        </Typography>
                      }
                      secondary={
                        <>
                          <Typography 
                            component="span" 
                            variant="body2" 
                            color="text.primary"
                            sx={{ fontSize: isExtraSmallScreen ? '0.7rem' : undefined }}
                          >
                            {/* Trim description more aggressively on small screens */}
                            {task.description.substring(0, isExtraSmallScreen ? 30 : 60)}
                            {task.description.length > (isExtraSmallScreen ? 30 : 60) ? '...' : ''}
                          </Typography>
                          {task.dueDate && (
                            <Typography 
                              component="span" 
                              variant="body2" 
                              display="block"
                              sx={{ fontSize: isExtraSmallScreen ? '0.7rem' : undefined }}
                            >
                              Due: {format(new Date(task.dueDate), isExtraSmallScreen ? 'PP' : 'PPp')}
                            </Typography>
                          )}
                        </>
                      }
                    />
                    <Chip 
                      label={task.status} 
                      size="small" 
                      sx={{ fontSize: isExtraSmallScreen ? '0.6rem' : undefined, height: isExtraSmallScreen ? 20 : 24 }}
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
            <Box sx={{ textAlign: 'center', py: isExtraSmallScreen ? 3 : 5 }}>
              <Typography 
                color="text.secondary"
                sx={{ fontSize: isExtraSmallScreen ? '0.75rem' : undefined }}
              >
                No upcoming tasks
              </Typography>
            </Box>
          )}
        </Paper>
      </Grid>
      
      {/* Recently Completed Tasks */}
      <Grid item xs={12} md={12}>
        <Paper sx={{ 
          p: { xs: isExtraSmallScreen ? 0.75 : 1, sm: 2 }, 
          mt: { xs: isExtraSmallScreen ? 0.5 : 1, sm: 3 } 
        }}>
          <Typography 
            variant={isExtraSmallScreen ? "subtitle1" : "h6"} 
            sx={{ 
              mb: { xs: isExtraSmallScreen ? 0.5 : 1, sm: 2 },
              fontSize: isExtraSmallScreen ? '1rem' : undefined
            }}
          >
            Recently Completed Tasks
          </Typography>
          {recentlyCompleted.length > 0 ? (
            <List sx={{ 
              '& .MuiListItem-root': { 
                py: isExtraSmallScreen ? 0.5 : 1,
                px: isExtraSmallScreen ? 1 : 2
              } 
            }}>
              {recentlyCompleted.map((task) => (
                <React.Fragment key={task._id}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Typography 
                          variant={isExtraSmallScreen ? "body2" : "body1"}
                          sx={{ fontWeight: 500 }}
                        >
                          {task.title}
                        </Typography>
                      }
                      secondary={
                        <>
                          <Typography 
                            component="span" 
                            variant="body2" 
                            color="text.primary"
                            sx={{ fontSize: isExtraSmallScreen ? '0.7rem' : undefined }}
                          >
                            {/* Trim description more aggressively on small screens */}
                            {task.description.substring(0, isExtraSmallScreen ? 30 : 60)}
                            {task.description.length > (isExtraSmallScreen ? 30 : 60) ? '...' : ''}
                          </Typography>
                          <Typography 
                            component="span" 
                            variant="body2" 
                            display="block"
                            sx={{ fontSize: isExtraSmallScreen ? '0.7rem' : undefined }}
                          >
                            Completed: {format(new Date(task.updatedAt || task.createdAt), isExtraSmallScreen ? 'PP' : 'PPp')}
                          </Typography>
                        </>
                      }
                    />
                    <Chip 
                      label="Completed" 
                      size="small" 
                      color="success" 
                      sx={{ fontSize: isExtraSmallScreen ? '0.6rem' : undefined, height: isExtraSmallScreen ? 20 : 24 }}
                    />
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Box sx={{ textAlign: 'center', py: isExtraSmallScreen ? 3 : 5 }}>
              <Typography 
                color="text.secondary"
                sx={{ fontSize: isExtraSmallScreen ? '0.75rem' : undefined }}
              >
                No completed tasks
              </Typography>
            </Box>
          )}
        </Paper>
      </Grid>
    </Grid>
  </Box>
  );
};

export default Dashboard;