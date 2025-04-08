import React from 'react';
import { Card, CardContent, CardActions, Skeleton, Box } from '@mui/material';

const TaskSkeleton = () => {
  return (
    <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ height: '5px', width: '100%', bgcolor: 'grey.300' }} />
      <CardContent sx={{ flexGrow: 1 }}>
        <Skeleton variant="text" width="60%" height={32} />
        <Skeleton variant="text" width="40%" height={24} sx={{ mb: 1.5 }} />
        <Skeleton variant="rectangular" height={60} sx={{ mb: 1.5 }} />
        <Skeleton variant="text" width="40%" height={24} />
      </CardContent>
      <CardActions>
        <Skeleton variant="circular" width={32} height={32} sx={{ mr: 1 }} />
        <Skeleton variant="circular" width={32} height={32} />
      </CardActions>
    </Card>
  );
};

export default TaskSkeleton;