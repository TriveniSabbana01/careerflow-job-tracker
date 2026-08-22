/**
 * ============================================================================
 * dom.js — Dynamic UI Rendering for CareerFlow
 * ============================================================================
 * Handles creating and updating DOM elements dynamically based on application
 * state. Renders statistics, Kanban cards, Table rows, and the Detail Drawer.
 */

import { getFilteredJobs, deleteJob } from './state.js';
import { attachCardDragListeners } from './dragDrop.js';

// Status color mapping for badges
const STATUS_LABELS = {
  wishlist: 'Wishlist',
  applied: 'Applied',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected'
};

/**
 * Formats salary numbers into a readable currency range.
 * @param {number|null} min - Minimum salary
 * @param {number|null} max - Maximum salary
 * @returns {string} Formatted salary string
 */
export function formatSalary(min, max) {
  if (!min && !max) return 'Salary not specified';

  const formatK = (num) => `$${(num / 1000).toLocaleString()}k`;

  if (min && max) {
    return min === max ? formatK(min) : `${formatK(min)} - ${formatK(max)}`;
  }
  return min ? `From ${formatK(min)}` : `Up to ${formatK(max)}`;
}

/**
 * Formats ISO date string (YYYY-MM-DD) into a human-friendly format.
 * @param {string} dateStr - Date string
 * @returns {string} e.g. "Aug 15, 2026"
 */
export function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (err) {
    return dateStr;
  }
}

/**
 * Renders the top dashboard statistics summary.
 * @param {Object} statistics - Stats object from state.getStatistics()
 */
export function renderStatistics(statistics) {
  const totalEl = document.getElementById('stat-count-total');
  const interviewingEl = document.getElementById('stat-count-interviewing');
  const offersEl = document.getElementById('stat-count-offers');
  const rateEl = document.getElementById('stat-count-rate');

  if (totalEl) totalEl.textContent = statistics.total;
  if (interviewingEl) interviewingEl.textContent = statistics.interviewing;
  if (offersEl) offersEl.textContent = statistics.offers;
  if (rateEl) rateEl.textContent = `${statistics.responseRate}%`;
}

/**
 * Renders the counter badges in each column header.
 * @param {Object} countsByStatus - Per-status count breakdown
 */
export function renderColumnCounts(countsByStatus) {
  for (const [status, count] of Object.entries(countsByStatus)) {
    const countEl = document.getElementById(`count-${status}`);
    if (countEl) {
      countEl.textContent = count;
    }
  }
}

/**
 * Creates a draggable job card DOM element for the Kanban board.
 * @param {Object} job - Job application data object
 * @param {Function} onCardClick - Callback when card is clicked
 * @returns {HTMLElement} The card element
 */
export function createJobCardElement(job, onCardClick) {
  const card = document.createElement('article');
  card.className = 'job-card';
  card.setAttribute('draggable', 'true');
  card.dataset.id = job.id;

  // Build Tags HTML
  const tags = [];
  if (job.workLocation) tags.push(`<span class="job-tag">${job.workLocation}</span>`);
  if (job.jobType) tags.push(`<span class="job-tag">${job.jobType}</span>`);
  if (job.location) tags.push(`<span class="job-tag">${escapeHtml(job.location)}</span>`);

  card.innerHTML = `
    <div class="job-card-header">
      <div>
        <h4 class="job-card-title">${escapeHtml(job.position)}</h4>
        <p class="job-card-company">${escapeHtml(job.company)}</p>
      </div>
    </div>
    <div class="job-card-tags">
      ${tags.join('')}
    </div>
    <div class="job-card-footer">
      <span class="job-card-salary">${formatSalary(job.salaryMin, job.salaryMax)}</span>
      <span class="job-card-date">${formatDate(job.appliedDate)}</span>
    </div>
  `;

  // Attach native HTML5 drag listeners
  attachCardDragListeners(card, job.id);

  // Attach click event to open detail drawer (only when not dragging)
  card.addEventListener('click', (e) => {
    // If card was being dragged, skip click opening
    if (card.classList.contains('is-dragging')) return;
    if (typeof onCardClick === 'function') {
      onCardClick(job);
    }
  });

  return card;
}

