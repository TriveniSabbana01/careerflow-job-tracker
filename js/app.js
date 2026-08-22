/**
 * ============================================================================
 * app.js — Main Application Coordinator for CareerFlow
 * ============================================================================
 * Coordinates the application lifecycle, connects state with DOM events,
 * manages search & filtering, table sorting, modal dialogs, and delegates
 * UI rendering to dom.js.
 */

import {
  initState,
  getState,
  subscribe,
  toggleTheme,
  addJob,
  updateJob,
  deleteJob,
  updateJobStatus,
  getJobById,
  setFilter,
  setSort,
  setActiveView,
  setSelectedJobId
} from './state.js';
import { validateJobForm, clearFormErrors } from './validation.js';
import { renderApp, renderDrawer, closeDrawer } from './dom.js';
import { initDragAndDrop } from './dragDrop.js';

// DOM Elements
const elements = {
  themeToggleBtn: document.getElementById('theme-toggle-btn'),
  openAddModalBtn: document.getElementById('open-add-modal-btn'),
  jobModal: document.getElementById('job-modal'),
  jobForm: document.getElementById('job-form'),
  closeModalBtn: document.getElementById('close-modal-btn'),
  cancelModalBtn: document.getElementById('cancel-modal-btn'),
  modalTitle: document.getElementById('modal-title'),
  toastContainer: document.getElementById('toast-container'),

  // Search & Filter Controls
  searchInput: document.getElementById('search-input'),
  filterStatus: document.getElementById('filter-status'),
  filterType: document.getElementById('filter-type'),
  filterLocation: document.getElementById('filter-location'),

  // View Switchers & Actions
  viewKanbanBtn: document.getElementById('view-kanban-btn'),
  viewTableBtn: document.getElementById('view-table-btn'),
  exportDataBtn: document.getElementById('export-data-btn'),

  // Drawer Elements
  detailDrawer: document.getElementById('detail-drawer'),
  closeDrawerBtn: document.getElementById('close-drawer-btn'),
  drawerOverlay: document.getElementById('drawer-overlay'),
  drawerEditBtn: document.getElementById('drawer-edit-btn'),
  drawerDeleteBtn: document.getElementById('drawer-delete-btn')
};

// Currently viewed job in drawer
let currentDrawerJob = null;

/**
 * Displays a non-intrusive toast notification to the user.
 * @param {string} message - Notification text
 * @param {string} type - 'success' | 'error' | 'info'
 */
export function showToast(message, type = 'success') {
  if (!elements.toastContainer) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  elements.toastContainer.appendChild(toast);

  // Automatically remove toast after 3.5 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 200ms ease';
    setTimeout(() => toast.remove(), 200);
  }, 3500);
}

/**
 * Updates the document HTML theme attribute whenever theme changes.
 */
function handleThemeChange(state) {
  document.documentElement.setAttribute('data-theme', state.theme);
}

/**
 * Opens the Job Application Modal for adding a new job or editing an existing one.
 * @param {string} [defaultStatus='applied'] - Pre-selected status column
 * @param {Object} [editJob=null] - If provided, populates form for editing
 */
export function openJobModal(defaultStatus = 'applied', editJob = null) {
  if (!elements.jobModal || !elements.jobForm) return;

  // Reset form and clear old validation errors
  elements.jobForm.reset();
  clearFormErrors(elements.jobForm);

  if (editJob) {
    // Populate form with existing job details for editing
    elements.modalTitle.textContent = 'Edit Job Application';
    document.getElementById('job-id').value = editJob.id;
    document.getElementById('company').value = editJob.company || '';
    document.getElementById('position').value = editJob.position || '';
    document.getElementById('status').value = editJob.status || 'applied';
    document.getElementById('appliedDate').value = editJob.appliedDate || '';
    document.getElementById('jobType').value = editJob.jobType || 'Full-time';
    document.getElementById('workLocation').value = editJob.workLocation || 'Remote';
    document.getElementById('location').value = editJob.location || '';
    document.getElementById('jobUrl').value = editJob.jobUrl || '';
    document.getElementById('salaryMin').value = editJob.salaryMin || '';
    document.getElementById('salaryMax').value = editJob.salaryMax || '';
    document.getElementById('contactName').value = editJob.contactName || '';
    document.getElementById('contactEmail').value = editJob.contactEmail || '';
    document.getElementById('notes').value = editJob.notes || '';
  } else {
    // Defaults for new job
    elements.modalTitle.textContent = 'Add Job Application';
    document.getElementById('job-id').value = '';
    document.getElementById('status').value = defaultStatus;
    document.getElementById('appliedDate').value = new Date().toISOString().split('T')[0];
  }

  // Open native <dialog>
  elements.jobModal.showModal();
}

/**
 * Closes the Job Application Modal.
 */
export function closeJobModal() {
  if (!elements.jobModal) return;
  elements.jobModal.close();
  clearFormErrors(elements.jobForm);
}

/**
 * Handles Form Submission with Zod Validation.
 */
function handleFormSubmit(event) {
  event.preventDefault();

  // 1. Run Zod Validation
  const validationResult = validateJobForm(elements.jobForm);

  // 2. If validation fails, stop here (errors are rendered by validation.js)
  if (!validationResult.isValid) {
    showToast('Please correct the errors in the form.', 'error');
    return;
  }

  const validData = validationResult.data;
  const jobId = document.getElementById('job-id').value;

  // 3. Save or Update Application in State
  if (jobId) {
    const updated = updateJob(jobId, validData);
    if (updated && currentDrawerJob && currentDrawerJob.id === jobId) {
      currentDrawerJob = updated;
      renderDrawer(updated);
    }
    showToast(`Updated application for ${validData.company}!`, 'success');
  } else {
    addJob(validData);
    showToast(`Added ${validData.position} at ${validData.company}!`, 'success');
  }

  // 4. Close modal on success
  closeJobModal();
}

