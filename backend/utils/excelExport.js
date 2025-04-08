const ExcelJS = require('exceljs');

/**
 * Generates an Excel file with task data
 * @param {Array} tasks - Array of task objects to export
 * @returns {Buffer} - Excel file as buffer
 */
const generateTasksExcel = async (tasks) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Tasks');
    
    // Define columns
    worksheet.columns = [
      { header: 'Task Name', key: 'title', width: 30 },
      { header: 'Description', key: 'description', width: 50 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Assignee', key: 'assignee', width: 20 },
      { header: 'Due Date', key: 'dueDate', width: 20 }
    ];
    
    // Add style to header row
    worksheet.getRow(1).font = { bold: true };
    
    // Add tasks to worksheet with safe handling
    tasks.forEach(task => {
      try {
        // Handle assignee name safely
        let assigneeName = 'Unassigned';
        if (task.owner) {
          if (typeof task.owner === 'object' && task.owner.name) {
            assigneeName = task.owner.name;
          } else if (typeof task.owner === 'string') {
            assigneeName = 'User ID: ' + task.owner;
          }
          // Check for MongoDB ObjectIDs
          if (task.owner && typeof task.owner === 'object') {
            if (task.owner.name) {
              assigneeName = task.owner.name;
            } else if (task.owner._id) {
              assigneeName = 'User ID: ' + task.owner._id;
            } else if (task.owner.toString) {
              assigneeName = 'User ID: ' + task.owner.toString();
            }
          }
        }
        
        // Format the date
        let formattedDate = 'No due date';
        if (task.dueDate) {
          formattedDate = new Date(task.dueDate).toLocaleString();
        }
        
        // Add the row with safe data
        worksheet.addRow({
          title: task.title || '',
          description: task.description || '',
          status: task.status || '',
          assignee: assigneeName,
          dueDate: formattedDate
        });
      } catch (err) {
        console.error('Error processing task for Excel:', err);
        // Add error row
        worksheet.addRow({
          title: task.title || 'Error',
          description: 'Error processing task data',
          status: 'Error',
          assignee: 'Error',
          dueDate: 'Error'
        });
      }
    });
    
    // Return the Excel buffer
    return await workbook.xlsx.writeBuffer();
  } catch (error) {
    console.error('Excel generation error:', error);
    throw error;
  }
};

module.exports = { generateTasksExcel };