/**
 * Renders the Kanban Board by distributing filtered jobs into their respective columns.
 * @param {Array<Object>} jobs - List of filtered job objects
 * @param {Function} onCardClick - Callback when card is clicked
 */
export function renderKanbanBoard(jobs, onCardClick) {
  const statuses = ['wishlist', 'applied', 'interviewing', 'offer', 'rejected'];

  statuses.forEach((status) => {
    const dropzone = document.getElementById(`column-${status}`);
    if (!dropzone) return;

    // Clear existing dropzone cards
    dropzone.innerHTML = '';

    const columnJobs = jobs.filter((job) => job.status === status);

    if (columnJobs.length === 0) {
      // Render empty placeholder state
      const emptyEl = document.createElement('div');
      emptyEl.className = 'empty-column-placeholder';
      emptyEl.innerHTML = `<p>No ${STATUS_LABELS[status].toLowerCase()} jobs</p>`;
      dropzone.appendChild(emptyEl);
    } else {
      // Append each card element
      columnJobs.forEach((job) => {
        const cardEl = createJobCardElement(job, onCardClick);
        dropzone.appendChild(cardEl);
      });
    }
  });
}

/**
 * Creates a single table row for the Table List view.
 * @param {Object} job - Job application data object
 * @param {Function} onRowClick - Callback when row is clicked
 * @param {Function} onDeleteClick - Callback when delete button is clicked
 * @returns {HTMLTableRowElement}
 */
export function createTableRowElement(job, onRowClick, onDeleteClick) {
  const tr = document.createElement('tr');
  tr.dataset.id = job.id;

  tr.innerHTML = `
    <td>
      <div class="table-company-cell">
        <span class="table-position">${escapeHtml(job.position)}</span>
        <span class="table-company">${escapeHtml(job.company)}</span>
      </div>
    </td>
    <td>
      <span class="badge badge-${job.status}">${STATUS_LABELS[job.status] || job.status}</span>
    </td>
    <td>${job.jobType || 'Full-time'}</td>
    <td>${escapeHtml(job.location || job.workLocation || 'Remote')}</td>
    <td>${formatSalary(job.salaryMin, job.salaryMax)}</td>
    <td>${formatDate(job.appliedDate)}</td>
    <td class="text-right">
      <button class="btn btn-secondary btn-table-view" type="button" title="View details">View</button>
    </td>
  `;

  // Row click handlers
  tr.querySelector('.btn-table-view').addEventListener('click', (e) => {
    e.stopPropagation();
    if (onRowClick) onRowClick(job);
  });

  tr.addEventListener('click', () => {
    if (onRowClick) onRowClick(job);
  });

  return tr;
}

/**
 * Renders the Table List view with sort indicators.
 * @param {Array<Object>} jobs - List of filtered job objects
 * @param {Function} onRowClick - Callback when row is clicked
 * @param {Object} [sortState] - Current sort column and direction
 */
export function renderTableView(jobs, onRowClick, sortState) {
  const tableBody = document.getElementById('table-body');
  if (!tableBody) return;

  // Update sort indicators on table headers
  if (sortState) {
    document.querySelectorAll('th.sortable').forEach((th) => {
      const field = th.dataset.sort;
      if (!th.dataset.label) {
        th.dataset.label = th.textContent.trim();
      }

      if (field === sortState.column) {
        const arrow = sortState.direction === 'asc' ? '▲' : '▼';
        th.textContent = `${th.dataset.label} ${arrow}`;
        th.setAttribute('aria-sort', sortState.direction === 'asc' ? 'ascending' : 'descending');
      } else {
        th.textContent = th.dataset.label;
        th.removeAttribute('aria-sort');
      }
    });
  }

  tableBody.innerHTML = '';

  if (jobs.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.className = 'empty-table-row';
    emptyRow.innerHTML = `<td colspan="7" class="text-center">No applications found matching your search and filter criteria.</td>`;
    tableBody.appendChild(emptyRow);
    return;
  }

  jobs.forEach((job) => {
    const rowEl = createTableRowElement(job, onRowClick);
    tableBody.appendChild(rowEl);
  });
}

