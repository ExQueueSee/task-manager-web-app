import React from 'react';
import { 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Checkbox, 
  ListItemText,
  OutlinedInput,
  Box,
  Chip
} from '@mui/material';

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const UserMultiSelect = ({ users, selectedUserIds, onChange, label = "Visible To" }) => {
  return (
    <FormControl fullWidth margin="dense">
      <InputLabel>{label}</InputLabel>
      <Select
        multiple
        value={selectedUserIds}
        onChange={(e) => onChange(e.target.value)}
        input={<OutlinedInput label={label} />}
        renderValue={(selected) => (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {selected.map((userId) => {
              const user = users.find(u => u._id === userId);
              return (
                <Chip 
                  key={userId} 
                  label={user ? user.name : 'Unknown User'} 
                  size="small"
                  sx={{ maxWidth: '150px' }}
                />
              );
            })}
          </Box>
        )}
        MenuProps={MenuProps}
      >
        {users.map((user) => (
          <MenuItem key={user._id} value={user._id}>
            <Checkbox checked={selectedUserIds.indexOf(user._id) > -1} />
            <ListItemText primary={`${user.name} (${user.email})`} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default UserMultiSelect;