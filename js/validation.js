/**
 * ============================================================================
 * validation.js — Zod Schema & Form Validation for CareerFlow
 * ============================================================================
 * Defines schema rules using Zod and provides helper utilities to validate
 * job application forms and render inline error messages in the DOM.
 */

// Import Zod as an ES module via modern CDN
import { z } from 'https://cdn.jsdelivr.net/npm/zod@3.23.8/+esm';

/**
 * Zod Schema for a Job Application.
 * Enforces data types, string length boundaries, valid formats, and custom business rules.
 */
export const JobApplicationSchema = z.object({
  id: z.string().optional(),

  // 1. Company Name (Required, 2-100 characters)
  company: z
    .string({ required_error: 'Company name is required' })
    .trim()
    .min(2, { message: 'Company name must be at least 2 characters' })
    .max(100, { message: 'Company name cannot exceed 100 characters' }),

  // 2. Position / Role (Required, 2-100 characters)
  position: z
    .string({ required_error: 'Job title is required' })
    .trim()
    .min(2, { message: 'Job title must be at least 2 characters' })
    .max(100, { message: 'Job title cannot exceed 100 characters' }),

  // 3. Application Status (Must match one of the 5 pipeline stages)
  status: z.enum(['wishlist', 'applied', 'interviewing', 'offer', 'rejected'], {
    errorMap: () => ({ message: 'Please select a valid application status' })
  }),

  // 4. Applied Date (Must be a valid YYYY-MM-DD date format)
  appliedDate: z
    .string({ required_error: 'Application date is required' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Please enter a valid date (YYYY-MM-DD)' }),

  // 5. Job Type & Workplace Location
  jobType: z.enum(['Full-time', 'Part-time', 'Contract', 'Internship']).default('Full-time'),
  workLocation: z.enum(['Remote', 'Hybrid', 'On-site']).default('Remote'),

  // 6. City / Region Location (Optional)
  location: z.string().trim().max(100, { message: 'Location cannot exceed 100 characters' }).optional().or(z.literal('')),

  // 7. Salary Range (Optional positive numbers with preprocessing)
  salaryMin: z
    .preprocess((val) => {
      if (val === '' || val === null || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? val : num;
    },
    z.number({ invalid_type_error: 'Minimum salary must be a valid number' })
     .nonnegative({ message: 'Salary must be a positive number' })
     .optional()
    ),

  salaryMax: z
    .preprocess((val) => {
      if (val === '' || val === null || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? val : num;
    },
    z.number({ invalid_type_error: 'Maximum salary must be a valid number' })
     .nonnegative({ message: 'Salary must be a positive number' })
     .optional()
    ),

  // 8. Job Posting URL (Optional, but must be a valid URL if entered)
  jobUrl: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || /^https?:\/\/.+/i.test(val), {
      message: 'Please enter a valid web URL starting with http:// or https://'
    }),

  // 9. Contact / Recruiter Information (Optional)
  contactName: z.string().trim().max(100, { message: 'Contact name is too long' }).optional().or(z.literal('')),
  contactEmail: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: 'Please enter a valid email address (e.g. recruiter@company.com)'
    }),

  // 10. Notes / Preparation
  notes: z.string().trim().max(2000, { message: 'Notes cannot exceed 2000 characters' }).optional().or(z.literal(''))
}).refine((data) => {
  // Custom business rule: Ensure max salary >= min salary if both are provided
  if (data.salaryMin !== undefined && data.salaryMax !== undefined) {
    return data.salaryMax >= data.salaryMin;
  }
  return true;
}, {
  message: 'Maximum salary must be greater than or equal to minimum salary',
  path: ['salaryMax'] // Attach error to the salaryMax field
});

/**
 * Extracts raw data from an HTML form element into a plain JavaScript object.
 * @param {HTMLFormElement} form - The form element to extract data from
 * @returns {Object} Plain object containing form key-value pairs
 */
export function extractFormData(form) {
  const formData = new FormData(form);
  const data = {};

  for (const [key, value] of formData.entries()) {
    data[key] = value;
  }

  return data;
}

/**
 * Clears all inline error messages and error highlight classes from a form.
 * @param {HTMLFormElement} form - The form to clear errors from
 */
export function clearFormErrors(form) {
  // Clear all error message spans
  const errorElements = form.querySelectorAll('.field-error');
  errorElements.forEach((el) => {
    el.textContent = '';
  });

  // Remove .has-error class from form group wrappers
  const formGroups = form.querySelectorAll('.form-group.has-error');
  formGroups.forEach((group) => {
    group.classList.remove('has-error');
  });
}

/**
 * Displays Zod validation error messages under the corresponding form inputs.
 * @param {HTMLFormElement} form - The target form element
 * @param {z.ZodError} zodError - The error object returned from Zod safeParse
 */
export function displayFormErrors(form, zodError) {
  clearFormErrors(form);

  zodError.issues.forEach((issue) => {
    // Get the field name that has the issue
    const fieldName = issue.path[0];
    const errorMessage = issue.message;

    // Find the corresponding error placeholder span
    const errorSpan = form.querySelector(`#error-${fieldName}`);
    if (errorSpan) {
      errorSpan.textContent = errorMessage;
    }

    // Find the parent form-group to add the error highlight styling
    const inputElement = form.querySelector(`[name="${fieldName}"]`);
    if (inputElement) {
      const formGroup = inputElement.closest('.form-group');
      if (formGroup) {
        formGroup.classList.add('has-error');
      }
    }
  });
}

/**
 * Validates form data against the Zod schema.
 * If invalid, displays errors on the UI automatically.
 * @param {HTMLFormElement} form - The form element to validate
 * @returns {{ isValid: boolean, data?: Object, errors?: Object }}
 */
export function validateJobForm(form) {
  const rawData = extractFormData(form);

  // Perform schema validation using safeParse
  const parseResult = JobApplicationSchema.safeParse(rawData);

  if (!parseResult.success) {
    // Show inline errors next to form fields
    displayFormErrors(form, parseResult.error);
    return {
      isValid: false,
      errors: parseResult.error
    };
  }

  // Clear any existing errors when valid
  clearFormErrors(form);

  return {
    isValid: true,
    data: parseResult.data
  };
}
