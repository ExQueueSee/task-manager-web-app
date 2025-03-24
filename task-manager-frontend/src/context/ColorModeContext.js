import React, { createContext, useContext } from 'react';

const ColorModeContext = createContext();

export const useColorMode = () => useContext(ColorModeContext);

export const ColorModeProvider = ({ children }) => {
  // Always set mode to 'dark'
  const mode = 'dark';
  
  // Empty function since we no longer toggle
  const toggleColorMode = () => {};

  return (
    <ColorModeContext.Provider value={{ mode, toggleColorMode }}>
      {children}
    </ColorModeContext.Provider>
  );
};