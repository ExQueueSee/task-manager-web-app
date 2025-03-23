import { useEffect } from 'react';

/**
 * Custom hook to set the document title
 * @param {string} title - The title to set (will be appended with "| Task Manager")
 */
const useDocumentTitle = (title) => {
  useEffect(() => {
    // Set the new title
    document.title = title ? `${title} | Task Manager` : 'Task Manager';
    
    // Cleanup function to reset title when component unmounts
    return () => {
      document.title = 'Task Manager';
    };
  }, [title]);
};

export default useDocumentTitle;