/**
 * ============================================================================
 * state.js — Central State Management for CareerFlow
 * ============================================================================
 * Manages in-memory data for job applications, active filters, selected view,
 * and theme. Notifies subscribed UI components whenever data changes.
 */

import { loadJobs, saveJobs, loadTheme, saveTheme } from './storage.js';

/**
 * The single source of truth for the entire application.
 */
const state = {
  jobs: [],
  filters: {
    search: '',
    status: 'all',
    type: 'all',
    location: 'all'
  },
  sort: {
    column: 'date',
    direction: 'desc' // 'asc' | 'desc'
  },
  activeView: 'kanban', // 'kanban' | 'table'
  theme: 'light',       // 'light' | 'dark'
  selectedJobId: null   // For detail drawer or editing
};

/**
 * Array of listener functions to be called whenever state changes.
 */
const listeners = [];

/**
 * Subscribe a function to state updates.
 * @param {Function} listenerFn - Callback to execute on state changes
 */
export function subscribe(listenerFn) {
  if (typeof listenerFn === 'function') {
    listeners.push(listenerFn);
  }
}

/**
 * Notifies all subscribed listeners with the latest state snapshot.
 */
function notify() {
  const stateSnapshot = getState();
  listeners.forEach((listener) => {
    try {
      listener(stateSnapshot);
    } catch (err) {
      console.error('Error in state listener:', err);
    }
  });
}

/**
 * Initializes state by reading data from storage.
 */
export function initState() {
  state.jobs = loadJobs();
  state.theme = loadTheme();
  notify();
}

/**
 * Returns an immutable copy/snapshot of current state.
 */
export function getState() {
  return {
    jobs: [...state.jobs],
    filters: { ...state.filters },
    sort: { ...state.sort },
    activeView: state.activeView,
    theme: state.theme,
    selectedJobId: state.selectedJobId,
    statistics: getStatistics()
  };
}

/**
 * Returns all jobs filtered by active search term and dropdown filters,
 * sorted by the active sort column and direction.
 */
export function getFilteredJobs() {
  const { search, status, type, location } = state.filters;
  const { column, direction } = state.sort;
  const searchLower = search.trim().toLowerCase();

  // 1. Filter jobs
  const filtered = state.jobs.filter((job) => {
    // Search text matching (Company, Position, Location, or Notes)
    const matchesSearch = !searchLower || (
      job.company.toLowerCase().includes(searchLower) ||
      job.position.toLowerCase().includes(searchLower) ||
      (job.location && job.location.toLowerCase().includes(searchLower)) ||
      (job.notes && job.notes.toLowerCase().includes(searchLower))
    );

    // Status filter
    const matchesStatus = status === 'all' || job.status.toLowerCase() === status.toLowerCase();

    // Job Type filter
    const matchesType = type === 'all' || job.jobType === type;

    // Workplace Mode filter
    const matchesLocation = location === 'all' || job.workLocation === location;

    return matchesSearch && matchesStatus && matchesType && matchesLocation;
  });

  // 2. Sort filtered jobs
  const multiplier = direction === 'desc' ? -1 : 1;

  return filtered.sort((a, b) => {
    switch (column) {
      case 'company':
        return a.company.localeCompare(b.company) * multiplier;
      case 'position':
        return a.position.localeCompare(b.position) * multiplier;
      case 'status':
        return a.status.localeCompare(b.status) * multiplier;
      case 'type':
        return (a.jobType || '').localeCompare(b.jobType || '') * multiplier;
      case 'location':
        return (a.location || a.workLocation || '').localeCompare(b.location || b.workLocation || '') * multiplier;
      case 'salary': {
        const salA = a.salaryMax || a.salaryMin || 0;
        const salB = b.salaryMax || b.salaryMin || 0;
        return (salA - salB) * multiplier;
      }
      case 'date':
      default: {
        const dateA = new Date(a.appliedDate || 0).getTime();
        const dateB = new Date(b.appliedDate || 0).getTime();
        return (dateA - dateB) * multiplier;
      }
    }
  });
}

/**
 * Retrieves a single job by its unique ID.
 * @param {string} id - The job's unique identifier
 */
export function getJobById(id) {
  return state.jobs.find((job) => job.id === id) || null;
}

/**
 * Adds a new job application to state and persists to storage.
 * @param {Object} jobData - Raw job application data
 * @returns {Object} Newly created job object
 */
