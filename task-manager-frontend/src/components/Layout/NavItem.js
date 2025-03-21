import React from 'react';
import { ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { NavLink } from 'react-router-dom';

const NavItem = ({ to, icon, text }) => {
  return (
    <ListItemButton
      component={NavLink}
      to={to}
      sx={{
        '&.active': {
          backgroundColor: 'action.selected',
        },
      }}
    >
      <ListItemIcon>{icon}</ListItemIcon>
      <ListItemText primary={text} />
    </ListItemButton>
  );
};

export default NavItem;