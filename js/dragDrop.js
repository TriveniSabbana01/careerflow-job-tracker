/**
 * ============================================================================
 * dragDrop.js — Native HTML5 Drag and Drop for CareerFlow
 * ============================================================================
 * Handles draggable card states, column dropzones, drag-over indicators,
 * and triggers status updates when cards are moved across columns.
 */

// Holds reference to the currently dragged job ID
let draggedJobId = null;

/**
 * Attaches drag event listeners to a job card element.
 * @param {HTMLElement} cardElement - The .job-card DOM element
 * @param {string} jobId - The unique ID of the job
 */
export function attachCardDragListeners(cardElement, jobId) {
  cardElement.setAttribute('draggable', 'true');

  // 1. Drag Start: Store job ID and apply visual feedback
  cardElement.addEventListener('dragstart', (event) => {
    draggedJobId = jobId;
    event.dataTransfer.setData('text/plain', jobId);
    event.dataTransfer.effectAllowed = 'move';

    // Delay adding class slightly so the drag preview ghost captures the original look
    setTimeout(() => {
      cardElement.classList.add('is-dragging');
    }, 0);
  });

  // 2. Drag End: Clean up visual feedback
  cardElement.addEventListener('dragend', () => {
    draggedJobId = null;
    cardElement.classList.remove('is-dragging');

    // Remove any lingering drag-over highlights from columns
    document.querySelectorAll('.column-dropzone').forEach((col) => {
      col.classList.remove('drag-over');
    });
  });
}

/**
 * Initializes dropzone listeners on all Kanban columns.
 * @param {Function} onStatusChange - Callback function (jobId, newStatus) => void
 */
export function initDragAndDrop(onStatusChange) {
  const dropzones = document.querySelectorAll('.column-dropzone');

  dropzones.forEach((dropzone) => {
    // A. Drag Over: Must prevent default to allow dropping
    dropzone.addEventListener('dragover', (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      dropzone.classList.add('drag-over');
    });

    // B. Drag Enter: Prevent default
    dropzone.addEventListener('dragenter', (event) => {
      event.preventDefault();
      dropzone.classList.add('drag-over');
    });

    // C. Drag Leave: Remove visual highlight when leaving column
    dropzone.addEventListener('dragleave', (event) => {
      // Only remove if we actually left the dropzone (and not entered a child element)
      if (!dropzone.contains(event.relatedTarget)) {
        dropzone.classList.remove('drag-over');
      }
    });

    // D. Drop: Capture dropped job ID and trigger status change
    dropzone.addEventListener('drop', (event) => {
      event.preventDefault();
      dropzone.classList.remove('drag-over');

      // Retrieve the job ID from dataTransfer or fallback to in-memory variable
      const jobId = event.dataTransfer.getData('text/plain') || draggedJobId;
      const targetStatus = dropzone.dataset.status;

      if (jobId && targetStatus) {
        if (typeof onStatusChange === 'function') {
          onStatusChange(jobId, targetStatus);
        }
      }
    });
  });
}
