/**
 * ============================================================================
 * storage.js — LocalStorage Handler for CareerFlow
 * ============================================================================
 * Handles saving and retrieving job application records and user preferences
 * from the browser's localStorage. Ensures data persists across refreshes.
 */

// Storage keys
const STORAGE_KEYS = {
  JOBS: 'careerflow_jobs',
  THEME: 'careerflow_theme'
};

/**
 * Initial sample job records to populate the app on first run.
 * Provides realistic portfolio demonstration data.
 */
const SAMPLE_JOBS = [
  {
    id: 'job_sample_1',
    company: 'Stripe',
    position: 'Frontend Engineer',
    status: 'interviewing',
    appliedDate: '2026-08-15',
    jobType: 'Full-time',
    workLocation: 'Remote',
    location: 'San Francisco, CA',
    salaryMin: 130000,
    salaryMax: 160000,
    jobUrl: 'https://stripe.com/jobs',
    contactName: 'Sarah Miller',
    contactEmail: 'sarah.recruiter@stripe.com',
    notes: 'Passed technical screen. System architecture interview scheduled.',
    createdAt: new Date('2026-08-15T10:00:00Z').toISOString(),
    updatedAt: new Date('2026-08-18T14:30:00Z').toISOString()
  },
  {
    id: 'job_sample_2',
    company: 'Spotify',
    position: 'UI/UX Developer',
    status: 'applied',
    appliedDate: '2026-08-18',
    jobType: 'Full-time',
    workLocation: 'Hybrid',
    location: 'New York, NY',
    salaryMin: 120000,
    salaryMax: 145000,
    jobUrl: 'https://spotify.com/careers',
    contactName: 'Alex Chen',
    contactEmail: 'alex.chen@spotify.com',
    notes: 'Applied through employee referral. Waiting on recruiter outreach.',
    createdAt: new Date('2026-08-18T09:00:00Z').toISOString(),
    updatedAt: new Date('2026-08-18T09:00:00Z').toISOString()
  },
  {
    id: 'job_sample_3',
    company: 'Linear',
    position: 'Product Engineer',
    status: 'offer',
    appliedDate: '2026-08-01',
    jobType: 'Full-time',
    workLocation: 'Remote',
    location: 'Remote',
    salaryMin: 150000,
    salaryMax: 175000,
    jobUrl: 'https://linear.app/careers',
    contactName: 'David Lee',
    contactEmail: 'david@linear.app',
    notes: 'Received official offer letter! Reviewing benefits and equity package.',
    createdAt: new Date('2026-08-01T11:00:00Z').toISOString(),
    updatedAt: new Date('2026-08-20T16:00:00Z').toISOString()
  },
  {
    id: 'job_sample_4',
    company: 'Figma',
    position: 'Design Systems Engineer',
    status: 'wishlist',
    appliedDate: '2026-08-21',
    jobType: 'Full-time',
    workLocation: 'Remote',
    location: 'San Francisco, CA',
    salaryMin: 140000,
    salaryMax: 165000,
    jobUrl: 'https://figma.com/careers',
    contactName: '',
    contactEmail: '',
    notes: 'Drafting cover letter and polishing portfolio case studies.',
    createdAt: new Date('2026-08-21T08:00:00Z').toISOString(),
    updatedAt: new Date('2026-08-21T08:00:00Z').toISOString()
  }
];

/**
 * Loads all saved job applications from localStorage.
 * If no data exists, initializes localStorage with default sample jobs.
 * @returns {Array<Object>} List of job applications
 */
export function loadJobs() {
  try {
    const rawData = localStorage.getItem(STORAGE_KEYS.JOBS);
    if (!rawData) {
      // First-time visit: Save and return sample jobs
      saveJobs(SAMPLE_JOBS);
      return SAMPLE_JOBS;
    }
    const parsed = JSON.parse(rawData);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Error loading jobs from localStorage:', error);
    return SAMPLE_JOBS;
  }
}

/**
 * Saves the given array of job applications into localStorage.
 * @param {Array<Object>} jobs - Array of job objects
 * @returns {boolean} True if saved successfully, false otherwise
 */
export function saveJobs(jobs) {
  try {
    localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(jobs));
    return true;
  } catch (error) {
    console.error('Error saving jobs to localStorage:', error);
    return false;
  }
}

/**
 * Loads the user's preferred theme ('light' or 'dark').
 * Defaults to 'light' if not previously set.
 * @returns {string} 'light' or 'dark'
 */
export function loadTheme() {
  try {
    return localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
  } catch (error) {
    return 'light';
  }
}

/**
 * Saves the user's preferred theme in localStorage.
 * @param {string} theme - 'light' or 'dark'
 */
export function saveTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  } catch (error) {
    console.error('Error saving theme to localStorage:', error);
  }
}