/**
 * Populates and opens the Job Detail Drawer with the selected job's data.
 * @param {Object} job - Job application data object
 */
export function renderDrawer(job) {
  const drawer = document.getElementById('detail-drawer');
  if (!drawer || !job) return;

  // Set fields
  const badge = document.getElementById('drawer-badge-status');
  badge.className = `badge badge-${job.status}`;
  badge.textContent = STATUS_LABELS[job.status] || job.status;

  document.getElementById('drawer-position').textContent = job.position;
  document.getElementById('drawer-company').textContent = `${job.company} • ${job.location || job.workLocation}`;
  document.getElementById('drawer-date').textContent = formatDate(job.appliedDate);
  document.getElementById('drawer-salary').textContent = formatSalary(job.salaryMin, job.salaryMax);
  document.getElementById('drawer-type').textContent = job.jobType || 'Full-time';
  document.getElementById('drawer-location-type').textContent = job.workLocation || 'Remote';

  // Job Link
  const linkContainer = document.getElementById('drawer-link-container');
  const jobLink = document.getElementById('drawer-job-link');
  if (job.jobUrl) {
    linkContainer.style.display = 'block';
    jobLink.href = job.jobUrl;
  } else {
    linkContainer.style.display = 'none';
  }

  // Recruiter Contact
  const contactName = document.getElementById('drawer-contact-name');
  const contactEmail = document.getElementById('drawer-contact-email');
  contactName.textContent = job.contactName || 'Not specified';
  contactEmail.textContent = job.contactEmail ? job.contactEmail : '';
  if (job.contactEmail) {
    contactEmail.innerHTML = `<a href="mailto:${escapeHtml(job.contactEmail)}">${escapeHtml(job.contactEmail)}</a>`;
  }

  // Notes
  const notesBox = document.getElementById('drawer-notes');
  notesBox.textContent = job.notes || 'No notes added yet for this application.';

  // Open Drawer
  drawer.classList.add('is-open');
  drawer.setAttribute('aria-hidden', 'false');
}

/**
 * Closes the Job Detail Drawer.
 */
export function closeDrawer() {
  const drawer = document.getElementById('detail-drawer');
  if (drawer) {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
  }
}

/**
 * Escapes HTML characters to prevent XSS.
 * @param {string} str - Raw string
 * @returns {string} Sanitized string
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Master UI Render Function.
 * Called automatically on every state change.
 * @param {Object} state - The full application state
 * @param {Object} handlers - UI action callback handlers
 */
export function renderApp(state, handlers = {}) {
  const filteredJobs = getFilteredJobs();

  // 1. Render Dashboard Statistics
  renderStatistics(state.statistics);

  // 2. Render Column Count Badges
  renderColumnCounts(state.statistics.countsByStatus);

  // 3. Render Kanban Board
  renderKanbanBoard(filteredJobs, handlers.onJobClick);

  // 4. Render Table View
  renderTableView(filteredJobs, handlers.onJobClick, state.sort);

  // 5. Manage Active View Display
  const kanbanSection = document.getElementById('kanban-view');
  const tableSection = document.getElementById('table-view');
  const kanbanBtn = document.getElementById('view-kanban-btn');
  const tableBtn = document.getElementById('view-table-btn');

  if (state.activeView === 'kanban') {
    if (kanbanSection) kanbanSection.classList.remove('is-hidden');
    if (tableSection) tableSection.classList.add('is-hidden');
    if (kanbanBtn) { kanbanBtn.classList.add('active'); kanbanBtn.setAttribute('aria-pressed', 'true'); }
    if (tableBtn) { tableBtn.classList.remove('active'); tableBtn.setAttribute('aria-pressed', 'false'); }
  } else {
    if (kanbanSection) kanbanSection.classList.add('is-hidden');
    if (tableSection) tableSection.classList.remove('is-hidden');
    if (kanbanBtn) { kanbanBtn.classList.remove('active'); kanbanBtn.setAttribute('aria-pressed', 'false'); }
    if (tableBtn) { tableBtn.classList.add('active'); tableBtn.setAttribute('aria-pressed', 'true'); }
  }
}