/**
 * Handles opening the job detail drawer when a card or table row is clicked.
 * @param {Object} job - The job application object
 */
function handleJobClick(job) {
  currentDrawerJob = job;
  setSelectedJobId(job.id);
  renderDrawer(job);
}

/**
 * Handles exporting all tracked applications to a JSON file.
 */
function handleExportData() {
  const { jobs } = getState();
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(jobs, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `careerflow_backup_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('Exported applications backup JSON!', 'info');
}

/**
 * Initializes the application when DOM is ready.
 */
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 CareerFlow Job Application Tracker Initializing...');

  // Setup UI action handlers object passed to dom.js
  const uiHandlers = {
    onJobClick: handleJobClick
  };

  // Subscribe UI Renderers to State Changes
  subscribe(handleThemeChange);
  subscribe((state) => renderApp(state, uiHandlers));

  // 1. Bind Theme Toggle Button
  if (elements.themeToggleBtn) {
    elements.themeToggleBtn.addEventListener('click', toggleTheme);
  }

  // 2. Bind Main "+ Add Application" Button
  if (elements.openAddModalBtn) {
    elements.openAddModalBtn.addEventListener('click', () => openJobModal('applied'));
  }

  // 3. Bind Column Header "+" Quick Add Buttons
  document.querySelectorAll('.column-add-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const columnStatus = btn.dataset.status || 'applied';
      openJobModal(columnStatus);
    });
  });

  // 4. Bind Modal Close/Cancel Buttons
  if (elements.closeModalBtn) {
    elements.closeModalBtn.addEventListener('click', closeJobModal);
  }
  if (elements.cancelModalBtn) {
    elements.cancelModalBtn.addEventListener('click', closeJobModal);
  }

  // Close dialog when clicking on the backdrop
  if (elements.jobModal) {
    elements.jobModal.addEventListener('click', (event) => {
      if (event.target === elements.jobModal) {
        closeJobModal();
      }
    });
  }

  // 5. Bind Form Submit to Zod Validation
  if (elements.jobForm) {
    elements.jobForm.addEventListener('submit', handleFormSubmit);
  }

  // 6. Bind Search Input Event (Real-time live filtering)
  if (elements.searchInput) {
    elements.searchInput.addEventListener('input', (event) => {
      setFilter('search', event.target.value);
    });
  }

  // 7. Bind Dropdown Filter Events
  if (elements.filterStatus) {
    elements.filterStatus.addEventListener('change', (event) => {
      setFilter('status', event.target.value);
    });
  }

  if (elements.filterType) {
    elements.filterType.addEventListener('change', (event) => {
      setFilter('type', event.target.value);
    });
  }

  if (elements.filterLocation) {
    elements.filterLocation.addEventListener('change', (event) => {
      setFilter('location', event.target.value);
    });
  }

  // 8. Bind Table Header Click Events for Column Sorting
  document.querySelectorAll('th.sortable').forEach((th) => {
    th.addEventListener('click', () => {
      const sortColumn = th.dataset.sort;
      if (sortColumn) {
        setSort(sortColumn);
      }
    });
  });

  // 9. Bind View Toggle Buttons (Kanban / Table)
  if (elements.viewKanbanBtn) {
    elements.viewKanbanBtn.addEventListener('click', () => setActiveView('kanban'));
  }
  if (elements.viewTableBtn) {
    elements.viewTableBtn.addEventListener('click', () => setActiveView('table'));
  }

  // 10. Bind Export Data Button
  if (elements.exportDataBtn) {
    elements.exportDataBtn.addEventListener('click', handleExportData);
  }

  // 11. Bind Drawer Close & Action Buttons
  if (elements.closeDrawerBtn) {
    elements.closeDrawerBtn.addEventListener('click', () => {
      currentDrawerJob = null;
      closeDrawer();
    });
  }
  if (elements.drawerOverlay) {
    elements.drawerOverlay.addEventListener('click', () => {
      currentDrawerJob = null;
      closeDrawer();
    });
  }

  if (elements.drawerEditBtn) {
    elements.drawerEditBtn.addEventListener('click', () => {
      if (currentDrawerJob) {
        openJobModal(currentDrawerJob.status, currentDrawerJob);
      }
    });
  }

  if (elements.drawerDeleteBtn) {
    elements.drawerDeleteBtn.addEventListener('click', () => {
      if (currentDrawerJob && confirm(`Are you sure you want to delete "${currentDrawerJob.position}" at ${currentDrawerJob.company}?`)) {
        const deletedId = currentDrawerJob.id;
        const companyName = currentDrawerJob.company;
        deleteJob(deletedId);
        currentDrawerJob = null;
        closeDrawer();
        showToast(`Deleted application for ${companyName}.`, 'info');
      }
    });
  }

  // 12. Initialize Native HTML5 Drag and Drop
  initDragAndDrop((jobId, newStatus) => {
    const job = getJobById(jobId);
    if (job && job.status !== newStatus) {
      updateJobStatus(jobId, newStatus);
      const statusCapitalized = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
      showToast(`Moved ${job.position} to ${statusCapitalized}!`, 'info');
    }
  });

  // 13. Initialize application state from localStorage
  initState();

  console.log('✅ CareerFlow Search, Filters & Sorting Connected:', getState());
});