export function addJob(jobData) {
  const newJob = {
    id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    company: jobData.company.trim(),
    position: jobData.position.trim(),
    status: jobData.status || 'applied',
    appliedDate: jobData.appliedDate || new Date().toISOString().split('T')[0],
    jobType: jobData.jobType || 'Full-time',
    workLocation: jobData.workLocation || 'Remote',
    location: (jobData.location || '').trim(),
    salaryMin: jobData.salaryMin ? Number(jobData.salaryMin) : null,
    salaryMax: jobData.salaryMax ? Number(jobData.salaryMax) : null,
    jobUrl: (jobData.jobUrl || '').trim(),
    contactName: (jobData.contactName || '').trim(),
    contactEmail: (jobData.contactEmail || '').trim(),
    notes: (jobData.notes || '').trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Add new job to the beginning of the list
  state.jobs.unshift(newJob);

  // Persist to localStorage
  saveJobs(state.jobs);

  // Notify UI
  notify();
  return newJob;
}

/**
 * Updates an existing job application.
 * @param {string} id - The job ID to update
 * @param {Object} updatedFields - Fields to update
 * @returns {Object|null} Updated job object or null if not found
 */
export function updateJob(id, updatedFields) {
  const index = state.jobs.findIndex((job) => job.id === id);
  if (index === -1) return null;

  const existingJob = state.jobs[index];
  const updatedJob = {
    ...existingJob,
    ...updatedFields,
    // Clean numeric values if provided
    salaryMin: updatedFields.salaryMin !== undefined 
      ? (updatedFields.salaryMin ? Number(updatedFields.salaryMin) : null) 
      : existingJob.salaryMin,
    salaryMax: updatedFields.salaryMax !== undefined 
      ? (updatedFields.salaryMax ? Number(updatedFields.salaryMax) : null) 
      : existingJob.salaryMax,
    updatedAt: new Date().toISOString()
  };

  state.jobs[index] = updatedJob;
  saveJobs(state.jobs);
  notify();
  return updatedJob;
}

/**
 * Updates just the status of a job (used during Kanban drag & drop).
 * @param {string} id - Job ID
 * @param {string} newStatus - New status ('wishlist' | 'applied' | 'interviewing' | 'offer' | 'rejected')
 */
export function updateJobStatus(id, newStatus) {
  return updateJob(id, { status: newStatus });
}

/**
 * Deletes a job application by ID.
 * @param {string} id - Job ID to delete
 * @returns {boolean} True if deleted, false if not found
 */
export function deleteJob(id) {
  const initialLength = state.jobs.length;
  state.jobs = state.jobs.filter((job) => job.id !== id);

  if (state.jobs.length !== initialLength) {
    if (state.selectedJobId === id) {
      state.selectedJobId = null;
    }
    saveJobs(state.jobs);
    notify();
    return true;
  }
  return false;
}

/**
 * Updates the filter parameters.
 * @param {string} key - 'search' | 'status' | 'type' | 'location'
 * @param {string} value - New filter value
 */
export function setFilter(key, value) {
  if (state.filters.hasOwnProperty(key)) {
    state.filters[key] = value;
    notify();
  }
}

/**
 * Updates the table sort column and toggles direction.
 * @param {string} column - Sort column key ('company' | 'position' | 'status' | 'type' | 'location' | 'salary' | 'date')
 */
export function setSort(column) {
  if (state.sort.column === column) {
    // Toggle direction
    state.sort.direction = state.sort.direction === 'asc' ? 'desc' : 'asc';
  } else {
    state.sort.column = column;
    // Default to desc for salary and date, asc for alphabetical
    state.sort.direction = (column === 'salary' || column === 'date') ? 'desc' : 'asc';
  }
  notify();
}

/**
 * Sets the active view mode ('kanban' or 'table').
 * @param {string} view - 'kanban' | 'table'
 */
export function setActiveView(view) {
  if (view === 'kanban' || view === 'table') {
    state.activeView = view;
    notify();
  }
}

/**
 * Sets the currently selected job for detailed viewing/editing.
 * @param {string|null} id - Job ID or null to deselect
 */
export function setSelectedJobId(id) {
  state.selectedJobId = id;
  notify();
}

/**
 * Toggles theme between 'light' and 'dark'.
 * @returns {string} New theme value
 */
export function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  saveTheme(state.theme);
  notify();
  return state.theme;
}

/**
 * Computes dashboard statistics from current job records.
 */
export function getStatistics() {
  const total = state.jobs.length;
  const interviewing = state.jobs.filter((j) => j.status === 'interviewing').length;
  const offers = state.jobs.filter((j) => j.status === 'offer').length;

  // Applications that received any response (interviewing, offer, or rejected)
  const responded = state.jobs.filter(
    (j) => j.status === 'interviewing' || j.status === 'offer' || j.status === 'rejected'
  ).length;

  // Real response percentage (avoid division by 0)
  const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0;

  // Per-column counts for Kanban headers
  const countsByStatus = {
    wishlist: state.jobs.filter((j) => j.status === 'wishlist').length,
    applied: state.jobs.filter((j) => j.status === 'applied').length,
    interviewing: interviewing,
    offer: offers,
    rejected: state.jobs.filter((j) => j.status === 'rejected').length
  };

  return {
    total,
    interviewing,
    offers,
    responseRate,
    countsByStatus
  };
}
