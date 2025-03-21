export const STATUS_LABELS = {
  'pending': 'Available',
  'in-progress': 'In Progress',
  'completed': 'Completed',
  'cancelled': 'Cancelled',
  'behind-schedule': 'Behind Schedule'
};

export const STATUS_COLORS = {
  'pending': 'info', // Blue
  'in-progress': 'warning', // Orange/amber
  'completed': 'success', // Green
  'cancelled': 'error', // Red
  'behind-schedule': 'secondary' // Purple
};

export const STATUS_HEX_COLORS = {
  'pending': '#3498db',     // Blue
  'in-progress': '#f39c12', // Orange/amber
  'completed': '#2ecc71',   // Green
  'cancelled': '#e74c3c',   // Red
  'behind-schedule': '#9b59b6' // Purple
};